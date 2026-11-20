// Replace in files: each target becomes an open tab first (folder files read from disk, closed notes reopened), then one undoable transaction — nothing is written to disk.
const FindReplace = (() => {
  const why = d => d.hex || d.big ? T("tab chỉ xem (hex / file lớn)") : d.stale ? T("chưa đọc lại từ đĩa — bấm vào tab để cấp quyền rồi thay lại")
    : d.readOnly ? T("tab chỉ đọc") : PreviewPane.isPreview(d) ? T("tab preview") : "";

  // Added to view gi without switching away from the tab the user is on; a stale tab is read again only if permission is still granted (no prompt after confirm()).
  async function docOf(g, gi) {
    if (g.doc && Docs.get(g.doc.id)) {
      if (Views.where(g.doc.id) < 0) Views.add(g.doc, gi);
      if (g.doc.stale) await FileOpen.reload(g.doc);
      return g.doc;
    }
    if (!g.node) throw new Error(T("tab đã đóng"));
    const { file, handle } = await g.node.read();
    return (g.doc = await FileOpen.open(file, handle, gi, false));
  }

  function apply(doc, changes) {
    const spec = { changes, userEvent: "input.replace.all" }, g = Views.groups.find(x => x.active === doc.id);
    if (g) { g.view.dispatch(spec); return; }
    const tr = Docs.ensureState(doc).update(spec);
    doc.state = tr.state;
    CloneSync.forward(doc, tr.changes, true);
    Docs.edited(doc, true);
  }

  // groups: Find in files results; matches are found again on the current text. → { replaced, files, skipped: ["name: reason"] }
  async function run(groups, re, text, regex) {
    const gi = Views.focused, out = { replaced: 0, files: 0, skipped: [] };
    for (const g of groups) {
      try {
        const doc = await docOf(g, gi), reason = doc ? why(doc) : T("không mở được");
        if (reason) { out.skipped.push(g.name + ": " + reason); continue; }
        const edits = FindCore.edits(Docs.text(doc), re, text, regex);
        if (!edits.length) { out.skipped.push(g.name + ": " + T("không còn kết quả (nội dung đã đổi)")); continue; }
        apply(doc, edits);
        out.replaced += edits.length;
        out.files++;
      } catch (e) { out.skipped.push(g.name + ": " + e.message); }
    }
    Views.renderAll();
    Explorer.render();
    return out;
  }

  return { run };
})();
