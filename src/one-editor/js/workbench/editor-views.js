// Up to 4 views (layout 1 / 2 columns / 3 columns / 2 rows / 2×2): one EditorView each showing its active tab; every tab keeps its own EditorState so undo, cursor and folds survive switching and moving.
const Views = (() => {
  const groups = [...document.querySelectorAll(".group")].map((el, i) => ({ i, el, host: el.querySelector(".host"), tabs: [], active: null, view: null }));
  let focused = 0, layout = "2c", count = 2;
  const listeners = [], closed = [], cursorFns = [], lintFns = [];
  const changed = () => { listeners.forEach(f => f()); StatusBar.refresh(); };
  const userEdit = u => u.transactions.some(tr => tr.annotation(CM.state.Transaction.userEvent) !== undefined);

  function init() {
    for (const g of groups) {
      g.view = new CM.view.EditorView({ parent: g.host, state: CmSetup.makeState("") });
      g.el.addEventListener("focusin", () => setFocused(g.i));
      g.el.addEventListener("pointerdown", () => setFocused(g.i), true);
      // A click is the user gesture the browser needs to grant read permission again after F5.
      g.host.addEventListener("pointerdown", () => { const d = Docs.get(g.active); if (d?.stale) FileOpen.reload(d, true); });
    }
    CmSetup.onUpdate = onUpdate;
    setLayout(layout);
    setFocused(0, true);
  }

  function onUpdate(u) {
    const g = groups.find(x => x.view === u.view), doc = g && Docs.get(g.active);
    if (!doc) return;
    doc.state = u.state;
    if (u.docChanged) {
      const rep = CloneSync.replayed(u), byUser = rep ?? userEdit(u);
      Docs.edited(doc, byUser);
      if (rep === undefined) CloneSync.forward(doc, u.changes, byUser);
      FormatActions.pasted(u);
      Macro.typed(u);
    }
    if (u.docChanged || u.selectionSet || u.transactions.some(t => t.effects.length)) StatusBar.refresh();
    if (u.selectionSet && !u.docChanged) cursorFns.forEach(f => f(doc, u.state));
    if (lintFns.length && u.transactions.some(t => t.effects.some(e => e.is(CM.lint.setDiagnosticsEffect)))) lintFns.forEach(f => f(doc));
  }

  function setFocused(i, force) {
    if (focused === i && !force) return;
    focused = i;
    groups.forEach(g => g.el.classList.toggle("focused", g.i === i));
    changed();
  }

  const where = id => groups.findIndex(g => g.tabs.includes(id));
  const activeDoc = (i = focused) => Docs.get(groups[i].active);
  const refresh = g => { g.el.classList.toggle("is-empty", !g.active); PreviewPane.mount(g); FolderItems.mount(g); TrashTab.mount(g); ResultsTab.mount(g); SettingsTab.mount(g); TabStrip.render(g); };
  const keepScroll = g => { const d = Docs.get(g.active); if (d) d.scrollTop = g.view.scrollDOM.scrollTop; };
  const other = (gi = focused) => Layouts.other(gi, count);
  const blank = g => { g.active = null; g.view.setState(CmSetup.makeState("")); refresh(g); };

  // Fewer views than before: tabs of the views that disappear move to the last one kept.
  function setLayout(id) {
    const l = Layouts.get(id);
    if (!l) return;
    const last = groups[l.n - 1];
    for (const g of groups.slice(l.n)) {
      if (!g.tabs.length) continue;
      keepScroll(g);
      last.tabs.push(...g.tabs);
      g.tabs = [];
      blank(g);
    }
    if (!last.active && last.tabs.length) activate(last.i, last.tabs[0], false);
    layout = id;
    count = l.n;
    groups.forEach(g => { g.el.hidden = g.i >= count; refresh(g); });
    document.querySelectorAll(".pane-switch button").forEach((b, k) => { b.hidden = k > count; });
    $("work").className = "pane-scroller lay-" + id;
    $("split").hidden = !l.bar;
    setFocused(Math.min(focused, count - 1), true);
  }

  // Adds without switching (restoring a session); open() adds and shows.
  function add(doc, gi) { if (where(doc.id) < 0) groups[Math.min(gi, count - 1)].tabs.push(doc.id); }

  function open(doc, gi = focused, focus = true) {
    if (!doc || !Docs.get(doc.id)) return;
    const at = where(doc.id);
    if (at >= 0) gi = at; else { gi = Math.min(gi, count - 1); groups[gi].tabs.push(doc.id); pinFirst(groups[gi]); }
    activate(gi, doc.id, focus);
  }

  function activate(gi, id, focus = true) {
    const g = groups[gi], doc = Docs.get(id);
    if (!g || !doc || !g.tabs.includes(id)) return;
    if (g.active !== id || g.view.state !== doc.state) {
      if (g.active !== id) keepScroll(g);
      g.active = id;
      g.view.setState(Docs.ensureState(doc));
      g.view.dispatch({ effects: CmSetup.settingsEffects() });
      const top = doc.scrollTop || 0;
      requestAnimationFrame(() => { g.view.scrollDOM.scrollTop = top; });
      LangLoader.apply(doc);
      if (doc.stale) FileOpen.reload(doc);
    }
    refresh(g);
    if (focus) { setFocused(gi); g.view.focus(); }
    changed();
  }

  // Detaches the tab from its group and shows a neighbour; returns the group index or -1.
  function detach(id) {
    const gi = where(id);
    if (gi < 0) return -1;
    const g = groups[gi], k = g.tabs.indexOf(id);
    if (g.active === id) keepScroll(g);
    g.tabs.splice(k, 1);
    if (g.active === id) {
      const next = g.tabs[Math.min(k, g.tabs.length - 1)];
      if (next) { g.active = null; activate(gi, next, false); } else blank(g);
    } else refresh(g);
    return gi;
  }

  // false when the user keeps an unsaved file or a pinned tab open. Closing an original also closes its clones.
  function close(id, force = false) {
    const doc = Docs.get(id);
    if (!doc || where(id) < 0) return false;
    const unsaved = doc.kind === "file" && doc.dirty;
    if (!force && unsaved && !confirm(T("“{name}” chưa lưu. Đóng và bỏ thay đổi?", { name: doc.name }))) return false;
    if (!force && !unsaved && doc.pinned && !confirm(T("Tab “{name}” đang ghim. Vẫn đóng?", { name: doc.name }))) return false;
    if (doc.kind !== "clone") {
      for (const c of Docs.family(doc).slice(1)) { detach(c.id); Docs.remove(c.id); }
      // Notes stay in Docs (reopened by id); texts over 5 MB are not kept for reopening.
      const text = doc.kind === "note" ? "" : Docs.text(doc);
      if (text.length <= 5e6 && !PreviewPane.isPreview(doc) && !Docs.isList(doc)) closed.push({ id, gi: where(id), kind: doc.kind, name: doc.name, lang: doc.lang, text, handle: doc.handle, stale: doc.stale, eol: doc.eol, bom: doc.bom, dirty: doc.dirty, readOnly: doc.readOnly, disk: doc.disk });
      if (closed.length > 20) closed.shift();
    }
    detach(id);
    Docs.closed(doc);
    changed();
    return true;
  }

  function reopen() {
    const s = closed.pop();
    if (!s) { StatusBar.msg(T("Không còn tab vừa đóng."), "warn"); return; }
    const kind = s.kind === "file" || s.kind === "note" ? s.kind : "temp";
    open(Docs.get(s.id) || Docs.create({ ...s, id: undefined, kind }), Math.min(s.gi, count - 1));
  }

  // Pinned tabs stay first, are skipped by "close others / to the right" and ask before closing alone.
  function togglePin(doc) {
    Docs.update(doc, { pinned: !doc.pinned });
    const g = groups[where(doc.id)];
    if (g) { pinFirst(g); refresh(g); }
  }
  function pinFirst(g) { g.tabs.sort((a, b) => Docs.get(b).pinned - Docs.get(a).pinned); }

  function closeMany(gi, keepId, rightOnly) {
    const tabs = groups[gi].tabs, from = rightOnly ? tabs.indexOf(keepId) + 1 : 0;
    for (const id of tabs.slice(from)) if (id !== keepId && !Docs.get(id)?.pinned && !close(id)) break;
  }

  function move(id, to) {
    const from = where(id);
    if (from < 0 || from === to || to < 0 || to >= count || !Docs.get(id)) return;
    detach(id);
    groups[to].tabs.push(id);
    pinFirst(groups[to]);
    activate(to, id, true);
  }

  // Exchanges the focused view with "the other" one.
  function swap() {
    const a = groups[focused], b = groups[other()];
    if (!b) return;
    keepScroll(a); keepScroll(b);
    const act = [b.active, a.active];
    [a.tabs, b.tabs] = [b.tabs, a.tabs];
    [a, b].forEach((g, k) => { g.active = null; if (act[k]) activate(g.i, act[k], false); else blank(g); });
    changed();
  }

  // An effect for one tab: through its view when shown, otherwise folded into its stored state.
  function applyEffect(doc, effects) {
    const g = groups.find(x => x.active === doc.id);
    if (g) g.view.dispatch({ effects });
    else if (doc.state) doc.state = doc.state.update({ effects }).state;
  }

  function replaceText(doc, text, annotations) {
    const g = groups.find(x => x.active === doc.id);
    if (g) { g.view.dispatch({ changes: { from: 0, to: g.view.state.doc.length, insert: text }, annotations }); return; }
    if (doc.state) {
      const tr = doc.state.update({ changes: { from: 0, to: doc.state.doc.length, insert: text }, annotations });
      doc.state = tr.state;
      CloneSync.forward(doc, tr.changes, false);
    } else doc.text = text;
    Docs.edited(doc, false);
  }

  function revealLine(doc, line) {
    if (!Docs.get(doc.id)) return;
    open(doc, where(doc.id) >= 0 ? where(doc.id) : focused, true);
    const v = groups[where(doc.id)].view, ln = v.state.doc.line(Math.min(Math.max(line || 1, 1), v.state.doc.lines));
    v.dispatch({ selection: { anchor: ln.from }, effects: CM.view.EditorView.scrollIntoView(ln.from, { y: "center" }) });
  }

  const applySettings = () => groups.forEach(g => { if (g.active) g.view.dispatch({ effects: CmSetup.settingsEffects() }); });
  const snapshot = () => ({ layout, focused, groups: groups.slice(0, count).map(g => {
    const tabs = g.tabs.filter(id => Docs.get(id)?.kind !== "clone");
    return { tabs, active: tabs.includes(g.active) ? g.active : tabs[0] || null };
  }) });

  return {
    init, setLayout, add, open, activate, close, reopen, togglePin, closeMany, move, swap, where, other, activeDoc, applyEffect, replaceText,
    revealLine, applySettings, snapshot, refresh, renderAll: () => groups.forEach(refresh), focus: i => setFocused(Math.min(Math.max(i | 0, 0), count - 1)),
    activeView: (i = focused) => groups[i].view, tabsOf: i => [...groups[i].tabs], groups,
    get focused() { return focused; }, get count() { return count; }, get layout() { return layout; }, onChange: f => listeners.push(f), onLint: f => lintFns.push(f),
    onCursor: f => cursorFns.push(f),
  };
})();
