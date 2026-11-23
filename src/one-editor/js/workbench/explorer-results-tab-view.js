// Results tab (kind "results", 🔎): files gathered from many folders by a provider (file search, duplicates, folder compare) — rows stream in, groups fold, multi-selection, the Explorer menu and the preview pane; F5 keeps the criteria, ↻ runs it again.
const ResultsTab = (() => {
  const tabs = new Map(), providers = new Map(), { el, btn } = FolderRows;
  const COLS = [["name", "Tên"], ["type", "Thư mục"], ["mod", "Ngày sửa"], ["size", "Kích thước"]];
  const visible = t => Views.groups.some(g => g.i < Views.count && g.active === t.doc.id);
  const keyOf = it => it.key ?? it.node.path;
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  // Criteria go to IndexedDB with the tab: plain JSON only (a node or handle would make every hot-exit write fail).
  function plain(criteria) {
    try { const s = JSON.stringify(criteria ?? null); return s.length <= 20000 ? JSON.parse(s) : null; } catch { return null; }
  }
  const dirOf = it => it.dir ?? it.node.path.slice(0, Math.max(0, it.node.path.lastIndexOf("/")));

  // provider: { title(criteria) → tab name, run(criteria, sink) → Promise, chips?: [[st, symbol, label]], action?: { label, title, menu(ctl) → entries }, open?(item, ctl) → true when handled };
  // sink: add([{ node, group?, status?, st?, statusTitle?, dir?, key?, stat? }]), progress(text), done(summary), incomplete() (a partial result), stopped().
  const register = (id, p) => providers.set(id, p);

  function build(t) {
    const ui = t.ui = { root: el("div", "fi rs"), title: el("b", "tr-title"), count: el("span", "fi-count"), stop: btn("fi-nav", "■", () => stop(t)), again: btn("fi-nav", "↻", () => run(t)), chips: el("span", "rs-chips"), act: btn("fi-nav rs-act", "", e => act(t, e)),
      head: el("div", "fi-row fi-head"), list: el("div", "fi-list"), body: el("div", "fi-body"), selbar: el("div", "fi-selbar"), note: el("p", "tr-note") };
    const bar = el("div", "fi-bar"), main = el("div", "fi-main"), pv = FolderPreview.build(t, { cur: () => current(t), open: n => openOne(t, n) });
    bar.append(ui.title, ui.count, ui.chips, ui.stop, ui.again, ui.act, pv.button);
    ui.chips.addEventListener("click", e => { const b = e.target.closest("[data-st]"); if (b) hideSt(t, b.dataset.st); });
    main.append(ui.head, ui.list, ui.note);
    ui.body.append(main, ...pv.parts);
    ui.selbar.hidden = true;
    Object.assign(ui.root.dataset, { view: "details", i18nSkip: "" });
    ui.root.hidden = true;
    ui.root.append(bar, ui.selbar, ui.body);
    FolderSel.wire(t);
    FolderRows.own(ui.list, () => selected(t));
    ui.list.addEventListener("contextmenu", e => onMenu(t, e));
    ui.list.addEventListener("click", e => { const h = e.target.closest(".rs-grp"); if (h) fold(t, h.dataset.group); });
    ui.root.addEventListener("keydown", e => onKey(t, e));
    Object.assign(t, { onSel: () => FolderPreview.follow(t), sizeOf: k => { const n = t.byKey.get(k)?.node; return n && !n.dir ? t.stats.get(n)?.size ?? null : null; },
      barActions: () => { const nodes = selected(t); return FolderKeys.barActions(nodes, () => openAll(t, nodes)); } });
    FolderSel.init(t);
  }

  function make(doc, s) {
    const strs = a => new Set(Array.isArray(a) ? a.filter(x => typeof x === "string") : []);
    const t = { doc, provider: s.provider, criteria: s.criteria ?? null, items: [], byKey: new Map(), folded: strs(s.folded), hide: strs(s.hide), complete: false,
      stats: new Map(), gen: 0, sort: null, stale: !!s.stale, running: false, note: "", painted: false };
    build(t);
    tabs.set(doc.id, t);
    return t;
  }

  function selected(t) {
    const picked = FolderSel.keys(t).map(k => t.byKey.get(k)?.node).filter(Boolean), f = t.byKey.get(t.selName)?.node;
    return picked.length ? picked : f ? [f] : [];
  }
  const current = t => { const nodes = selected(t); return { node: nodes.length === 1 ? nodes[0] : null, nodes }; };

  // What a provider gets to act on the tab (its action menu, its own way to open a row).
  const ctl = t => ({ tab: t, items: t.items, criteria: t.criteria, complete: t.complete && !t.running && !t.stale, gi: Math.max(0, Views.where(t.doc.id)),
    select: keys => { const ks = keys.filter(k => t.byKey.has(k)); ks.forEach(k => t.folded.delete(t.byKey.get(k).group ?? "")); paint(t); FolderSel.set(t, ks, ks[0] ?? null); }, rerun: c => { if (t.closed) return; if (c !== undefined) { t.criteria = c; t.doc.pending = true; HotExit.schedule(); } run(t); } });
  const itemOf = (t, n) => (t.byKey.get(t.selName)?.node === n ? t.byKey.get(t.selName) : t.items.find(it => it.node === n));

  // A file opens in the other view; a folder shows in View 1's folder tab — unless the provider opens its rows itself.
  function openOne(t, n, it = itemOf(t, n)) {
    if (it && providers.get(t.provider)?.open?.(it, ctl(t))) return;
    if (n.dir) { FolderItems.show(n); return; }
    const gi = Math.max(0, Views.where(t.doc.id));
    Explorer.openNode(n, Views.count > 1 ? Views.other(gi) : gi);
  }
  async function openAll(t, nodes) {
    if (nodes.length === 1 && providers.get(t.provider)?.open) { openOne(t, nodes[0]); return; }
    if (!await FolderKeys.openFiles(nodes, t.doc.id) && nodes.length === 1) openOne(t, nodes[0]);
  }

  function labels(t) {
    const { ui } = t, p = providers.get(t.provider);
    ui.title.textContent = "🔎 " + t.doc.name;
    ui.stop.hidden = !t.running;
    ui.again.disabled = t.running || !p;
    ui.act.hidden = !p?.action;
    if (p?.action) Object.assign(ui.act, { textContent: T(p.action.label), title: T(p.action.title), disabled: t.running });
    ui.stop.title = T("Dừng — giữ các kết quả đã có (Esc)");
    ui.again.title = T("Chạy lại với cùng tiêu chí");
    ui.note.textContent = t.running ? t.note || T("Đang tìm…") : t.stale && !p ? T("Tải lại trang không giữ kết quả — mở lại từ lệnh đã tạo tab này.")
      : t.stale ? T("Tải lại trang không giữ kết quả — bấm ↻ Chạy lại để tìm lại với cùng tiêu chí.") : t.note;
  }

  // Sorting (a header click) keeps the groups and sorts inside each.
  function order(t) {
    const items = t.hide.size ? t.items.filter(it => !t.hide.has(it.st)) : t.items;
    if (!t.sort) return items;
    const { key, asc } = t.sort, stat = it => t.stats.get(it.node)?.[key] ?? -1;
    const val = it => key === "name" ? it.node.name : key === "type" ? dirOf(it) : key === "st" ? it.status || "" : stat(it);
    const cmp = (a, b) => { const x = val(a), y = val(b); return typeof x === "number" ? x - y : collator.compare(String(x), String(y)); };
    return [...items].sort((a, b) => (asc ? 1 : -1) * cmp(a, b));
  }
  const sortBy = (t, k) => { t.sort = { key: k, asc: t.sort?.key === k ? !t.sort.asc : true }; paint(t); };

  function paint(t) {
    const { ui } = t, my = ++t.gen, hadFocus = ui.root.contains(document.activeElement) && !document.activeElement.matches("input"), st = t.items.some(it => it.status);
    t.painted = true;
    labels(t);
    Object.assign(t, { byKey: new Map(t.items.map(it => [keyOf(it), it])), total: t.items.length });
    FolderSel.prune(t, k => t.byKey.has(k));
    ui.root.classList.toggle("has-st", st);
    ui.root.classList.toggle("checks", FolderSel.showChecks());
    ui.head.replaceChildren(...FolderRows.head(st ? [...COLS, ["st", "Trạng thái"]] : COLS, t.sort, k => sortBy(t, k)));
    chips(t);
    const out = [], pairs = [];
    for (const g of FolderGroups.group(order(t), it => it.group ?? "")) {
      const shut = !!g.key && t.folded.has(g.key);
      if (g.key) {
        const h = btn("rs-grp", (shut ? "▸ " : "▾ ") + g.key + " · " + T("{n} mục", { n: g.items.length }));
        h.dataset.group = g.key;
        h.setAttribute("aria-expanded", !shut);
        out.push(h);
      }
      if (shut) continue;
      for (const it of g.items) {
        const n = it.node, r = FolderRows.row(n, keyOf(it), [["name", FolderView.label(n)], ["type", dirOf(it)], ["mod"], ["size"], ...(st ? [["st", it.status || ""]] : [])], n.path + (it.statusTitle ? "\n" + it.statusTitle : ""));
        r.onclick = e => { if (!FolderSel.click(t, r, e) && e.pointerType === "touch") openOne(t, n, it); };
        r.ondblclick = e => { if (!t.selMode && !e.target.closest(".fi-chk")) openOne(t, n, it); };
        if (t.stats.has(n)) FolderRows.setCells(r, t.stats.get(n));
        out.push(r);
        pairs.push([n, r]);
      }
    }
    ui.list.replaceChildren(...out);
    if (!out.length && !t.running) ui.list.append(el("p", "fi-empty", t.stale ? "" : t.items.length ? T("Mọi kết quả đang bị ẩn — bấm các nút trạng thái để hiện lại.") : T("Không có kết quả.")));
    FolderSel.sync(t);
    if (hadFocus) (ui.list.querySelector(`.fi-row[data-key="${CSS.escape(t.selName ?? "")}"]`) || ui.list.querySelector(".fi-row") || ui.again).focus();
    FolderRows.fill(t, my, pairs).then(read => { if (read && /^(mod|size)$/.test(t.sort?.key)) paint(t); else if (read) FolderSel.count(t); });
  }

  // Rows stream in: a repaint at most every ~0.3–2 s (longer as the list grows).
  function soon(t) {
    if (!visible(t)) { t.painted = false; return; }
    if (t.timer) return;
    t.timer = setTimeout(() => { t.timer = 0; paint(t); }, Math.min(2000, 300 + t.items.length / 10));
  }

  // Status chips (a provider with chips, e.g. folder compare): "⬅ 3" shows / hides the rows of that status.
  function chips(t) {
    const defs = providers.get(t.provider)?.chips || [], n = {};
    for (const it of t.items) if (it.st) n[it.st] = (n[it.st] || 0) + 1;
    t.ui.chips.replaceChildren(...defs.filter(([st]) => n[st] || t.hide.has(st)).map(([st, sym, label]) => {
      const b = btn("fi-nav rs-chip" + (t.hide.has(st) ? "" : " on"), sym + " " + (n[st] || 0), null);
      b.dataset.st = st;
      b.title = T(label) + " — " + T("bấm để ẩn / hiện");
      b.setAttribute("aria-pressed", !t.hide.has(st));
      return b;
    }));
  }
  function hideSt(t, st) {
    if (t.hide.has(st)) t.hide.delete(st); else t.hide.add(st);
    t.doc.pending = true;
    HotExit.schedule();
    paint(t);
  }
  function act(t, e) {
    const p = providers.get(t.provider), r = e.currentTarget.getBoundingClientRect();
    if (p?.action) Promise.resolve(p.action.menu(ctl(t))).then(list => { if (list?.length) TabMenu.show(list, r.left, r.bottom + 2); }, err => StatusBar.msg(err.message, "bad"));
  }

  function fold(t, key) {
    if (t.folded.has(key)) t.folded.delete(key); else t.folded.add(key);
    t.doc.pending = true;
    HotExit.schedule();
    paint(t);
  }

  async function run(t) {
    const p = providers.get(t.provider);
    if (!p || t.running) return;
    const job = { stopped: false };
    Object.assign(t, { job, running: true, stale: false, complete: false, note: "", items: [], stats: new Map() });
    paint(t);
    const mine = () => t.job === job && tabs.has(t.doc.id);
    const sink = { add: list => { if (!mine()) return; for (const it of list) if (it.stat) t.stats.set(it.node, it.stat); t.items.push(...list); soon(t); },
      progress: text => { if (mine()) { t.note = text; labels(t); } }, done: text => { job.summary = text; }, incomplete: () => { job.incomplete = true; }, stopped: () => job.stopped || !mine() };
    // The last progress line does not stay once the run is over.
    try { await p.run(t.criteria, sink); job.note = job.summary || ""; }
    catch (e) { job.failed = true; job.note = T("Lỗi: {msg}", { msg: e?.message ?? String(e) }); }
    if (!mine()) return;
    clearTimeout(t.timer);
    Object.assign(t, { timer: 0, running: false, complete: !job.stopped && !job.failed && !job.incomplete, note: job.stopped ? T("Đã dừng — giữ {n} kết quả đã có.", { n: t.items.length }) : job.note });
    if (visible(t)) paint(t); else t.painted = false;
  }
  const stop = t => { if (t.running && t.job) t.job.stopped = true; };

  function onKey(t, e) {
    if (e.target.matches("input")) return;
    const rows = [...t.ui.list.querySelectorAll(".fi-row")], k = rows.indexOf(document.activeElement), plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    const to = i => { const r = rows[Math.max(0, Math.min(i, rows.length - 1))]; if (r) { r.focus(); FolderSel.moved(t, r, e); } };
    if (!FolderSel.hotkey(t, e) && !FolderPreview.hotkey(e)) {
      if (plain && e.key === "ArrowDown") to(k + 1);
      else if (plain && e.key === "ArrowUp") to(k - 1);
      else if (plain && e.key === "Home") to(0);
      else if (plain && e.key === "End") to(rows.length - 1);
      else if (plain && !e.shiftKey && e.key === "Enter" && k >= 0) openAll(t, selected(t));
      else if (plain && e.key === "Escape" && t.running) stop(t);
      else return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function onMenu(t, e) {
    const r = e.target.closest(".fi-row");
    if (!r || ExplorerMenu.wantsNative(e)) return;
    e.preventDefault();
    if (!t.sel.has(r.dataset.key)) FolderSel.single(t, r);
    r.focus({ preventScroll: true });
    const nodes = selected(t), box = r.getBoundingClientRect(), at = e.clientX || e.clientY ? [e.clientX, e.clientY] : [box.left, box.bottom], E = TabMenu.entry;
    if (nodes.length > 1) { TabMenu.show(ExplorerMenu.groupItems(nodes, r, () => openAll(t, nodes)), ...at); return; }
    const n = nodes[0];
    TabMenu.show(ExplorerMenu.items(n, r, [E(T("Mở"), "Enter", () => openOne(t, n)), E(T("Mở folder chứa"), "", () => FolderItems.reveal(n)), ...(n.dir ? [] : ExplorerMenu.viewEntries(n))]), ...at);
  }

  // One tab per provider: a new run with other criteria replaces its rows.
  function open(id, criteria, gi = Views.focused) {
    const p = providers.get(id), name = p?.title(criteria) || T("Kết quả");
    let t = [...tabs.values()].find(x => x.provider === id);
    if (!t) { t = make(Docs.create({ kind: "results", name, readOnly: true }), { provider: id, criteria }); Views.open(t.doc, gi, true); }
    else { stop(t); t.criteria = criteria; Docs.update(t.doc, { name }); gi = Math.max(0, Views.where(t.doc.id)); Views.activate(gi, t.doc.id); }
    PhoneLayout.show(gi + 1);
    t.running = false;
    run(t);
    return t;
  }

  // Called by Views.refresh after FolderItems.mount: the active results tab replaces the editor of that view.
  function mount(g) {
    const t = tabs.get(g.active);
    for (const x of tabs.values()) if (x !== t && x.ui.root.parentNode === g.el) x.ui.root.hidden = true;
    if (!t) return;
    g.el.classList.add("is-folder");
    if (t.ui.root.parentNode !== g.el) g.el.append(t.ui.root);
    t.ui.root.hidden = false;
    if (!t.painted) paint(t);
  }

  // After an Explorer draw: a re-read folder replaced its child nodes — rows follow by name, items that are gone leave.
  function sync() {
    const kids = new Map();
    const of = p => { if (!kids.has(p)) kids.set(p, { set: new Set(p.children), byName: new Map(p.children.map(c => [c.name + (c.dir ? "/" : ""), c])) }); return kids.get(p); };
    for (const t of tabs.values()) {
      relink(t);
      if (!t.items.some(it => it.node.parent?.children && !of(it.node.parent).set.has(it.node))) continue;
      t.items = t.items.flatMap(it => {
        const p = it.node.parent;
        if (!p?.children || of(p).set.has(it.node)) return [it];
        const n = of(p).byName.get(it.node.name + (it.node.dir ? "/" : ""));
        return n ? [{ ...it, node: n }] : [];
      });
      if (visible(t)) paint(t); else t.painted = false;
    }
  }

  // Rows cut off the tree (a folder above them was read again) are looked up again by path.
  async function relink(t) {
    if (t.running || t.relinking || !t.items.length) return;
    t.relinking = true;
    const items = t.items, map = await FolderPaths.relink(items.map(it => it.node)).finally(() => { t.relinking = false; });
    if (!map.size || t.items !== items || t.closed) return;
    t.items = items.flatMap(it => !map.has(it.node) ? [it] : map.get(it.node) ? [{ ...it, node: map.get(it.node) }] : []);
    if (visible(t)) paint(t); else t.painted = false;
  }

  Docs.on((type, doc) => { if (type === "remove" && tabs.has(doc.id)) { const t = tabs.get(doc.id); t.closed = true; stop(t); clearTimeout(t.timer); t.gen++; FolderPreview.reset(t); t.ui.root.remove(); tabs.delete(doc.id); } });
  const repaint = () => tabs.forEach(t => { if (visible(t)) paint(t); else t.painted = false; });
  I18n.onChange(repaint);
  // Extensions shown / hidden change the names.
  FolderView.onChange(repaint);
  FolderView.onToggle(() => tabs.forEach(t => { t.ui.root.classList.toggle("checks", FolderSel.showChecks()); FolderPreview.follow(t); }));
  // Hot exit keeps the provider, criteria and folded groups; the rows come back with ↻.
  const saved = doc => { const t = tabs.get(doc.id); return t ? { provider: t.provider, criteria: plain(t.criteria), folded: [...t.folded].slice(0, 200), hide: [...t.hide].slice(0, 20) } : null; };
  const adopt = (doc, s) => { make(doc, { ...(s || {}), provider: typeof s?.provider === "string" ? s.provider : "", stale: true }); };
  return { register, open, mount, sync, saved, adopt };
})();
