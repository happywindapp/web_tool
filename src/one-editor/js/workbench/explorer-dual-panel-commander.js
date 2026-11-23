// Commander mode (⇆, Xem ▸ 2 panel kiểu Commander, Palette): View 1 and View 2 side by side, each with a folder tab. In a folder tab: F5 copies / F6 moves the selection to the folder tab shown in the other view (confirm, one undo step), F7 new folder, F8 delete (Shift = for good), Tab jumps to the other panel, Ctrl+U swaps the two folders. Elsewhere F5 / F6 stay the browser's.
const DualPanel = (() => {
  let api = null, before = null, busy = false;
  const init = a => { api = a; };
  const phone = () => matchMedia("(max-width:640px)").matches;
  const many = nodes => (nodes.length === 1 ? "“" + nodes[0].name + "”" : T("{n} mục", { n: nodes.length }));
  // "The other panel": the folder tab active in the other view.
  function other(t) {
    const gi = Views.where(t.doc.id);
    return gi < 0 || Views.count < 2 ? null : api.tabIn(Views.other(gi));
  }
  const isOn = () => Views.count >= 2 && !!api?.tabIn(0) && !!api.tabIn(1);
  const noOther = () => StatusBar.msg(T("View kia không hiện tab folder — bật Xem ▸ 2 panel kiểu Commander (⇆) hoặc mở 1 tab folder ở view kia."), "warn");

  // a, b: the folders of View 1 / View 2 (a tab already showing a folder there is reused).
  function open(a, b) {
    if (Views.layout !== "2c") Actions.setLayout("2c");
    const left = api.show(a, null, 0), right = api.show(b || a, null, 1);
    focusList(left);
    StatusBar.msg(T("2 panel: F5 chép · F6 chuyển sang panel kia · F7 folder mới · F8 xoá · Tab đổi panel · Ctrl+U đổi chỗ 2 folder."), "good");
    return [left, right];
  }
  function toggle() {
    if (isOn()) { Actions.setLayout(before && before !== "2c" ? before : "1"); before = null; return; }
    if (phone()) { StatusBar.msg(T("Màn hình hẹp không có chế độ 2 panel — dùng menu chuột phải ▸ Chép / Chuyển sang panel kia."), "warn"); return; }
    const root = Explorer.root();
    if (!root) { StatusBar.msg(T("Mở 1 folder trong Explorer trước."), "warn"); return; }
    before = Views.layout;
    const a = api.tabIn(0)?.node || FolderItems.current() || root;
    open(a, api.tabIn(1)?.node || a);
  }

  function focusList(t) {
    if (!t) return;
    const r = t.ui.list.querySelector(".fi-row.on") || t.ui.list.querySelector(".fi-row");
    (r || t.ui.view).focus();
  }

  async function send(t, cut) {
    const o = other(t), nodes = api.selected(t);
    if (!o?.node) { noOther(); return; }
    if (!nodes.length) return;
    if (!nodes.every(n => ExplorerOps.writableNode(n) && n.parent) || !ExplorerOps.writableNode(o.node)) { StatusBar.msg(T("Chép / chuyển chỉ làm được giữa các folder mở có quyền ghi (Chrome / Edge)."), "warn"); return; }
    if (o.node.path === t.node.path) { StatusBar.msg(T("2 panel đang mở cùng 1 folder."), "warn"); return; }
    if (busy || !confirm(T(cut ? "Chuyển {what} sang “{dest}”?" : "Chép {what} sang “{dest}”?", { what: many(nodes), dest: o.node.path }))) return;
    busy = true;
    try { await ExplorerOps.copyTo(nodes, o.node, { cut }); } finally { busy = false; }
  }
  function remove(t, permanent) {
    const nodes = api.selected(t);
    if (nodes.length && nodes.every(n => ExplorerOps.writableNode(n) && n.parent)) ExplorerDisk.remove(nodes, { permanent });
    else if (nodes.length) StatusBar.msg(T("Folder này chỉ đọc — không xoá được."), "warn");
  }
  function swap(t) {
    const o = other(t);
    if (!o?.node) { noOther(); return; }
    const a = t.node, b = o.node;
    api.navigate(o, a);
    api.navigate(t, b);
  }

  // Window capture while a folder tab has focus (not in an input).
  function hotkey(t, e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "u") { swap(t); return true; }
    if (ctrl || e.altKey) return false;
    if (e.repeat && /^F[5-8]$/.test(e.key)) return true;
    const plain = !e.shiftKey;
    if (e.key === "F5" && plain) send(t, false);
    else if (e.key === "F6" && plain) send(t, true);
    else if (e.key === "F7" && plain) { if (ExplorerMenu.newEntries(t.node).length) ExplorerDisk.newEntry(t.node, true); else StatusBar.msg(T("Folder này chỉ đọc — không tạo được folder."), "warn"); }
    else if (e.key === "F8") remove(t, e.shiftKey);
    else if (e.key === "Tab" && plain && e.target.closest?.(".fi-list > .fi-row") && other(t)) focusList(other(t));
    else return false;
    return true;
  }

  // Right-click entries (also the way on phones, which have no F keys).
  const entries = t => (other(t)?.node ? [TabMenu.entry(T("Chép sang panel kia"), "F5", () => send(t, false)), TabMenu.entry(T("Chuyển sang panel kia"), "F6", () => send(t, true))] : []);
  function mark(t) {
    const b = t.ui.dual, x = isOn();
    b.title = T("2 panel kiểu Commander: F5 chép · F6 chuyển sang panel kia");
    b.classList.toggle("on", x);
    b.setAttribute("aria-pressed", x);
  }

  return { init, isOn, open, toggle, hotkey, entries, mark, other };
})();
