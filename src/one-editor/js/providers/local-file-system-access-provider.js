// Local files: File System Access (Chrome/Edge: pick, overwrite, folder handles) with fallbacks to <input type=file> and download. Folder nodes load children lazily.
const LocalFs = (() => {
  const canPick = typeof showOpenFilePicker === "function", canDir = typeof showDirectoryPicker === "function", canSave = typeof showSaveFilePicker === "function";
  const MAX_ENTRIES = 5000;
  const aborted = e => e && e.name === "AbortError";
  const sortNodes = list => list.sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));

  function pickViaInput(dir) {
    return new Promise(ok => {
      const i = document.createElement("input");
      i.type = "file"; i.multiple = true;
      if (dir) i.setAttribute("webkitdirectory", "");
      i.onchange = () => ok([...i.files]);
      i.oncancel = () => ok([]);
      i.click();
    });
  }

  // → [{ file, handle|null }]
  async function pickFiles() {
    if (!canPick) return (await pickViaInput(false)).map(file => ({ file, handle: null }));
    try { return await Promise.all((await showOpenFilePicker({ multiple: true })).map(async h => ({ file: await h.getFile(), handle: h }))); }
    catch (e) { if (aborted(e)) return []; throw e; }
  }

  // startIn: a file handle ⇒ the picker opens in that file's folder (the browser never exposes the path itself).
  async function pickDirectory(startIn) {
    if (!canDir) { const files = await pickViaInput(true); return files.length ? fromFileList(files) : null; }
    try { return fromHandle(await showDirectoryPicker(startIn ? { startIn } : {})); }
    catch (e) { if (aborted(e)) return null; throw e; }
  }

  // Handle-based nodes (Chrome/Edge) can be changed on disk: they carry handle + parent.
  function fromHandle(h, path = h.name, parent = null) {
    if (h.kind !== "directory") return { name: h.name, path, dir: false, handle: h, parent, read: async () => ({ file: await h.getFile(), handle: h }) };
    const node = { name: h.name, path, dir: true, children: null, handle: h, parent, list: async () => {
      const out = [];
      for await (const c of h.values()) { out.push(fromHandle(c, path + "/" + c.name, node)); if (out.length >= MAX_ENTRIES) break; }
      return sortNodes(out);
    } };
    return node;
  }

  async function writable(dirHandle) {
    const opts = { mode: "readwrite" };
    if ((await dirHandle.queryPermission?.(opts)) === "granted" || (await dirHandle.requestPermission?.(opts)) === "granted") return;
    throw new Error(T("Trình duyệt không cho ghi vào folder."));
  }

  // A handle kept in IndexedDB loses its permission on reload; asking needs a click.
  async function readable(h) {
    const opts = { mode: "read" };
    let perm = h.queryPermission ? await h.queryPermission(opts) : "granted";
    if (perm !== "granted" && h.requestPermission) perm = await h.requestPermission(opts);
    return perm === "granted";
  }

  // → the name already there ("" if none), ignoring case: Windows folders treat "README.md" and "readme.md" as one file.
  async function exists(dir, name) {
    const want = name.toLowerCase();
    for await (const k of dir.keys()) if (k.toLowerCase() === want) return k;
    return "";
  }

  // dir node + name → new file (empty) or folder; refuses to overwrite.
  async function create(dirNode, name, folder) {
    await writable(dirNode.handle);
    if (await exists(dirNode.handle, name)) throw new Error(T("“{name}” đã có trong folder.", { name }));
    return folder ? dirNode.handle.getDirectoryHandle(name, { create: true }) : dirNode.handle.getFileHandle(name, { create: true });
  }

  async function remove(node) {
    await writable(node.parent.handle);
    await node.parent.handle.removeEntry(node.name, { recursive: node.dir });
  }

  // FileSystemHandle.move() is newer than the rest of the API ⇒ feature-checked.
  async function rename(node, name) {
    if (typeof node.handle.move !== "function") throw new Error(T("Trình duyệt này chưa hỗ trợ đổi tên trên đĩa."));
    await writable(node.parent.handle);
    const there = await exists(node.parent.handle, name);
    if (there && there !== node.name) throw new Error(T("“{name}” đã có trong folder.", { name }));
    await node.handle.move(name);
  }

  async function readAllEntries(reader) {
    const all = [];
    for (;;) {
      const batch = await new Promise((ok, no) => reader.readEntries(ok, no));
      if (!batch.length || all.length >= MAX_ENTRIES) return all;
      all.push(...batch);
    }
  }

  // Directory dropped where getAsFileSystemHandle is missing: read-only entries.
  function fromEntry(e, path = e.name) {
    if (!e.isDirectory) return { name: e.name, path, dir: false, read: () => new Promise((ok, no) => e.file(file => ok({ file, handle: null }), no)) };
    return { name: e.name, path, dir: true, children: null, list: async () => sortNodes((await readAllEntries(e.createReader())).map(c => fromEntry(c, path + "/" + c.name))) };
  }

  function fromFileList(files) {
    const dirNode = (name, path) => ({ name, path, dir: true, children: null, kids: new Map(), list: async function () { return sortNodes([...this.kids.values()]); } });
    const first = (files[0].webkitRelativePath || files[0].name).split("/")[0];
    const root = dirNode(first, first);
    for (const file of files.slice(0, MAX_ENTRIES)) {
      const parts = (file.webkitRelativePath || file.name).split("/").slice(1);
      let node = root;
      parts.forEach((p, k) => {
        const path = node.path + "/" + p;
        if (k === parts.length - 1) node.kids.set(p, { name: p, path, dir: false, read: async () => ({ file, handle: null }) });
        else node = node.kids.get(p) || (node.kids.set(p, dirNode(p, path)), node.kids.get(p));
      });
    }
    return root;
  }

  // → { text ("\n" lines, CodeMirror model), binary, enc, guessed, bom, eol, eolMixed, readOnly }; forced: reopen with that encoding.
  async function readText(file, forced) {
    const bytes = new Uint8Array(await file.arrayBuffer()), det = forced ? { enc: forced, guessed: false } : Encoding.detect(bytes);
    const { text, bom } = Encoding.decode(bytes, det.enc), e = Encoding.eolOf(text);
    return { text: text.replace(/\r\n?/g, "\n"), binary: !det.enc.startsWith("utf-16") && bytes.subarray(0, 8192).includes(0), enc: det.enc, guessed: det.guessed, bom, eol: e.eol, eolMixed: e.mixed, eolList: e.codes, readOnly: !Encoding.writable(det.enc) };
  }

  // → bytes in the tab encoding (default UTF-8); throws with .line/.col on a character the encoding cannot hold.
  const encode = (text, { eol = "\n", bom = false, enc = "utf-8" } = {}) => Encoding.encode(eol === "\n" ? text : text.replace(/\n/g, eol), enc || "utf-8", bom);

  async function writeHandle(handle, data) {
    const opts = { mode: "readwrite" };
    const ask = typeof handle.requestPermission === "function" ? () => handle.requestPermission(opts) : async () => "granted";
    if ((await handle.queryPermission?.(opts)) !== "granted" && (await ask()) !== "granted") throw new Error(T("Trình duyệt không cho ghi file."));
    const w = await handle.createWritable();
    await w.write(data);
    await w.close();
  }

  // → { handle, name, downloaded } or null when the user cancels the picker.
  async function saveAs(name, data) {
    if (!canSave) { Dom.download(data, name); return { handle: null, name, downloaded: true }; }
    try { const h = await showSaveFilePicker({ suggestedName: name }); await writeHandle(h, data); return { handle: h, name: h.name, downloaded: false }; }
    catch (e) { if (aborted(e)) return null; throw e; }
  }

  return { pickFiles, pickDirectory, fromHandle, fromEntry, fromFileList, readText, encode, writeHandle, saveAs, readable, writable, exists, create, remove, rename, canPick, canDir, canSave, MAX_ENTRIES };
})();
