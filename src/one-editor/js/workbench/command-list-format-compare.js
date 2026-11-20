// Format / convert / compare commands (phase 2a). Alt+↑/↓ only act while comparing; otherwise CodeMirror moves the line.
function registerFormatCompareCommands(C, doc, hasDoc) {
  const F = FormatActions, cmp = () => Compare.active;
  const toOutput = op => () => OutputLink.run(doc(), op);

  C("formatOut", "✨ Format → tab kết quả ở view kia", null, toOutput("format"), hasDoc);
  C("formatHere", "Format tại chỗ", "Alt+Shift+f", () => F.inPlace(), hasDoc);
  C("minifyOut", "Minify → tab kết quả ở view kia", null, toOutput("minify"), hasDoc);
  for (const [v, label] of [["auto", "Format: thụt lề tự dò theo file"], ["2", "Format: thụt lề 2 dấu cách"], ["4", "Format: thụt lề 4 dấu cách"], ["tab", "Format: thụt lề bằng Tab"]])
    C("fmtIndent-" + v, label, null, () => F.setOpt("indent", v));
  C("fmtWidth", "Format: độ rộng dòng (print width)…", null, F.askWidth);
  for (const [k, name] of Object.entries(Formatter.SQL_DIALECTS)) C("sql-" + k, () => T("Format SQL theo dialect {name}", { name }), null, () => F.setOpt("sql", k));
  C("fmtOnSave", "Bật / tắt format khi lưu (JSON, XML, SQL, FIX, Prettier)", null, () => F.toggle("onSave"));
  C("fmtOnPaste", "Bật / tắt format khi dán", null, () => F.toggle("onPaste"));
  C("fixParser", "Mở tab này trong FIX Parser", null, () => F.openInFixParser(), () => hasDoc() && Docs.effectiveLang(Docs.root(doc())) === "FIX");
  for (const id of OutputOps.ids.filter(id => id.startsWith("to-") || id === "html-to-md")) C("op-" + id, () => T("Chuyển đổi: {op}", { op: T(OutputOps.get(id).label) }), null, toOutput(id), hasDoc);

  C("compare", "So sánh 2 view (bật / tắt)", null, Compare.toggle);
  C("cmpNext", "So sánh: tới khối khác kế tiếp", "Alt+ArrowDown", () => Compare.jump(1), cmp);
  C("cmpPrev", "So sánh: về khối khác trước", "Alt+ArrowUp", () => Compare.jump(-1), cmp);
  C("cmpCopy", "So sánh: chép khối ở con trỏ sang view kia", null, Compare.copyBlock, () => cmp() && !Compare.opt.inline);
  C("cmpWs", "So sánh: bỏ qua khoảng trắng (bật / tắt)", null, () => Compare.setOpt("ws"));
  C("cmpCase", "So sánh: bỏ qua hoa / thường (bật / tắt)", null, () => Compare.setOpt("case"));
  C("cmpInline", "So sánh: kiểu inline 1 cột (bật / tắt)", null, () => Compare.setOpt("inline"));
  C("cmpJson", "So sánh JSON theo cấu trúc (bỏ qua thứ tự key)", null, Compare.jsonTree);
}
