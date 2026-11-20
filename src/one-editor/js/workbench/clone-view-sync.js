// Clone view (same tab in two views): each copy keeps its own EditorState (cursor, scroll, folds) and every change is replayed on the others.
const CloneSync = (() => {
  let ann = null;
  const annotation = () => ann ??= CM.state.Annotation.define();

  // The byUser flag carried by a replayed update, or undefined when the update is an original edit.
  function replayed(u) {
    for (const tr of u.transactions) { const v = tr.annotation(annotation()); if (v !== undefined) return v; }
    return undefined;
  }

  function forward(doc, changes, byUser) {
    for (const peer of Docs.family(doc)) {
      if (peer === doc) continue;
      const g = Views.groups.find(x => x.active === peer.id), spec = { changes, annotations: annotation().of(byUser) };
      if (g) { g.view.dispatch(spec); continue; }
      if (peer.state) peer.state = peer.state.update(spec).state;
      else peer.text = changes.apply(CM.state.Text.of(peer.text.split("\n"))).toString();
      Docs.edited(peer, byUser);
    }
  }

  // Shows doc in view gi as a clone, or switches to the copy already there.
  function cloneTo(doc, gi) {
    const r = Docs.root(doc);
    if (r.stale) { StatusBar.msg(T("Đọc lại file từ đĩa trước khi mở thêm ở view khác."), "warn"); return; }
    if (PreviewPane.isPreview(r)) { StatusBar.msg(T("Tab preview không mở thêm ở view khác được — mở preview từ tab nguồn."), "warn"); return; }
    const there = Views.tabsOf(gi).map(Docs.get).find(d => d && Docs.root(d) === r);
    if (there) { Views.activate(gi, there.id); return; }
    Views.open(Docs.create({ kind: "clone", cloneOf: r.id, name: r.name, text: Docs.text(r), readOnly: r.readOnly }), gi);
    StatusBar.msg(T("Đã mở “{name}” thêm ở View {n} — sửa bên nào cũng là sửa cùng một tab.", { name: r.name, n: gi + 1 }), "good");
  }

  return { replayed, forward, cloneTo };
})();
