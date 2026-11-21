// "fix-detail" op: FIX Parser's Message detail for a FIX tab; the pane lives in tools/one-editor-extras.js, loaded on first run.
const FixDetailOp = (() => {
  let ready = null;
  // Click / tap / arrow keys in the FIX tab: its detail pane shows the message on the cursor line.
  const follow = Dom.debounce((doc, st) => {
    const src = Docs.root(doc), out = Docs.list().find(d => d.kind === "output" && d.link?.src === src.id && d.link.op === "fix-detail");
    if (out) PreviewPane.viewOf(out.id)?.at?.(st.doc.lineAt(st.selection.main.head).number);
  }, 120);
  const load = () => ready ??= VendorPaths.load("extras").then(() => { PreviewPane.addView("fixdetail", PvFixDetail); Views.onCursor(follow); })
    .catch(e => { ready = null; throw new Error(T("Không nạp được Message detail FIX ({file}) — cần file này nằm cạnh one-editor.html.", { file: e.message })); });

  async function run(text, c) {
    if (!text.trim()) return { text: "", view: { kind: "fixdetail", empty: true } };
    await load();
    const st = Docs.get(c.id)?.state, line = st ? st.doc.lineAt(st.selection.main.head).number : 0;
    const r = FixDetailModel.build(text, line);
    return { text: r.text, notes: r.notes, view: { kind: "fixdetail", srcId: c.id, ...r } };
  }

  return { run };
})();
