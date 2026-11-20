// Explorer actions on disk for handle-based folders (Chrome/Edge): new file / folder, rename, delete — each asks first, then refreshes the parent folder.
const ExplorerDisk = (() => {
  const askName = (msg, value = "") => { const n = ShareState.cleanName(prompt(msg, value) ?? ""); return n && n !== "." && n !== ".." ? n : ""; };
  const reload = dir => { dir.children = null; dir.open = true; Explorer.render(); };
  const fail = e => StatusBar.msg(T("Thao tác trên đĩa lỗi: {msg}", { msg: e.message }), "bad");

  async function openDocsOf(handle) {
    const out = [];
    for (const d of Docs.list()) if (d.handle && await d.handle.isSameEntry(handle).catch(() => false)) out.push(d);
    return out;
  }

  async function newEntry(dir, folder) {
    const name = askName(folder ? T("Tên folder mới:") : T("Tên file mới:"));
    if (!name) return;
    try {
      const h = await LocalFs.create(dir, name, folder);
      reload(dir);
      if (!folder) await FileOpen.openMany([{ file: await h.getFile(), handle: h }], Views.focused);
    } catch (e) { fail(e); }
  }

  async function rename(node) {
    const name = askName(T("Tên mới trên đĩa:"), node.name);
    if (!name || name === node.name) return;
    try {
      const docs = node.dir ? [] : await openDocsOf(node.handle);
      await LocalFs.rename(node, name);
      docs.forEach(d => Docs.rename(d, name));
      reload(node.parent);
      StatusBar.msg(T("Đã đổi tên thành “{name}”.", { name }), "good");
    } catch (e) { fail(e); }
  }

  // An open tab of a deleted file keeps its text, loses the handle and becomes unsaved.
  async function remove(node) {
    const ask = node.dir ? T("Xoá folder “{name}” và mọi thứ bên trong khỏi đĩa? Không khôi phục được.", { name: node.name }) : T("Xoá file “{name}” khỏi đĩa? Không khôi phục được.", { name: node.name });
    if (!confirm(ask)) return;
    try {
      const docs = node.dir ? [] : await openDocsOf(node.handle);
      await LocalFs.remove(node);
      docs.forEach(d => Docs.update(d, { handle: null, dirty: true, stale: false }, "dirty"));
      reload(node.parent);
      StatusBar.msg(T("Đã xoá “{name}”.", { name: node.name }) + (docs.length ? " " + T("Tab đang mở vẫn giữ nội dung — dùng “Lưu thành…” nếu cần.") : ""), "good");
    } catch (e) { fail(e); }
  }

  // Row buttons; none for read-only trees (dropped folder entries, <input webkitdirectory>).
  function buttons(node) {
    if (!node.handle) return [];
    const b = (text, title, fn) => {
      const x = document.createElement("button");
      Object.assign(x, { className: "ex-act", textContent: text, title });
      x.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(); };
      return x;
    };
    const out = [];
    if (node.dir) out.push(b("+📄", T("File mới trong folder này"), () => newEntry(node, false)), b("+📁", T("Folder mới trong folder này"), () => newEntry(node, true)));
    if (node.parent) out.push(b("✎", T("Đổi tên trên đĩa"), () => rename(node)), b("🗑", T("Xoá khỏi đĩa"), () => remove(node)));
    if (!out.length) return [];
    const span = document.createElement("span");
    span.className = "ex-acts";
    span.append(...out);
    return [span];
  }

  return { buttons };
})();
