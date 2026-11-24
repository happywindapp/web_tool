// Notepad++ bookmarks: marked lines kept per tab in a StateField that follows edits; F2 / Shift+F2 jump to the next / previous one (wrapping). doc.marks holds the line numbers while the tab has no live state.
const Bookmarks = (() => {
  let field = null, setAll = null, mark = null;

  const build = (doc, lines) => CM.view.Decoration.set(BookmarkLines.clean(lines).filter(n => n <= doc.lines).map(n => mark.range(doc.line(n).from)));
  const numbers = (set, doc) => { const out = []; set.between(0, doc.length, from => { out.push(doc.lineAt(from).number); }); return BookmarkLines.clean(out); };
  // assoc 1: text inserted at the start of a marked line pushes the mark down with the line's content (Notepad++).
  const remap = (set, tr) => { const out = []; set.between(0, tr.startState.doc.length, from => { out.push(tr.state.doc.lineAt(tr.changes.mapPos(from, 1)).number); }); return build(tr.state.doc, out); };
  // One change over the whole old text (reload from disk, a re-run output): keep line numbers instead of piling every mark at the top.
  function wholeReplace(tr) {
    let n = 0, all = false;
    tr.changes.iterChangedRanges((fromA, toA) => { n++; all = fromA === 0 && toA === tr.startState.doc.length; });
    return n === 1 && all && tr.startState.doc.length > 0;
  }

  // Built on first use: CodeMirror is only loaded at boot.
  function extension() {
    if (field) return field;
    const { StateField, StateEffect } = CM.state, { Decoration, EditorView } = CM.view;
    setAll = StateEffect.define();
    mark = Decoration.line({ class: "cm-bookmark" });
    field = StateField.define({
      create: () => Decoration.none,
      update(set, tr) {
        if (tr.docChanged) set = wholeReplace(tr) ? build(tr.state.doc, numbers(set, tr.startState.doc)) : set.size ? remap(set, tr) : set;
        for (const e of tr.effects) if (e.is(setAll)) set = build(tr.state.doc, e.value);
        return set;
      },
      provide: f => EditorView.decorations.from(f),
    });
    return field;
  }

  const lines = state => { const set = state.field(field, false); return set ? numbers(set, state.doc) : []; };
  // marksLive: the marks were put into doc.state (not a stale file before it is re-read, nor a locked note's placeholder).
  const linesOf = doc => doc.state && doc.marksLive ? lines(doc.state) : doc.marks || [];
  const effect = list => setAll.of(list);
  const withLines = (state, list) => state.update({ effects: setAll.of(list) }).state;

  function jump(view, dir) {
    const ls = lines(view.state);
    if (!ls.length) { StatusBar.msg(T("Tab này chưa có bookmark (Ctrl+F2 để đánh dấu dòng)."), "warn"); return; }
    const here = view.state.doc.lineAt(view.state.selection.main.head).number;
    const to = view.state.doc.line(dir > 0 ? ls.find(n => n > here) ?? ls[0] : [...ls].reverse().find(n => n < here) ?? ls[ls.length - 1]).from;
    view.dispatch({ selection: { anchor: to }, effects: CM.view.EditorView.scrollIntoView(to, { y: "center" }) });
  }

  return { extension, lines, linesOf, effect, withLines, jump };
})();
