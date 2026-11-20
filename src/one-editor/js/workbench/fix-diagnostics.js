// Auto-fixes ({line, col, msg}) and the syntax error of a run, shown as lint marks on the source tab: underline + gutter + a list panel whose rows jump to the spot.
const FixMarks = (() => {
  function show(doc, fixes = [], error = null) {
    doc = Docs.get(doc.id) && Docs.root(doc);
    const st = doc && doc.state;
    if (!st || !CM.lint) return;
    // The live linter owns this language (it also reports errors and auto-fix hints): ask it to re-check instead of overwriting its marks.
    if (CmSetup.settings.lint && DataLint.LANGS.has(Docs.effectiveLang(doc))) { const g = Views.groups.find(x => x.active === doc.id); if (g) CM.lint.forceLinting(g.view); return; }
    const at =(line, col) => {
      const l = st.doc.line(Math.min(Math.max(line || 1, 1), st.doc.lines));
      return Math.min(l.from + Math.max((col || 1) - 1, 0), l.to);
    };
    const mark = (line, col, severity, message) => { const from = at(line, col); return { from, to: Math.min(from + 1, st.doc.lineAt(from).to), severity, message }; };
    const list = fixes.map(f => mark(f.line, f.col, "warning", T("Đã tự sửa: {msg}", { msg: f.msg })));
    if (error && error.line) list.push(mark(error.line, error.col, "error", error.message));
    if (!list.length && !CM.lint.diagnosticCount(st)) return;
    Views.applyEffect(doc, [].concat(CM.lint.setDiagnostics(st, list).effects || []));
  }

  // Shows the source tab and opens the lint panel listing the marks.
  function openList(doc) {
    const gi = Views.where(doc.id);
    Views.open(doc, gi >= 0 ? gi : Views.focused, true);
    CM.lint.openLintPanel(Views.activeView(Views.where(doc.id)));
  }

  return { show, openList };
})();
