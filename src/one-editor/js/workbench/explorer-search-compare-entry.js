// Explorer "Tìm & so sánh ▸" (tree folder, folder tab row / empty area, 🔎▾ on the folder tab, Alt+F7, Palette): advanced file search, duplicate files, folder compare + one-way sync — rows go to the 🔎 tab, the work lives in the lazy bundle (FileSearch, DupFinder, DirCompare, DirSync).
const FileTools = (() => {
  const E = (label, key, run) => TabMenu.entry(label, key, run);
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text });
  let ready = null, left = null;
  const load = () => ready ??= VendorPaths.load("extras").catch(e => { ready = null; throw new Error(T("Không nạp được bộ công cụ mở rộng ({file}) — cần file này nằm cạnh one-editor.html.", { file: e.message })); });
  const use = fn => load().then(fn).catch(e => StatusBar.msg(e.message, "bad"));
  const nameOf = p => String(p || "").split("/").pop();

  // A Drive / OneDrive link tree is not scanned: every file would be downloaded.
  function scannable(node) {
    if (!node?.dir) return false;
    if (Explorer.root()?.remote) { StatusBar.msg(T("Folder từ link Drive / OneDrive không quét được — tải về máy rồi mở folder."), "warn"); return false; }
    return true;
  }
  const search = node => { if (scannable(node)) use(() => FileSearch.ask(node)); };
  const dups = node => { if (scannable(node)) ResultsTab.open("dups", { path: node.path, skipEmpty: true, skip: true }); };
  function compare(a, b) {
    if (!scannable(a) || !b?.dir) return;
    if (a.path === b.path || a.path.startsWith(b.path + "/") || b.path.startsWith(a.path + "/")) { StatusBar.msg(T("Cần 2 folder khác nhau, không nằm trong nhau để so sánh."), "warn"); return; }
    ResultsTab.open("compare", { a: a.path, b: b.path, skip: true });
  }
  function pick(node) {
    left = node.path;
    StatusBar.msg(T("Đã chọn “{name}” để so sánh — chuột phải folder thứ 2 ▸ Tìm & so sánh ▸ So sánh với “{name}”.", { name: node.name }), "good");
  }
  async function compareLeft(node) {
    const a = await FolderPaths.resolve(left);
    if (a?.path === left) compare(a, node); else StatusBar.msg(T("Folder “{name}” đã chọn không còn trong Explorer.", { name: nameOf(left) }), "warn");
  }

  // The submenu of a folder; t: the folder tab whose own folder it is (compare with the other panel).
  function menu(node, t = null) {
    const o = t?.node === node ? DualPanel.other(t)?.node : null, list = [el("div", "menu-head", T("Tìm & so sánh")),
      E(T("Tìm file…"), "Alt+F7", () => search(node)), E(T("Tìm file trùng"), "", () => dups(node)), el("hr", "menu-sep")];
    if (o && o.path !== node.path) list.push(E(T("So sánh với panel kia"), "", () => compare(node, o)));
    if (left && left !== node.path) list.push(E(T("So sánh với “{name}”", { name: nameOf(left) }), "", () => compareLeft(node)));
    list.push(E(T("Chọn để so sánh"), "", () => pick(node)));
    return list;
  }
  function entries(node, t = null) {
    if (!node?.dir) return [];
    const b = E(T("Tìm & so sánh") + " ▸", "", () => TabMenu.show(menu(node, t), at.left, at.top));
    // The submenu opens where the entry was (it is gone once it runs).
    let at = { left: 0, top: 0 };
    b.addEventListener("click", () => { const r = b.getBoundingClientRect(); at = { left: r.left + 16, top: r.top }; }, true);
    return [b];
  }
  // Exactly two folders selected in a folder tab.
  const pairEntry = nodes => (nodes.length === 2 && nodes.every(n => n.dir) ? [E(T("So sánh 2 folder"), "", () => compare(nodes[0], nodes[1]))] : []);

  function button(t) {
    const b = FolderRows.btn("fi-nav fi-tools", "🔎▾", () => { const r = b.getBoundingClientRect(); if (t.node) TabMenu.show(menu(t.node, t), r.left, r.bottom + 2); });
    return b;
  }
  const label = t => { t.ui.tools.title = T("Tìm file (Alt+F7), file trùng, so sánh folder"); };
  // Window capture in a folder tab: Alt+F7 = find files, like Total Commander.
  function hotkey(t, e) {
    if (!(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key === "F7")) return false;
    search(t.node);
    return true;
  }

  // Palette: the folder of the focused view's folder tab, else View 1's, else the Explorer root.
  const shown = () => FolderItems.tabIn(Views.focused)?.node || FolderItems.tabIn(0)?.node || Explorer.root();
  function panels() {
    const t = FolderItems.tabIn(0), o = t && DualPanel.other(t);
    if (t?.node && o?.node) compare(t.node, o.node); else StatusBar.msg(T("Cần 2 panel đang hiện tab folder — bật Xem ▸ 2 panel kiểu Commander (⇆)."), "warn");
  }

  // ≠ text files: View 1 / View 2 + Compare, like Notepad++ Compare.
  function openPair(it) {
    if (it.st !== "diff" || !it.a || !it.b || it.a.dir || it.b.dir || FindCore.binaryName(it.a.name)) return false;
    (async () => {
      if (Views.count < 2) Actions.setLayout("2c");
      await Explorer.openNode(it.a, 0);
      await Explorer.openNode(it.b, 1);
      Compare.start(0);
    })();
    return true;
  }

  const CHIPS = [["left", "⬅", "Chỉ có ở trái"], ["right", "➡", "Chỉ có ở phải"], ["diff", "≠", "Khác nhau"], ["same", "=", "Giống nhau"]];
  ResultsTab.register("find", { title: c => T("Tìm “{q}” trong {dir}", { q: c?.name || c?.text || "*", dir: nameOf(c?.path) }), run: (c, sink) => load().then(() => FileSearch.run(c, sink)) });
  ResultsTab.register("dups", { title: c => T("File trùng trong {dir}", { dir: nameOf(c?.path) }), run: (c, sink) => load().then(() => DupFinder.run(c, sink)),
    action: { label: "Chọn bản trùng ▾", title: "Chọn các bản trùng (giữ 1 bản mỗi nhóm) rồi Delete để chuyển vào thùng rác", menu: ctl => load().then(() => DupFinder.menu(ctl)) } });
  ResultsTab.register("compare", { title: c => T("So sánh {a} ⇄ {b}", { a: nameOf(c?.a), b: nameOf(c?.b) }), chips: CHIPS, open: openPair, run: (c, sink) => load().then(() => DirCompare.run(c, sink)),
    action: { label: "⇄ Đồng bộ ▾", title: "Đồng bộ 1 chiều trái → phải hoặc phải → trái (xem trước; ghi đè / xoá qua thùng rác)", menu: ctl => load().then(() => DirSync.menu(ctl)) } });

  return { entries, pairEntry, button, label, hotkey, search: () => search(shown()), dups: () => dups(shown()), panels };
})();
