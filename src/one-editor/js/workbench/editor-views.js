// View 1 | View 2: one EditorView per group showing its active tab; each tab keeps its own EditorState so undo, cursor and folds survive switching and moving.
const Views = (() => {
  const groups = [...document.querySelectorAll(".group")].map((el, i) => ({ i, el, host: el.querySelector(".host"), tabs: [], active: null, view: null }));
  let focused = 0;
  const listeners = [];
  const changed = () => { listeners.forEach(f => f()); StatusBar.refresh(); };

  function init() {
    for (const g of groups) {
      g.view = new CM.view.EditorView({ parent: g.host, state: CmSetup.makeState("") });
      g.el.addEventListener("focusin", () => setFocused(g.i));
      g.el.addEventListener("pointerdown", () => setFocused(g.i), true);
      refresh(g);
    }
    CmSetup.onUpdate = onUpdate;
    setFocused(0, true);
  }

  function onUpdate(u) {
    const g = groups.find(x => x.view === u.view), doc = g && Docs.get(g.active);
    if (!doc) return;
    doc.state = u.state;
    if (u.docChanged) Docs.edited(doc);
    if (u.docChanged || u.selectionSet) StatusBar.refresh();
  }

  function setFocused(i, force) {
    if (focused === i && !force) return;
    focused = i;
    groups.forEach(g => g.el.classList.toggle("focused", g.i === i));
    changed();
  }

  const where = id => groups.findIndex(g => g.tabs.includes(id));
  const activeDoc = (i = focused) => Docs.get(groups[i].active);
  const refresh = g => { g.el.classList.toggle("is-empty", !g.active); TabStrip.render(g); };
  const keepScroll = g => { const d = Docs.get(g.active); if (d) d.scrollTop = g.view.scrollDOM.scrollTop; };

  function blank(g) {
    g.active = null;
    g.view.setState(CmSetup.makeState(""));
    refresh(g);
  }

  // Adds without switching (restoring a session); open() adds and shows.
  function add(doc, gi) { if (where(doc.id) < 0) groups[gi].tabs.push(doc.id); }

  function open(doc, gi = focused, focus = true) {
    if (!doc || !Docs.get(doc.id)) return;
    const at = where(doc.id);
    if (at >= 0) gi = at; else groups[gi].tabs.push(doc.id);
    activate(gi, doc.id, focus);
  }

  function activate(gi, id, focus = true) {
    const g = groups[gi], doc = Docs.get(id);
    if (!doc || !g.tabs.includes(id)) return;
    if (g.active !== id || g.view.state !== doc.state) {
      if (g.active !== id) keepScroll(g);
      g.active = id;
      g.view.setState(Docs.ensureState(doc));
      g.view.dispatch({ effects: CmSetup.settingsEffects() });
      const top = doc.scrollTop || 0;
      requestAnimationFrame(() => { g.view.scrollDOM.scrollTop = top; });
      LangLoader.apply(doc);
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

  // false when the user keeps an unsaved file open.
  function close(id, force = false) {
    const doc = Docs.get(id);
    if (!doc || where(id) < 0) return false;
    if (!force && doc.kind === "file" && doc.dirty && !confirm(T("“{name}” chưa lưu. Đóng và bỏ thay đổi?", { name: doc.name }))) return false;
    detach(id);
    Docs.closed(doc);
    changed();
    return true;
  }

  function move(id, to) {
    const from = where(id), doc = Docs.get(id);
    if (from < 0 || from === to || !doc) return;
    detach(id);
    groups[to].tabs.push(id);
    activate(to, id, true);
  }

  function swap() {
    groups.forEach(keepScroll);
    const [a, b] = groups, act = [b.active, a.active];
    [a.tabs, b.tabs] = [b.tabs, a.tabs];
    groups.forEach((g, i) => { g.active = null; if (act[i]) activate(i, act[i], false); else blank(g); });
    changed();
  }

  // An effect for one tab: through its view when shown, otherwise folded into its stored state.
  function applyEffect(doc, effects) {
    const g = groups.find(x => x.active === doc.id);
    if (g) g.view.dispatch({ effects });
    else if (doc.state) doc.state = doc.state.update({ effects }).state;
  }

  function replaceText(doc, text) {
    const g = groups.find(x => x.active === doc.id);
    if (g) { g.view.dispatch({ changes: { from: 0, to: g.view.state.doc.length, insert: text } }); return; }
    if (doc.state) doc.state = doc.state.update({ changes: { from: 0, to: doc.state.doc.length, insert: text } }).state;
    else doc.text = text;
    Docs.edited(doc);
  }

  function revealLine(doc, line) {
    if (!Docs.get(doc.id)) return;
    open(doc, where(doc.id) >= 0 ? where(doc.id) : focused, true);
    const v = groups[where(doc.id)].view, ln = v.state.doc.line(Math.min(Math.max(line || 1, 1), v.state.doc.lines));
    v.dispatch({ selection: { anchor: ln.from }, effects: CM.view.EditorView.scrollIntoView(ln.from, { y: "center" }) });
  }

  const applySettings = () => groups.forEach(g => { if (g.active) g.view.dispatch({ effects: CmSetup.settingsEffects() }); });
  const snapshot = () => ({ groups: groups.map(g => ({ tabs: [...g.tabs], active: g.active })), focused });

  return {
    init, add, open, activate, close, move, swap, where, activeDoc, applyEffect, replaceText, revealLine, applySettings, snapshot, refresh,
    renderAll: () => groups.forEach(refresh), focus: i => setFocused(i === 1 ? 1 : 0),
    activeView: (i = focused) => groups[i].view, tabsOf: i => [...groups[i].tabs], groups,
    get focused() { return focused; }, onChange: f => listeners.push(f),
  };
})();
