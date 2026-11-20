// Phase 8a commands: filter lines to the other view, follow a file (tail -f), open a FIX tab in FIX Parser.
function registerLogFixCommands(C, doc, hasDoc) {
  const fix = () => hasDoc() && Docs.effectiveLang(Docs.root(doc())) === "FIX";
  C("logFilter", "Log: lọc dòng (chuỗi / regex, giữ / loại, ngữ cảnh) ở view kia", "Ctrl+k f", () => OutputLink.run(doc(), "filter"), hasDoc);
  C("tail", "Theo dõi file đang mở (tail -f): bật / tắt", null, () => Tail.toggle(doc()), hasDoc);
  C("fixParser", "FIX: mở tab này trong FIX Parser (tab mới)", null, () => FixHover.openInParser(Docs.root(doc())), fix);
}
