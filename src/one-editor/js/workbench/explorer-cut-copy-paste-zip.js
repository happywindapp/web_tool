// Explorer file operations: cut / copy / paste / duplicate (handle folders); ZIP / tar live in ExplorerArchive.
const ExplorerOps = (() => {
  let clip = null;
  const fail = e => StatusBar.msg(T("Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad");
  const splitExt = n => { const k = n.lastIndexOf("."); return k > 0 ? [n.slice(0, k), n.slice(k)] : [n, ""]; };
  const writableNode = n => !!n?.handle;

  // Lower-cased names of a folder: one listing serves a whole paste.
  async function namesOf(dirHandle) {
    const s = new Set();
    for await (const k of dirHandle.keys()) s.add(k.toLowerCase());
    return s;
  }
  // Windows naming on a clash: "a - Copy.txt", "a - Copy (2).txt"; taken: names from namesOf, else the folder is read.
  async function freeName(dirHandle, name, dir, taken = null) {
    const has = async n => (taken ? taken.has(n.toLowerCase()) : !!await LocalFs.exists(dirHandle, n));
    if (!await has(name)) return name;
    const [base, ext] = dir ? [name, ""] : splitExt(name);
    for (let k = 1; ; k++) {
      const n = base + " - Copy" + (k > 1 ? " (" + k + ")" : "") + ext;
      if (!await has(n)) return n;
    }
  }

  async function copyHandle(src, destDir, name) {
    if (src.kind === "file") {
      const h = await destDir.getFileHandle(name, { create: true });
      await (await src.getFile()).stream().pipeTo(await h.createWritable());
      return h;
    }
    const d = await destDir.getDirectoryHandle(name, { create: true });
    for await (const c of src.values()) await copyHandle(c, d, c.name);
    return d;
  }

  // Open tabs of the node (or inside it) with their path below it, so they follow a move.
  async function tabsUnder(node) {
    const out = [];
    for (const d of Docs.list()) {
      if (!d.handle) continue;
      const rel = node.dir ? await node.handle.resolve(d.handle).catch(() => null) : await node.handle.isSameEntry(d.handle).catch(() => false) ? [] : null;
      if (rel) out.push({ d, rel });
    }
    return out;
  }
  async function walkTo(h, rel) {
    for (let k = 0; k < rel.length; k++) h = k === rel.length - 1 ? await h.getFileHandle(rel[k]) : await h.getDirectoryHandle(rel[k]);
    return h;
  }

  // move() where the browser can; otherwise copy, then delete the source. → the handle at the new place.
  async function move(node, dest, taken = null) {
    if (taken ? taken.has(node.name.toLowerCase()) : await LocalFs.exists(dest.handle, node.name)) throw new Error(T("“{name}” đã có trong folder đích.", { name: node.name }));
    await LocalFs.writable(node.parent.handle);
    const tabs = await tabsUnder(node), pin = await Pinned.find(node.handle);
    let moved = node.handle;
    try {
      if (typeof node.handle.move !== "function") throw new Error("no move");
      await node.handle.move(dest.handle);
    } catch {
      moved = await copyHandle(node.handle, dest.handle, node.name);
      await node.parent.handle.removeEntry(node.name, { recursive: node.dir });
    }
    for (const { d, rel } of tabs) { d.handle = await walkTo(moved, rel); DiskSync.mark(d); }
    if (pin) Pinned.renamed(pin, moved);
    Tags.moved(Tags.pathOf(node), dest.path + "/" + node.name);
    return moved;
  }

  const many = (nodes, one) => (nodes.length === 1 ? "“" + nodes[0].name + "”" : T(one, { n: nodes.length }));
  function setClip(target, cut) {
    const nodes = [].concat(target).filter(n => writableNode(n) && n.parent);
    if (!nodes.length) return;
    clip = { nodes, cut };
    StatusBar.msg(T(cut ? "Đã cắt {what} — chọn folder rồi Dán (Ctrl+V)." : "Đã chép {what} — chọn folder rồi Dán (Ctrl+V).", { what: many(nodes, "{n} mục") }));
  }

  async function paste(target) {
    const dest = target?.dir ? target : target?.parent;
    if (!clip || !writableNode(dest)) return;
    const { nodes, cut } = clip;
    // The clip stays when the folder could not be opened for writing.
    if (await copyTo(nodes, dest, { cut }) && cut) clip = null;
  }

  // Copy (or move: cut) nodes into the folder node dest, each item on its own: a clash (cut) or a folder into itself is skipped and reported; one undo step for the lot. → the items done, null when dest cannot be written.
  async function copyTo(nodes, dest, { cut = false } = {}) {
    const done = [], undo = [], skipped = [], froms = new Set();
    if (!writableNode(dest)) return null;
    let taken;
    try { await LocalFs.writable(dest.handle); taken = await namesOf(dest.handle); } catch (e) { fail(e); return null; }
    for (const node of nodes) {
      if (node.dir && (dest.path === node.path || dest.path.startsWith(node.path + "/"))) { skipped.push(T("“{name}”: không dán folder vào chính nó", { name: node.name })); continue; }
      if (cut && dest.path === node.parent.path) continue;
      try {
        if (cut) {
          const from = node.parent, moved = await move(node, dest, taken);
          taken.add(node.name.toLowerCase());
          undo.push(() => move(ExplorerUndo.like(moved, dest.handle, dest.path), from).then(() => ExplorerDisk.reloadHandle(from.handle)));
          froms.add(from);
        } else {
          const name = await freeName(dest.handle, node.name, node.dir, taken);
          taken.add(name.toLowerCase());
          undo.push({ handle: await copyHandle(node.handle, dest.handle, name), parent: dest.handle, path: dest.path });
        }
        done.push(node);
      } catch (e) { skipped.push("“" + node.name + "”: " + e.message); }
    }
    froms.forEach(f => ExplorerDisk.reload(f));
    ExplorerDisk.reload(dest);
    if (done.length) {
      const label = T(cut ? "Chuyển {what} vào “{dest}”" : "Dán {what} vào “{dest}”", { what: many(done, "{n} mục"), dest: dest.name });
      // Every item is tried; the failures are reported together.
      if (cut) ExplorerUndo.push(label, async () => {
        const bad = [];
        for (const u of undo.reverse()) await u().catch(e => bad.push(e.message));
        ExplorerDisk.reload(dest);
        if (bad.length) throw new Error(bad.join(" · "));
      });
      else ExplorerUndo.created(label, undo);
    }
    const msg = done.length ? T(cut ? "Đã chuyển {what} vào “{dest}”." : "Đã dán {what} vào “{dest}”.", { what: many(done, "{n} mục"), dest: dest.name }) : "";
    StatusBar.msg([msg, skipped.length ? T("Bỏ qua: {list}", { list: skipped.join(" · ") }) : ""].filter(Boolean).join(" "), skipped.length ? "warn" : "good");
    return done;
  }

  async function duplicate(node) {
    if (!writableNode(node) || !node.parent) return;
    try {
      await LocalFs.writable(node.parent.handle);
      const name = await freeName(node.parent.handle, node.name, node.dir);
      const h = await copyHandle(node.handle, node.parent.handle, name);
      ExplorerDisk.reload(node.parent);
      ExplorerUndo.created(T("Nhân bản “{name}”", { name: node.name }), [{ handle: h, parent: node.parent.handle, path: node.parent.path }]);
      StatusBar.msg(T("Đã tạo bản sao “{name}”.", { name }), "good");
    } catch (e) { fail(e); }
  }

  return { setClip, paste, copyTo, duplicate, canPaste: () => !!clip, writableNode, freeName, copyHandle, splitExt };
})();
