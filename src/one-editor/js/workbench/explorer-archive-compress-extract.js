// Explorer archives: download a file / folder (ZIP), compress to ZIP or tar.gz, extract ZIP · tar · tar.gz / tgz · gz (Tar from the lazy bundle) — paths made safe, links skipped, one undo step.
const ExplorerArchive = (() => {
  const fail = e => StatusBar.msg(T("Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad");
  const ARCHIVE = /\.(zip|tar|tgz|gz)$/i;
  const baseOf = n => n.replace(/\.(tar\.gz|tgz|tar|zip|gz)$/i, "") || n;
  const tar = () => VendorPaths.load("extras").then(() => Tar, e => { throw new Error(T("Không nạp được bộ công cụ mở rộng ({file}) — cần file này nằm cạnh one-editor.html.", { file: e.message })); });

  // Any readable tree (disk, dropped, Drive / OneDrive) → archive entries with paths below the node's parent.
  async function entries(node, prefix = "", out = []) {
    if (out.length > LocalFs.MAX_ENTRIES) throw new Error(T("Quá {n} mục — không nén được.", { n: LocalFs.MAX_ENTRIES }));
    if (!node.dir) {
      const { file } = await node.read();
      out.push({ name: prefix + node.name, data: new Uint8Array(await file.arrayBuffer()), date: new Date(file.lastModified || Date.now()) });
      return out;
    }
    out.push({ name: prefix + node.name + "/" });
    for (const c of await node.list()) await entries(c, prefix + node.name + "/", out);
    return out;
  }
  // Several items ⇒ one archive named after the first, like Windows "Send to → Compressed folder".
  const nameOf = (node, ext) => (node.dir ? node.name : ExplorerOps.splitExt(node.name)[0]) + ext;
  // Items from several folders (flat view) keep their path below the folder they share, so two "index.js" do not collide.
  async function entriesOf(nodes) {
    const out = [], dirs = nodes.map(n => (n.parent?.path ?? "").split("/"));
    let k = 0;
    while (dirs.every(d => k < d.length && d[k] === dirs[0][k])) k++;
    for (const [i, n] of nodes.entries()) { const rest = dirs[i].slice(k).join("/"); await entries(n, rest ? rest + "/" : "", out); }
    return out;
  }
  // Double extensions stay whole: "proj - Copy.tar.gz", not "proj.tar - Copy.gz".
  async function freeArchiveName(dir, base, ext) {
    for (let k = 1, name = base + ext; ; k++, name = base + " - Copy" + (k > 2 ? " (" + (k - 1) + ")" : "") + ext) if (!await LocalFs.exists(dir, name)) return name;
  }

  async function download(target) {
    const nodes = [].concat(target), node = nodes[0];
    try {
      if (nodes.length === 1 && !node.dir) { const { file } = await node.read(); Dom.download(file, node.name, file.type || "application/octet-stream"); return; }
      StatusBar.msg(T("Đang nén “{name}”…", { name: node.name }));
      Dom.download(await Zip.create(await entriesOf(nodes)), nameOf(node, ".zip"), "application/zip");
      StatusBar.msg(T("Đã tải “{name}”.", { name: nameOf(node, ".zip") }), "good");
    } catch (e) { fail(e); }
  }

  // fmt: "zip" | "tgz".
  async function compress(target, fmt = "zip") {
    const nodes = [].concat(target).filter(n => ExplorerOps.writableNode(n) && n.parent), node = nodes[0];
    if (!node) return;
    try {
      StatusBar.msg(T("Đang nén “{name}”…", { name: node.name }));
      await LocalFs.writable(node.parent.handle);
      const list = await entriesOf(nodes), t = fmt === "tgz" ? await tar() : null;
      const blob = t ? new Blob([await t.gzip(t.create(list))], { type: "application/gzip" }) : await Zip.create(list);
      const name = await freeArchiveName(node.parent.handle, nameOf(node, ""), t ? ".tar.gz" : ".zip");
      const h = await node.parent.handle.getFileHandle(name, { create: true });
      await blob.stream().pipeTo(await h.createWritable());
      ExplorerDisk.reload(node.parent);
      ExplorerUndo.created(T("Nén thành “{name}”", { name }), [{ handle: h, parent: node.parent.handle, path: node.parent.path }]);
      StatusBar.msg(T("Đã nén thành “{name}”.", { name }), "good");
    } catch (e) { fail(e); }
  }

  // ZIP by its magic bytes (no lazy bundle needed); anything else goes to Tar.open (tar / gzip magic, else refused).
  async function itemsOf(node) {
    const { file } = await node.read(), head = new Uint8Array(await file.slice(0, 2).arrayBuffer());
    if (head[0] === 0x50 && head[1] === 0x4b) return { kind: "zip", items: await Zip.read(file) };
    return (await tar()).open(new Uint8Array(await file.arrayBuffer()), node.name);
  }
  const write = async (dir, name, bytes) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(bytes); await w.close(); };

  // An archive into a new folder named after it; a plain .gz into its file next to it. "..", "." and characters Windows refuses are made safe (no writing outside), links / devices are skipped.
  async function extract(node) {
    if (!ExplorerOps.writableNode(node) || !node.parent) return;
    const parent = node.parent;
    try {
      StatusBar.msg(T("Đang giải nén “{name}”…", { name: node.name }));
      const { kind, items } = await itemsOf(node);
      await LocalFs.writable(parent.handle);
      if (kind === "gz") {
        const name = await ExplorerOps.freeName(parent.handle, ShareState.cleanName(items[0].name) || "file", false);
        await write(parent.handle, name, await items[0].bytes());
        ExplorerDisk.reload(parent);
        ExplorerUndo.created(T("Giải nén thành “{name}”", { name }), [{ handle: await parent.handle.getFileHandle(name), parent: parent.handle, path: parent.path }]);
        StatusBar.msg(T("Đã giải nén thành “{name}”.", { name }), "good");
        return;
      }
      const name = await ExplorerOps.freeName(parent.handle, baseOf(node.name), true), root = await parent.handle.getDirectoryHandle(name, { create: true });
      // Item by item: a name the disk refuses (or a file / folder clash) is listed, the rest is written; the folder is one undo step either way.
      let n = 0, skipped = 0;
      const failed = [];
      for (const it of items) {
        if (it.skip) { skipped++; continue; }
        const parts = it.name.split(/[\\/]/).map(p => ShareState.cleanName(p)).filter(p => p && p !== "." && p !== "..");
        if (!parts.length) continue;
        try {
          let dir = root;
          for (const p of it.dir ? parts : parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
          if (it.dir) continue;
          await write(dir, parts.at(-1), await it.bytes());
          n++;
        } catch (e) { failed.push("“" + parts.join("/") + "”: " + e.message); }
      }
      ExplorerDisk.reload(parent);
      ExplorerUndo.created(T("Giải nén vào “{name}”", { name }), [{ handle: root, parent: parent.handle, path: parent.path }]);
      StatusBar.msg([T("Đã giải nén {n} file vào “{name}”.", { n, name }), skipped ? T("Bỏ qua {n} liên kết / mục đặc biệt.", { n: skipped }) : "",
        failed.length ? T("Không ghi được: {list}", { list: failed.slice(0, 5).join(" · ") + (failed.length > 5 ? " …" : "") }) : ""].filter(Boolean).join(" "), failed.length ? "warn" : "good");
    } catch (e) { fail(e); }
  }

  // Right-click entries: "Compress to ▸ ZIP / tar.gz" and, on one archive file, "Extract".
  function menu(nodes, head) {
    const E = TabMenu.entry, node = nodes[0];
    const out = [E(T("Nén thành") + " ▸", "", () => {
      const r = head.getBoundingClientRect();
      TabMenu.show([Object.assign(document.createElement("div"), { className: "menu-head", textContent: T("Nén thành") }),
        E("ZIP (.zip)", "", () => compress(nodes, "zip")), E("tar.gz (.tar.gz)", "", () => compress(nodes, "tgz"))], r.left + 16, r.bottom);
    })];
    if (nodes.length === 1 && !node.dir && ARCHIVE.test(node.name)) out.push(E(T(/\.gz$/i.test(node.name) && !/\.tar\.gz$/i.test(node.name) ? "Giải nén" : "Giải nén vào folder"), "", () => extract(node)));
    return out;
  }

  return { download, compress, extract, menu };
})();
