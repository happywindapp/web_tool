// Explorer actions on disk for handle-based folders (Chrome/Edge): pin, new file / folder, rename, delete (to the recycle bin, Shift ⇒ for good) — each pushes its undo step and refreshes the parent folder. OneDrive folders: new file / folder + open on the web.
const ExplorerDisk = (() => {
  const askName = (msg, value = "") => { const n = ShareState.cleanName(prompt(msg, value) ?? ""); return n && n !== "." && n !== ".." ? n : ""; };
  const reload = dir => { dir.children = null; dir.open = true; DirSize.forget(dir); Explorer.render(); GitStatus.soon(); };
  const fail = (e, cloud) => StatusBar.msg(T(cloud ? "Thao tác trên OneDrive lỗi: {msg}" : "Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad");

  async function openDocsOf(handle) {
    const out = [];
    for (const d of Docs.list()) if (d.handle && await d.handle.isSameEntry(handle).catch(() => false)) out.push(d);
    return out;
  }

  // The tree folder of a directory handle (folders already read) is read again.
  async function reloadHandle(h) {
    const find = async n => {
      if (!n?.dir || !n.handle) return null;
      if (await n.handle.isSameEntry(h).catch(() => false)) return n;
      for (const c of n.children || []) { const r = await find(c); if (r) return r; }
      return null;
    };
    const n = await find(Explorer.root());
    if (n) reload(n); else GitStatus.soon();
  }
  // Tree parents reload directly; parents rebuilt from handles (undo steps) are looked up.
  const refreshParent = p => (p.list ? reload(p) : reloadHandle(p.handle));

  async function newEntry(dir, folder) {
    const name = askName(folder ? T("Tên folder mới:") : T("Tên file mới:"));
    if (!name) return;
    try {
      if (dir.remote) {
        StatusBar.msg(T("Đang tạo trên OneDrive…"));
        const node = await CloudDrive.create(dir, name, folder);
        reload(dir);
        if (folder) StatusBar.msg(T("Đã tạo folder “{name}” trên OneDrive.", { name }), "good");
        else await FileOpen.openMany([await node.read()], Views.focused);
        return;
      }
      const h = await LocalFs.create(dir, name, folder);
      reload(dir);
      ExplorerUndo.created(T(folder ? "Tạo folder “{name}”" : "Tạo file “{name}”", { name }), [{ handle: h, parent: dir.handle, path: dir.path }]);
      if (!folder) await FileOpen.openMany([{ file: await h.getFile(), handle: h }], Views.focused);
    } catch (e) { fail(e, dir.remote); }
  }

  // → true when renamed; open tabs and pins follow the file.
  async function renameTo(node, name) {
    try {
      const docs = node.dir ? [] : await openDocsOf(node.handle), pin = await Pinned.find(node.handle), from = Tags.pathOf(node);
      await LocalFs.rename(node, name);
      Tags.moved(from, node.parent.path + "/" + name);
      if (pin) Pinned.renamed(pin, node.handle);
      // move() renamed node.handle only: the tab's own handle still points at the old name.
      docs.forEach(d => { d.handle = node.handle; Docs.rename(d, name); DiskSync.mark(d); });
      refreshParent(node.parent);
      StatusBar.msg(T("Đã đổi tên thành “{name}”.", { name }), "good");
      return true;
    } catch (e) { fail(e); return false; }
  }
  async function rename(node) {
    const name = askName(T("Tên mới trên đĩa:"), node.name), old = node.name, h = node.handle, parent = node.parent;
    if (!name || name === old || !await renameTo(node, name)) return;
    ExplorerUndo.push(T("Đổi tên “{old}” thành “{name}”", { old, name }), async () => { if (!await renameTo(ExplorerUndo.like(h, parent.handle, parent.path), old)) throw ExplorerUndo.shown(); });
  }

  // target: node or nodes (any folders). Default: copied into the recycle bin first (it does not fit / fails ⇒ ask to delete for good); permanent ⇒ ask, then delete. → true when deleted.
  let busy = false;
  async function remove(target, opts = {}) {
    if (busy) { StatusBar.msg(T("Đang xoá — chờ lần trước xong."), "warn"); return false; }
    busy = true;
    try { return await removeNow(target, opts); } finally { busy = false; }
  }
  async function removeNow(target, { permanent = false, undoable = true, keep = [] }) {
    const nodes = [].concat(target).filter(n => n?.handle && n.parent);
    if (!nodes.length) return false;
    const what = nodes.length === 1 ? "“" + nodes[0].name + "”" : T("{n} mục", { n: nodes.length });
    let kept = null;
    try {
      await LocalFs.writable(nodes[0].parent.handle);
      if (permanent) {
        if (!confirm(T("Xoá vĩnh viễn {what} khỏi đĩa? Không khôi phục được.", { what }))) return false;
      } else {
        StatusBar.msg(T("Đang chép {what} vào thùng rác…", { what }));
        try { kept = await TrashStore.put(nodes, keep); }
        catch (e) { if (!confirm(T("Không giữ được {what} trong thùng rác ({why}). Xoá vĩnh viễn?", { what, why: e.message }))) { StatusBar.msg(T("Chưa xoá gì."), "warn"); return false; } }
      }
    } catch (e) { fail(e); return false; }
    // Item by item: one that cannot go (locked file…) keeps its place and leaves the bin again.
    const ids = [], failed = [], docs = [], gone = [];
    for (const [k, n] of nodes.entries()) {
      try {
        const open = n.dir ? [] : await openDocsOf(n.handle);
        await LocalFs.remove(n);
        docs.push(...open);
        gone.push(n);
        if (kept) ids.push(kept.ids[k]);
      } catch (e) { failed.push("“" + n.name + "”: " + e.message); if (kept) await TrashStore.purge([kept.ids[k]]).catch(() => {}); }
    }
    // An open tab of a deleted file keeps its text, loses the handle and becomes unsaved.
    docs.forEach(d => Docs.update(d, { handle: null, dirty: true, stale: false }, "dirty"));
    // A folder inside another one read again comes back with it (reading it too would strand the old node).
    const parents = [...new Set(nodes.map(n => n.parent))];
    parents.filter(p => !parents.some(q => q !== p && q.path && p.path?.startsWith(q.path + "/"))).forEach(refreshParent);
    const tags = Tags.removed(gone);
    const step = ids.length && undoable ? ExplorerUndo.push(T("Xoá {what}", { what }), async () => { await TrashStore.restoreIds(ids); Tags.restore(tags); }) : null;
    if (failed.length) { StatusBar.msg(T("Không xoá được: {list}", { list: failed.join(" · ") }) + (step ? " " + T("Hoàn tác (Ctrl+Z)") : ""), "bad", step ? () => ExplorerUndo.undo(step) : null); return false; }
    if (!undoable) return true;
    const tabs = docs.length ? " " + T("Tab đang mở vẫn giữ nội dung — dùng “Lưu thành…” nếu cần.") : "";
    const dropped = kept?.dropped ? " " + T("Thùng rác đầy — đã bỏ {n} mục cũ nhất.", { n: kept.dropped }) : "";
    StatusBar.msg(T(kept ? "Đã chuyển {what} vào thùng rác." : "Đã xoá vĩnh viễn {what}.", { what }) + (step ? " " + T("Hoàn tác (Ctrl+Z)") : "") + tabs + dropped, "good",
      step ? () => ExplorerUndo.undo(step) : null, step ? T("Bấm để hoàn tác") : "");
    return true;
  }

  // Row buttons; none for read-only trees (dropped folder entries, <input webkitdirectory>, Google Drive).
  function buttons(node) {
    const b = (text, title, fn) => {
      const x = document.createElement("button");
      Object.assign(x, { className: "ex-act", textContent: text, title });
      x.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(); };
      return x;
    };
    // New file / folder live in the right-click menu only.
    let out;
    if (node.remote === "onedrive") out = node.webUrl ? [b("↗", T("Mở trên OneDrive web — đổi tên / xoá ở đó (link ẩn danh không cho), rồi 🔄 làm mới"), () => window.open(node.webUrl, "_blank", "noopener"))] : [];
    else if (node.handle) out = [b("📌", T("Ghim / bỏ ghim vào mục Đã ghim"), () => Pinned.toggleHandle(node.handle))];
    else return [];
    if (!out.length) return [];
    const span = document.createElement("span");
    span.className = "ex-acts";
    span.append(...out);
    return [span];
  }

  return { buttons, newEntry, rename, renameTo, remove, openDocsOf, reload, reloadHandle };
})();
