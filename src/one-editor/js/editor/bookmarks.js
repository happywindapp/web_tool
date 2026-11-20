// Notepad++ bookmarks: Ctrl+F2 toggles the current line, F2 / Shift+F2 jump to the next / previous one (wrapping); kept per tab in a StateField that follows edits.
const Bookmarks = (() => {
  let field = null, toggle = null, clearAll = null, mark = null;

  // Built on first use: CodeMirror is only loaded at boot.
  function extension() {
    if (field) return field;
    const { StateField, StateEffect } = CM.state, { Decoration, EditorView } = CM.view;
    toggle = StateEffect.define({ map: (pos, m) => m.mapPos(pos) });
    clearAll = StateEffect.define();
    mark = Decoration.line({ class: "cm-bookmark" });
    field = StateField.define({
      create: () => Decoration.none,
      update(set, tr) {
        set = set.map(tr.changes);
        for (const e of tr.effects) {
          if (e.is(clearAll)) set = Decoration.none;
          else if (e.is(toggle)) {
            let has = false;
            set.between(e.value, e.value, from => { if (from === e.value) has = true; });
            set = has ? set.update({ filter: from => from !== e.value }) : set.update({ add: [mark.range(e.value)], sort: true });
          }
        }
        return set;
      },
      provide: f => EditorView.decorations.from(f),
    });
    return field;
  }

  function positions(state) {
    const out = [], set = state.field(field, false);
    if (set) set.between(0, state.doc.length, from => { out.push(from); });
    return out;
  }

  function toggleLine(view) {
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    view.dispatch({ effects: toggle.of(line.from) });
  }

  function jump(view, dir) {
    const ps = positions(view.state);
    if (!ps.length) { StatusBar.msg(T("Tab này chưa có bookmark (Ctrl+F2 để đánh dấu dòng)."), "warn"); return; }
    const here = view.state.doc.lineAt(view.state.selection.main.head).from;
    const to = dir > 0 ? ps.find(p => p > here) ?? ps[0] : [...ps].reverse().find(p => p < here) ?? ps[ps.length - 1];
    view.dispatch({ selection: { anchor: to }, effects: CM.view.EditorView.scrollIntoView(to, { y: "center" }) });
  }

  const clear = view => view.dispatch({ effects: clearAll.of(null) });
  return { extension, toggleLine, jump, clear, positions };
})();
