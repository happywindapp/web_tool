// Convert pipeline: parse input (tolerant where possible) → value model → writer. Returns text + fixes (with lines) + notes.
const Convert = (() => {
  const EXT = { json: "json", js: "js", yaml: "yaml", xml: "xml", csv: "csv", tsv: "tsv", sql: "sql", markdown: "md", html: "html" };
  const DEFAULTS = { delimiter: "auto", header: true, infer: true, flatten: true, indent: "  ", root: "root", item: "item", attrPrefix: "@", table: "my_table", sqlDialect: "postgresql" };

  function read(text, from, o, notes) {
    if (from === "json") { const r = JsonTool.parse(text); return { value: Val.fromAst(r.ast, notes), fixes: r.fixes }; }
    if (from === "xml") { const r = XmlMap.fromXml(text, o); notes.push(...r.notes); return r; }
    if (from === "yaml") {
      let docs;
      try { docs = jsyaml.loadAll(TextUtil.stripBom(text), null, { schema: jsyaml.CORE_SCHEMA }); }
      catch (e) { const err = new Error(e.reason || e.message); err.line = e.mark ? e.mark.line + 1 : 0; err.col = e.mark ? e.mark.column + 1 : 0; throw err; }
      if (docs.length > 1) notes.push(T("Có {n} tài liệu YAML (ngăn bởi ---) → gộp thành một mảng", { n: docs.length }));
      return { value: docs.length === 1 ? Val.fromPlain(docs[0]) : docs.map(Val.fromPlain), fixes: [] };
    }
    const p = CsvTool.parse(text, from === "tsv" ? "\t" : o.delimiter === "auto" ? "" : o.delimiter);
    if (from === "csv" && o.delimiter === "auto") notes.push(T("Dấu phân cách tự nhận diện: {d}", { d: T(p.delimiterName) }));
    const t = TableShape.fromTable(p.rows, { header: o.header, infer: o.infer, unflatten: o.flatten });
    notes.push(...t.notes);
    return { value: t.value, fixes: p.fixes };
  }

  function write(value, to, o, notes) {
    if (to === "json") return Writers.json(value, o.indent);
    if (to === "js") return Writers.js(value, o.indent);
    if (to === "yaml") return Writers.yaml(value, o.indent, notes);
    if (to === "xml") { const r = XmlMap.toXml(value, { ...o, indent: o.indent || "  " }); notes.push(...r.notes); return r.text; }
    const t = TableShape.toTable(value, { flatten: o.flatten });
    notes.push(...t.notes);
    if (to === "csv") return Writers.csv(t, o.delimiter === "auto" ? "," : o.delimiter);
    if (to === "tsv") return Writers.csv(t, "\t");
    if (to === "markdown") return Writers.markdown(t);
    if (to === "html") return Writers.html(t, o.indent);
    return Writers.sql(t, o.table || "my_table", o.sqlDialect);
  }

  function run(text, from, to, opts = {}) {
    const o = { ...DEFAULTS, ...opts }, notes = [];
    const kind = from === "auto" ? Detect.data(text, o.fileName || "") : from;
    const { value, fixes } = read(text, kind, o, notes);
    return { out: write(value, to, o, notes), from: kind, fixes, notes };
  }

  return { run, EXT, FROM: ["json", "csv", "tsv", "xml", "yaml"] };
})();
