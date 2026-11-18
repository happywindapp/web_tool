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

  function fromHandle(h, path = h.name) {
    if (h.kind !== "directory") return { name: h.name, path, dir: false, read: async () => ({ file: await h.getFile(), handle: h }) };
    return { name: h.name, path, dir: true, children: null, handle: h, list: async () => {
      const out = [];
      for await (const c of h.values()) { out.push(fromHandle(c, path + "/" + c.name)); if (out.length >= MAX_ENTRIES) break; }
      return sortNodes(out);
    } };
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

  // → { text, binary, notUtf8, bom, eol }; text uses "\n" (CodeMirror's model), eol/bom are restored on save.
  async function readText(file) {
    const buf = await file.arrayBuffer(), head = new Uint8Array(buf, 0, Math.min(8192, buf.byteLength));
    const bom = head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf;
    // Non-UTF-8 bytes would become U+FFFD and be lost on save, so such files open read-only.
    let text, notUtf8 = false;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch { text = new TextDecoder().decode(buf); notUtf8 = true; }
    const eol = /\r\n/.test(text.slice(0, 100000)) ? "\r\n" : "\n";
    if (eol === "\r\n") text = text.replace(/\r\n/g, "\n");
    return { text, binary: head.includes(0), notUtf8, bom, eol };
  }

  const encode = (text, { eol = "\n", bom = false } = {}) => (bom ? String.fromCharCode(0xfeff) : "") + (eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text);

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

  return { pickFiles, pickDirectory, fromHandle, fromEntry, readText, encode, writeHandle, saveAs, canPick, canDir, canSave };
})();
