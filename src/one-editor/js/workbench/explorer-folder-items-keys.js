// Folder tab input: arrows / pages / Enter / Backspace / Alt+← → ↑ / type-to-select, the window-capture shortcuts (Ctrl+F, Ctrl+A, F3, Ctrl+L, Alt+P…), the right-click menu and the touch selection bar.
const FolderKeys = (() => {
  // api from FolderItems: { find(root) → tab, selected(t), back(t, dir, steps), goUp(t), open(t, node), navigate(t, node, selName), openAll(t, nodes), paint(t), goPath(t, path), tabIn(gi), show(node, selName, gi), reload(t) }.
  let api = null;
  const init = a => { api = a; };

  // Files of nodes become tabs in the other view (the list stays in sight); > 20 asks first. → false when there is no file.
  async function openFiles(nodes, docId) {
    const files = nodes.filter(n => !n.dir);
    if (!files.length) return false;
    if (files.length > 20 && !confirm(T("Mở {n} file thành tab?", { n: files.length }))) return true;
    const gi = Math.max(0, Views.where(docId));
    try { await FileOpen.openMany(await Promise.all(files.map(n => n.read())), Views.count > 1 ? Views.other(gi) : gi); }
    catch (e) { StatusBar.msg(T("Không mở được: {msg}", { msg: e.message }), "bad"); }
    return true;
  }

  // Touch selection bar of a list tab: the group actions of the right-click menu; openAll() opens the nodes.
  function barActions(nodes, openAll) {
    const disk = nodes.length && nodes.every(n => ExplorerOps.writableNode(n) && n.parent);
    return [...(disk ? [["✂", T("Cắt"), () => ExplorerOps.setClip(nodes, true)], ["⧉", T("Sao chép"), () => ExplorerOps.setClip(nodes, false)], ["🗑", T("Xoá"), () => ExplorerDisk.remove(nodes)]] : []),
      ["⋯", T("Thêm thao tác"), e => { const r = e.currentTarget.getBoundingClientRect(); TabMenu.show(ExplorerMenu.groupItems(nodes, e.currentTarget, openAll), r.left, r.bottom + 2); }]];
  }

  // Bar state and tooltips (they follow the UI language).
  function labels(t) {
    const { ui, node } = t;
    ui.back.disabled = !t.past.length; ui.fwd.disabled = !t.next.length; ui.up.disabled = !node.path.includes("/");
    ui.back.title = T("Quay lại (Alt+←) — chuột phải: danh sách"); ui.fwd.title = T("Tiến tới (Alt+→) — chuột phải: danh sách"); ui.up.title = T("Lên folder cha (Backspace / Alt+↑)");
    ui.addr.title = T("Đường dẫn folder — gõ đường dẫn rồi Enter để tới");
    ui.path.title = T("Bấm 1 folder để tới, › xem folder con; bấm chỗ trống (Ctrl+L) để gõ đường dẫn");
    ui.view.title = T("Kiểu xem và sắp xếp (Ctrl+Shift+1…9) — chuột phải vùng trống cũng có");
    ui.gear.title = T("Cài đặt Explorer & tab folder (Ctrl+,)");
    FileTools.label(t);
    FolderFlat.labels(t);
    DualPanel.mark(t);
    if (document.activeElement !== ui.addr) ui.addr.value = node.path;
    FolderCrumbs.render(t);
    FolderFilter.labels(t);
  }

  function onKey(t, e) {
    if (e.target.matches("input") || !t.node) return;
    const mode = (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && FolderView.byKey(e);
    if (mode) { e.preventDefault(); e.stopPropagation(); FolderView.setMode(mode); return; }
    if (e.ctrlKey || e.metaKey) return;
    const rows = [...t.ui.list.querySelectorAll(".fi-row")], k = rows.indexOf(document.activeElement);
    if (FolderMiller.key(t, e, rows[k])) { e.preventDefault(); e.stopPropagation(); return; }
    const to = i => { const r = rows[Math.max(0, Math.min(i, rows.length - 1))]; if (r) { r.focus(); FolderSel.moved(t, r, e); } };
    const page = () => FolderView.page(t.ui.list, rows), arrow = e.altKey ? null : FolderView.step(rows, k, e.key);
    if (e.altKey) {
      if (e.key === "ArrowLeft") api.back(t, -1); else if (e.key === "ArrowRight") api.back(t, 1); else if (e.key === "ArrowUp") api.goUp(t); else return;
    } else if (arrow !== null) to(arrow);
    else if (e.key === "PageDown") to(k + page());
    else if (e.key === "PageUp") to(k - page());
    else if (e.key === "Home" && k >= 0) to(0);
    else if (e.key === "End" && k >= 0) to(rows.length - 1);
    else if (e.key === "Enter" && k >= 0) api.openAll(t, api.selected(t));
    else if (e.key === "Backspace") api.goUp(t);
    // Space on a folder = its size, like Total Commander (while not typing a name).
    else if (e.key === " " && !e.shiftKey && FolderRows.nodeOf(rows[k])?.dir && !(t.typed && Date.now() - t.typedAt < 1000)) DirSize.measure([FolderRows.nodeOf(rows[k])]);
    else {
      const r = e.shiftKey && e.key === " " ? null : FolderFilter.type(t, e, rows, k);
      if (r === null) return;
      if (r) { r.focus(); FolderSel.single(t, r); }
    }
    e.preventDefault();
    e.stopPropagation();
  }

  // Right-click / Menu key: a row gets the Explorer menu (a folder opens inside this tab), the empty area the folder's background menu.
  function onMenu(t, e) {
    if (!t.node || ExplorerMenu.wantsNative(e)) return;
    e.preventDefault();
    const r = e.target.closest(".fi-row"), n = r && FolderRows.nodeOf(r), box = (r || t.ui.list).getBoundingClientRect();
    const at = e.clientX || e.clientY ? [e.clientX, e.clientY] : r ? [box.left, box.bottom] : [box.left + 16, box.top + 8], E = TabMenu.entry;
    if (!n) { FolderSel.clear(t); TabMenu.show(ExplorerMenu.backItems(t.node, t.ui.addr, at, () => api.reload(t), [E(T("Tính dung lượng mọi folder"), "Alt+Shift+Enter", () => DirSize.measure(shownDirs(t))), E(T("Folder hay dùng…"), "Ctrl+D", () => FolderHotlist.hotlist(t)), ...FileTools.entries(t.node, t)], t), ...at); return; }
    if (!t.sel.has(r.dataset.key)) FolderSel.single(t, r);
    r.focus({ preventScroll: true });
    const nodes = api.selected(t);
    const size = dirs => dirs.length ? [E(T("Tính dung lượng"), "Space", () => DirSize.measure(dirs))] : [];
    if (nodes.length > 1) { TabMenu.show(ExplorerMenu.groupItems(nodes, r, () => api.openAll(t, nodes), [...DualPanel.entries(t), ...size(nodes.filter(x => x.dir)), ...FileTools.pairEntry(nodes)]), ...at); return; }
    const top = n.dir ? [E(T("Mở"), "Enter", () => api.navigate(t, n)), ExplorerMenu.folderTabEntry(n), ...size([n]), ...ExplorerMenu.newEntries(n), ...FileTools.entries(n), ...DualPanel.entries(t)]
      : [E(T("Mở"), "Enter", () => api.open(t, n)), ...ExplorerMenu.viewEntries(n), ...DualPanel.entries(t)];
    TabMenu.show(ExplorerMenu.items(n, r, top), ...at);
  }

  const shownDirs = t => [...t.ui.list.querySelectorAll(".fi-row")].map(FolderRows.nodeOf).filter(n => n?.dir);

  // window capture: ahead of the editor / app / browser shortcuts (Ctrl+F, Ctrl+A, F3, Ctrl+L, Alt+P, Ctrl+D, F5–F8, Ctrl+U…) while a folder tab has focus.
  addEventListener("keydown", e => {
    const root = e.target.closest?.(".fi"), t = root && api?.find(root);
    if (!t?.node || e.target.matches("input")) return;
    if (FolderSel.hotkey(t, e) || FolderFilter.hotkey(t, e) || FolderCrumbs.hotkey(t, e) || FolderPreview.hotkey(e) || DirSize.hotkey(e, () => shownDirs(t))
      || FolderHotlist.hotkey(t, e) || FolderFlat.hotkey(t, e) || DualPanel.hotkey(t, e) || FileTools.hotkey(t, e)) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  return { init, labels, openFiles, barActions, onKey, onMenu };
})();
