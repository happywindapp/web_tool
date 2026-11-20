// Phase 8b data commands: tree / JSONPath · XPath query in the other view, Problems list, lint toggle, CSV align / shrink / open in Data Workbench.
function registerDataCommands(C, doc, hasDoc) {
  const csv = () => hasDoc() && ["CSV", "TSV"].includes(Docs.effectiveLang(Docs.root(doc())));
  const view = () => Views.activeView();
  function csvEdit(fn) {
    const v = view(), d = Docs.root(doc());
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return; }
    const text = v.state.doc.toString(), out = fn(text, RainbowCsv.delimOf(text, Docs.effectiveLang(d)));
    if (out !== text) v.dispatch({ changes: { from: 0, to: text.length, insert: out }, userEvent: "input.transform" });
  }
  function setLint(on) {
    CmSetup.settings.lint = !!on;
    Prefs.set("lint", !!on);
    Views.applySettings();
    StatusBar.msg(on ? T("Kiểm lỗi khi gõ (JSON · YAML · XML · HTML · CSS): bật.") : T("Kiểm lỗi khi gõ: tắt."));
  }

  C("dataTree", "Dữ liệu: cây JSON / XML ở view kia (bấm nút tới dòng, chép đường dẫn)", null, () => OutputLink.run(doc(), "tree"), hasDoc);
  C("dataQuery", "Dữ liệu: truy vấn JSONPath / XPath ở view kia", null, () => OutputLink.run(doc(), "query"), hasDoc);
  C("problems", "Lỗi: mở danh sách lỗi của tab (Problems)", "Ctrl+Shift+m", () => CM.lint.openLintPanel(view()), hasDoc);
  C("problemNext", "Lỗi: tới lỗi kế tiếp", "F8", () => CM.lint.nextDiagnostic(view()), hasDoc);
  C("problemPrev", "Lỗi: về lỗi trước", "Shift+F8", () => CM.lint.previousDiagnostic(view()), hasDoc);
  C("lint", "Bật / tắt kiểm lỗi khi gõ (JSON · YAML · XML · HTML · CSS)", null, () => setLint(!CmSetup.settings.lint));
  C("csvAlign", "CSV: căn thẳng cột (thêm dấu cách)", null, () => csvEdit(RainbowCsv.align), csv);
  C("csvShrink", "CSV: bỏ căn cột (xoá dấu cách quanh ô)", null, () => csvEdit(RainbowCsv.shrink), csv);
  C("csvGrid", "CSV: mở trong bảng của Data Workbench (tab mới)", null, () => RainbowCsv.openInWorkbench(Docs.root(doc())), csv);
}
