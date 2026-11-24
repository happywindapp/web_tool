// Folder tabs (kind "folder"): a folder as a sortable item view like Windows Explorer (FolderView modes, groups, flat, columns), with ← → ⬆, an address bar and the Explorer right-click menu; a click in the Explorer tree shows the folder in View 1's folder tab.
const FolderItems = (() => {
  const tabs = new Map(), HISTORY = 50, { el, btn } = FolderRows;
  const visible = t => Views.groups.some(g => g.i < Views.count && g.active === t.doc.id), { chain, resolve } = FolderPaths;

  function build(t) {
    const ui = t.ui = { root: el("div", "fi"), back: btn("fi-nav", "←", () => back(t, -1)), fwd: btn("fi-nav", "→", () => back(t, 1)), up: btn("fi-nav", "⬆", () => goUp(t)),
      addr: el("input", "fi-addr"), count: el("span", "fi-count"), view: btn("fi-nav", "☷", () => { const r = ui.view.getBoundingClientRect(); FolderView.viewMenu(r.left, r.bottom + 2, t); }), head: el("div", "fi-row fi-head"), list: el("div", "fi-list"),
      gear: btn("fi-nav", "⚙", () => SettingsTab.open("explorer")), dual: btn("fi-nav fi-dual", "⇆", () => DualPanel.toggle()) };
    ui.flat = FolderFlat.button(t);
    ui.tools = FileTools.button(t);
    const bar = el("div", "fi-bar"), main = el("div", "fi-main");
    const crumbs = FolderCrumbs.build(t, { go: p => goPath(t, p), dirs: async p => { const n = await resolve(p, true); return n ? (await Explorer.loadKids(n)).filter(c => c.dir) : []; } });
    const pv = FolderPreview.build(t, { cur: () => current(t), open: n => open(t, n) });
    bar.append(ui.back, ui.fwd, ui.up, crumbs, ...FolderFilter.build(t, paint), ui.count, ui.flat, ui.tools, pv.button, ui.view, ui.dual, ui.gear);
    Object.assign(ui, { main, body: el("div", "fi-body"), selbar: el("div", "fi-selbar") });
    ui.selbar.hidden = true;
    main.append(ui.head, ui.list);
    ui.body.append(main, ...pv.parts);
    ui.root.dataset.i18nSkip = "";
    ui.root.hidden = true;
    ui.root.append(bar, ui.selbar, ui.body);
    ui.root.addEventListener("keydown", e => FolderKeys.onKey(t, e));
    ui.list.addEventListener("contextmenu", e => FolderKeys.onMenu(t, e));
    FolderSel.wire(t);
    FolderHotlist.wire(t); FolderGrouping.clear(t);
    FolderRows.own(ui.list, () => selected(t));
    // The selection goes with the tab through hot exit.
    const onSel = () => { FolderPreview.follow(t); FolderMiller.follow(t); t.doc.pending = true; HotExit.schedule(); };
    Object.assign(t, { onSel, sizeOf: name => { const n = t.byName?.get(name); return n && !n.dir ? t.stats.get(n)?.size ?? null : null; }, barActions: () => { const nodes = selected(t); return FolderKeys.barActions(nodes, () => openAll(t, nodes)); } });
    FolderSel.init(t, t.sel ? [...t.sel] : []);
  }

  // Selected nodes in view order; nothing selected ⇒ the focused one.
  function selected(t) {
    const picked = FolderSel.keys(t).map(k => t.byName?.get(k)).filter(Boolean), f = t.byName?.get(t.selName);
    return picked.length ? picked : f ? [f] : [];
  }
  const current = t => { const nodes = selected(t); return { node: nodes.length === 1 ? nodes[0] : null, nodes }; };

  // Files open as tabs in the other view; a lone folder opens inside this tab.
  async function openAll(t, nodes) {
    if (!await FolderKeys.openFiles(nodes, t.doc.id) && nodes.length === 1) open(t, nodes[0]);
  }

  // Sizes / dates fill in after the list shows; sorting by them repaints once they are known.
  async function fill(t, my, pairs) {
    if (!await FolderRows.fill(t, my, pairs)) return;
    if (/^(mod|size)$/.test(FolderFlat.sort(t).key) || FolderGrouping.needsStats(t)) paint(t); else FolderSel.count(t);
  }

  const FLAT_COLS = [FolderView.COLS[0], ["dir", "Thư mục"], ...FolderView.COLS.slice(1)];
  function paint(t) {
    const { ui, node } = t, my = ++t.gen, hadFocus = t.refocus || (ui.root.contains(document.activeElement) && !document.activeElement.matches("input")), flat = FolderFlat.on(t);
    t.shown = node.children;
    t.refocus = false;
    FolderKeys.labels(t);
    const sort = FolderFlat.sort(t), base = flat ? FolderFlat.files(t) : (node.children || []).filter(n => FolderView.shows(n.name)), key = n => (flat ? FolderFlat.key(t, n) : n.name);
    const all = FolderFmt.order(base, sort.key, sort.asc, t.stats, flat ? n => FolderFlat.dir(t, n) : null), test = FolderFilter.test(t), cols = FolderGrouping.test(t);
    const items = test || cols ? all.filter(n => (!test || test(n)) && (!cols || cols(n))) : all;
    Object.assign(t, { all, byName: new Map(all.map(n => [key(n), n])), total: all.length });
    FolderSel.prune(t, k => t.byName.has(k));
    ui.root.dataset.view = FolderMiller.on(t) ? "cols" : flat && FolderView.mode() === "cols" ? "sm" : FolderView.mode();
    ui.root.classList.toggle("checks", FolderSel.showChecks());
    ui.head.replaceChildren(...FolderGrouping.head(t, flat ? FLAT_COLS : FolderView.COLS, sort, k => FolderFlat.sortBy(t, k), paint));
    const pairs = items.map(n => {
      const r = FolderRows.row(n, key(n), [["name", FolderView.label(n)], ...(flat ? [["dir", FolderFlat.dir(t, n)]] : []), ["mod"], ["type", FolderFmt.typeOf(n)], ["size"]]);
      r.onclick = e => { if (!FolderSel.click(t, r, e) && e.pointerType === "touch") open(t, n); };
      r.ondblclick = e => { if (!t.selMode && !e.target.closest(".fi-chk")) open(t, n); };
      if (t.stats.has(n)) FolderRows.setCells(r, t.stats.get(n));
      return [n, r];
    });
    ui.list.replaceChildren(...FolderGrouping.layout(t, pairs, paint));
    Thumbs.watch(t, pairs);
    if (!items.length) ui.list.append(el("p", "fi-empty", test ? T("Không có mục khớp “{q}”.", { q: t.filter.trim() }) : cols ? T("Không có mục khớp bộ lọc cột.") : t.flat?.job ? T("Đang đọc…") : T("Folder trống.")));
    FolderMiller.paint(t);
    FolderSel.sync(t);
    if (hadFocus) (pairs.find(([n, r]) => r.isConnected && key(n) === t.selName)?.[1] || ui.list.querySelector(".fi-row") || ui.up).focus({ preventScroll: !!t.flat?.job });
    fill(t, my, pairs);
  }

  async function load(t) {
    const node = t.node;
    if (t.loading === node || t.failed === node) return;
    t.loading = node;
    t.gen++;
    if (document.activeElement !== t.ui.addr) t.ui.addr.value = node.path;
    t.ui.count.textContent = "";
    t.ui.list.replaceChildren(el("p", "fi-empty", T("Đang đọc…")));
    try { await Explorer.loadKids(node); }
    catch (e) { t.failed = node; if (t.node === node) t.ui.list.replaceChildren(el("p", "fi-empty bad", T("Không đọc được folder: {msg}", { msg: e.message }))); return; }
    finally { if (t.loading === node) t.loading = null; }
    // The tree redraws (it may hold this folder folded and unfilled); its draw() calls sync() → paint().
    Explorer.render();
  }

  // A tab restored after F5 waits for the Explorer to reopen its folder (a local one needs a click to grant read access again).
  function waiting(t) {
    const { ui } = t, name = Explorer.savedName();
    ui.back.disabled = ui.fwd.disabled = ui.up.disabled = true;
    if (document.activeElement !== ui.addr) ui.addr.value = t.path;
    FolderCrumbs.render(t);
    FolderPreview.reset(t);
    ui.count.textContent = "";
    ui.head.replaceChildren();
    ui.list.replaceChildren(el("p", "fi-empty", name ? T("Sau khi tải lại trang, trình duyệt cần bạn bấm để cho đọc lại folder.") : T("Folder gốc của “{path}” chưa mở trong Explorer — mở lại để xem tiếp.", { path: t.path })),
      btn("ex-open", name ? T("📂 Mở lại “{name}”", { name }) : T("📂 Mở folder…"), () => Explorer.reopenSaved()));
  }

  // Shown tabs follow re-reads at once; hidden ones repaint when they are shown again.
  function refresh(t) {
    if (!visible(t)) return;
    if (!t.node) waiting(t);
    else if (!t.node.children) load(t);
    else if (FolderFlat.on(t) ? FolderFlat.stale(t) : t.node.children !== t.shown) { if (!FolderFlat.on(t)) t.stats = new Map(); paint(t); }
  }

  // History and Up work on paths: a re-read parent (ExplorerDisk.reload) replaces the child nodes.
  function navigate(t, node, selName = null, record = true) {
    if (t.node !== node) {
      if (record) { t.past = [...t.past, t.path].slice(-HISTORY); t.next = []; }
      // A tab restored after F5 (no node yet) keeps its saved selection.
      const keep = !t.node && t.sel?.size ? [...t.sel] : selName ? [selName] : [];
      FolderFlat.off(t);
      Object.assign(t, { node, path: node.path, selName, shown: null, failed: null, stats: new Map() });
      FolderSel.init(t, keep);
      FolderFilter.clear(t);
      FolderGrouping.clear(t);
      FolderHotlist.remember(node.path);
      // Also marks the tab for hot exit (path + history are saved with it).
      Docs.update(t.doc, { name: node.name });
    } else if (selName && (FolderFlat.off(t) || !t.sel.has(selName))) { FolderSel.init(t, [selName]); t.selName = selName; if (visible(t) && t.node.children === t.shown) paint(t); }
    (chain(node) || []).slice(0, -1).forEach(n => { n.open = true; });
    refresh(t);
    Explorer.render();
  }

  // steps > 1: a jump from the ← → history list.
  async function back(t, dir, steps = 1) {
    const here = t.node, j = here && FolderNav.jump(t.past, t.next, here.path, dir, steps);
    if (!j) return;
    const n = await resolve(j.to);
    if (!n || t.node !== here) return;
    Object.assign(t, { past: j.past.slice(-HISTORY), next: j.next.slice(-HISTORY) });
    navigate(t, n, here.name, false);
  }
  async function goUp(t) {
    const here = t.node, i = here ? here.path.lastIndexOf("/") : -1;
    if (i < 0) return;
    const n = await resolve(here.path.slice(0, i));
    if (n && t.node === here) navigate(t, n, here.name);
  }
  async function goPath(t, text) {
    const n = await resolve(text, true);
    if (!n) { StatusBar.msg(T("Không thấy folder “{path}” trong folder đang mở.", { path: text.trim() }), "warn"); t.ui.addr.select(); return; }
    navigate(t, n);
    t.ui.addr.blur();
    t.ui.list.querySelector(".fi-row")?.focus();
  }

  // A file opens in the other view so the folder tab stays in sight; with 1 view it opens next to it.
  function open(t, n) {
    if (n.dir) { navigate(t, n); return; }
    const gi = Math.max(0, Views.where(t.doc.id));
    Explorer.openNode(n, Views.count > 1 ? Views.other(gi) : gi);
  }

  function newTab(node, gi, focus = false, selName = null) {
    const doc = Docs.create({ kind: "folder", name: node.name, readOnly: true }), t = { doc, node, path: node.path, selName, sel: new Set(selName ? [selName] : []), shown: null, past: [], next: [], gen: 0, stats: new Map() };
    build(t);
    tabs.set(doc.id, t);
    Views.open(doc, gi, focus);
    navigate(t, node, null, false);
    return t;
  }

  // Tree click: the active folder tab of View gi (View 1), else its last folder tab, else a new one; selName = the item to select there.
  function show(node, selName = null, gi = 0) {
    if (!node?.dir) return;
    const g = Views.groups[gi], ids = g.tabs.filter(id => tabs.has(id)), id = ids.includes(g.active) ? g.active : ids.at(-1);
    const t = id ? tabs.get(id) : newTab(node, gi, false, selName);
    if (id) { Views.activate(gi, id, false); navigate(t, node, selName); }
    PhoneLayout.show(gi + 1);
    return t;
  }

  // Called by Views.refresh: the active folder tab's list replaces the editor of that view.
  function mount(g) {
    const t = tabs.get(g.active);
    g.el.classList.toggle("is-folder", !!t);
    for (const x of tabs.values()) if (x !== t && x.ui.root.parentNode === g.el) x.ui.root.hidden = true;
    tabs.forEach(DualPanel.mark);
    if (!t) return;
    if (t.ui.root.parentNode !== g.el) g.el.append(t.ui.root);
    t.ui.root.hidden = false;
    refresh(t);
  }

  // Called after every Explorer draw: follow re-reads; a folder that left the tree is found again by path (or its nearest ancestor), the tab closes when the opened folder is gone.
  function sync() {
    for (const t of [...tabs.values()]) {
      if (t.node ? chain(t.node) : !Explorer.root()) { refresh(t); continue; }
      if (t.resolving) continue;
      const from = t.node;
      t.resolving = true;
      resolve(t.path).then(n => {
        t.resolving = false;
        if (!tabs.has(t.doc.id) || t.node !== from) return;
        if (n) navigate(t, n, t.selName, false); else Views.close(t.doc.id, true);
      });
    }
  }

  Docs.on((type, doc) => { if (type === "remove" && tabs.has(doc.id)) { const t = tabs.get(doc.id); t.closed = true; FolderFlat.off(t); t.gen++; t.thumbIO?.disconnect(); FolderPreview.reset(t); t.ui.root.remove(); tabs.delete(doc.id); } });
  // Hidden tabs repaint when shown again.
  const repaint = () => tabs.forEach(t => { if (!visible(t)) t.shown = null; else if (!t.node) waiting(t); else if (t.node.children) paint(t); });
  I18n.onChange(repaint);
  FolderView.onChange(repaint);
  // A folder size found later re-sorts a list sorted by size.
  DirSize.onChange(() => { if (FolderView.sort().key === "size") repaint(); });
  FolderView.onToggle(() => tabs.forEach(t => { t.ui.root.classList.toggle("checks", FolderSel.showChecks()); if (t.node) FolderPreview.follow(t); }));
  const duplicate = (doc, gi) => { const t = tabs.get(doc.id); if (t?.node) newTab(t.node, gi, true); };
  // Hot exit: the path, ← → history and selection are stored with the tab; the folder itself comes back through the Explorer.
  const saved = doc => { const t = tabs.get(doc.id); return t ? { path: t.path, past: t.past, next: t.next, sel: t.selName, sels: [...t.sel].slice(0, 500) } : null; };
  const strs = (a, max = HISTORY) => Array.isArray(a) ? a.filter(x => typeof x === "string").slice(-max) : [];
  function adopt(doc, s) {
    const path = typeof s?.path === "string" && s.path ? s.path : doc.name, sel = typeof s?.sel === "string" ? s.sel : null;
    const t = { doc, node: null, path, selName: sel, sel: new Set(s?.sels ? strs(s.sels, 500) : sel ? [sel] : []), shown: null, past: strs(s?.past), next: strs(s?.next), gen: 0, stats: new Map() };
    build(t);
    tabs.set(doc.id, t);
  }

  const isShown = node => [...tabs.values()].some(t => t.node === node && visible(t));
  // The folder a tree click would replace: View 1's active folder tab.
  const shownFolder = () => tabs.get(Views.groups[0].active)?.node || null;
  const openNew = (node, gi = Views.focused) => { newTab(node, gi, true); PhoneLayout.show(gi + 1); };
  // "Open containing folder": the item's folder in View 1's folder tab with the item selected.
  async function reveal(node) {
    const i = node.path.lastIndexOf("/"), dir = i > 0 ? await resolve(node.path.slice(0, i)) : null;
    if (!FolderView.shows(node.name)) StatusBar.msg(T("“{name}” là file ẩn — bật Xem ▸ Hiện file ẩn để thấy nó.", { name: node.name }), "warn");
    if (dir) show(dir, node.name)?.ui.list.querySelector(`.fi-row[data-key="${CSS.escape(node.name)}"]`)?.scrollIntoView({ block: "nearest" }); else StatusBar.msg(T("Folder chứa “{name}” không còn trong Explorer.", { name: node.name }), "warn");
  }
  const tabIn = gi => (gi >= 0 && gi < Views.count ? tabs.get(Views.groups[gi].active) || null : null);
  const api = { find: root => [...tabs.values()].find(x => x.ui.root === root), selected, back, goUp, open, navigate, openAll, paint, goPath, tabIn, show, reload: t => { t.failed = null; ExplorerDisk.reload(t.node); } };
  [FolderKeys, FolderMiller, FolderHotlist, FolderFlat, DualPanel].forEach(m => m.init(api));
  return { show, mount, sync, duplicate, saved, adopt, isShown, current: shownFolder, openNew, reveal, tabIn, nodeOf: docId => tabs.get(docId)?.node || null };
})();
