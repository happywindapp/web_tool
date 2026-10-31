const DbmlEngine = (() => {
  const keywords = new Set("Table table Ref ref Enum enum Project project TableGroup tablegroup TablePartial Note note indexes as pk primary key unique increment null not default delete update cascade headercolor".split(" "));

  async function ready() {
    await VendorScripts.load("dbml");
    await Graphviz.ready();
  }

  // Compiler positions are 0-based; EOF errors carry the end of the file.
  const lineOf = e => (e.nodeOrToken?.startPos?.line ?? -1) + 1;

  async function render(code, cfg) {
    const file = DbmlParse.DEFAULT_ENTRY, layout = new DbmlParse.MemoryProjectLayout();
    layout.setSource(file, code);
    const report = new DbmlParse.Compiler(layout).interpretFile(file), errors = report.getErrors();
    if (errors.length) {
      const sorted = [...errors].sort((a, b) => lineOf(a) - lineOf(b));
      throw new DiagramError(sorted.map(e => `${lineOf(e)}: ${e.diagnostic}`).join("\n"), { line: lineOf(sorted[0]), syntax: true });
    }
    const db = report.getValue();
    if (!db?.tables?.length) throw new DiagramError(T("Chưa có bảng nào (cần ít nhất 1 khối Table)."), { syntax: true, what: T("Chưa có bảng nào") });
    return { svg: Graphviz.svg(DbmlToDot.build(db, cfg)), type: T("{n} bảng", { n: db.tables.length }), bg: "#ffffff" };
  }

  return {
    id: "dbml", label: "DBML", lib: "DBML", ext: ".dbml", accept: ".dbml,.md,.txt", fence: "dbml",
    defaultConfig: "{}", comment: "//.*$", keywords,
    placeholder: "Gõ mã DBML, ví dụ: Table users {\n  id int [pk]\n}",
    get samples() { return DBML_SAMPLES; },
    firstSample: "shop",
    controls: [
      { key: "rankdir", title: "Hướng bố trí bảng", dflt: "LR", options: [["LR", "Trái → phải"], ["TB", "Trên → dưới"]] },
      { key: "fields", title: "Cột hiển thị trong mỗi bảng", dflt: "all", options: [["all", "Mọi cột"], ["keys", "Chỉ cột khoá"]] },
    ],
    ready, render,
  };
})();
