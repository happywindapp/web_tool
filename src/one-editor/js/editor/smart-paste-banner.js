// Smart paste: a paste into an empty tab (or over all of it) is checked by PasteDetect ⇒ a light bar under the tab strip offers the matching ▶ op; nothing runs by itself, ✕ dismisses it for that tab.
const SmartPaste = (() => {
  let F = null, setFx = null;
  const on = () => Prefs.get("smartPaste", true) !== false;
  const docOf = view => { const g = Views.groups.find(x => x.view === view); return g && Docs.get(g.active); };
  const dismissed = new Set();

  // Per tab (each tab has its own EditorState): the detection shown, or null.
  function field() {
    if (F) return F;
    const S = CM.state;
    setFx = S.StateEffect.define();
    F = S.StateField.define({
      create: () => null,
      update: (v, tr) => { for (const e of tr.effects) if (e.is(setFx)) return e.value; return v; },
      provide: f => CM.view.showPanel.from(f, v => v ? panel : null),
    });
    return F;
  }

  // The panel is reused while the field stays set: it redraws from the field, never from a captured detection.
  function panel(view) {
    const dom = document.createElement("div");
    dom.className = "oe-paste-bar";
    dom.setAttribute("role", "status");
    let shown = null;
    const draw = hit => { shown = hit; dom.replaceChildren(...parts(view, hit)); };
    draw(view.state.field(F));
    return { dom, top: true, update: u => { const hit = u.state.field(F); if (hit && hit !== shown) draw(hit); } };
  }

  function parts(view, hit) {
    const out = [];
    const text = document.createElement("span");
    text.textContent = T("Phát hiện {what}", { what: T(hit.label) }) + (hit.info ? " = " + hit.info : "");
    out.push(text);
    const op = hit.op && OutputOps.get(hit.op);
    if (op) {
      const run = Object.assign(document.createElement("button"), { type: "button", className: "main", textContent: "▶ " + T(op.label) });
      run.onclick = () => runOp(view, view.state.field(F) || hit);
      out.push(run);
    }
    const close = Object.assign(document.createElement("button"), { type: "button", textContent: "✕", title: T("Ẩn gợi ý cho tab này") });
    close.onclick = () => { const d = docOf(view); if (d) dismissed.add(d.id); set(view, null); view.focus(); };
    out.push(close);
    return out;
  }

  const set = (view, v) => view.dispatch({ effects: setFx.of(v) });

  function runOp(view, hit) {
    const d = docOf(view);
    if (!d) return;
    const src = Docs.root(d);
    set(view, null);
    RunOp.pick(src, hit.op);
    Toolbar.sync();
    if (hit.steps) { PowerTools.use(() => RecipeOp.set(src.id, hit.steps)); return; }
    OutputLink.run(src, hit.op).catch(e => StatusBar.msg(e.message, "bad"));
  }

  // The whole tab came from this paste: it was empty, or the paste replaced all of it.
  const wholePaste = u => u.transactions.some(tr => {
    if (!tr.isUserEvent("input.paste")) return false;
    let all = false;
    tr.changes.iterChangedRanges((a, b) => { all ||= a === 0 && b === tr.startState.doc.length; });
    return all;
  });

  function pasted(u) {
    if (!F || !on() || u.state.field(F, false) === undefined || !wholePaste(u)) return;
    const d = docOf(u.view);
    if (!d || dismissed.has(d.id) || u.state.readOnly) return;
    show(u.view, d, u.state.sliceDoc(0, PasteDetect.HEAD));
  }

  // Shown after the current update (a view cannot dispatch while it updates).
  function show(view, d, text) {
    const hit = PasteDetect.detect(text);
    setTimeout(() => {
      if (docOf(view) !== d) return;
      if (!hit) { if (view.state.field(F, false)) set(view, null); return; }
      if (hit.lang && Docs.effectiveLang(d) === "Plain Text" && LangDetect.ids.includes(hit.lang)) Docs.update(Docs.root(d), { lang: hit.lang }, "lang");
      set(view, hit);
    });
    return !!hit;
  }

  // Demo / tests: each visible tab as if it had just been pasted → how many bars.
  const detectVisible = () => !F ? 0 : Views.groups.slice(0, Views.count).filter(g => { const d = Docs.get(g.active); return d && show(g.view, d, g.view.state.sliceDoc(0, PasteDetect.HEAD)); }).length;

  return { field, pasted, detectVisible, on };
})();
