// Runs the "tree" and "query" ops once the data tools bundle is loaded: result tab text + pane model. JSON → JSONPath, XML / HTML → XPath.
const DataToolsOps = (() => {
  const MAX = 5000;

  function tree(text, ctx) {
    const m = DataTree.build(text, ctx.lang);
    if (!m.root) return { text: "", view: { kind: "tree", empty: true } };
    return { text: m.text, fixes: m.fixes, notes: m.notes, view: { kind: "tree", fmt: m.fmt, root: m.root, line: DataTree.lineIndex(TextUtil.stripBom(text)), srcId: ctx.id } };
  }

  function modeOf(text, lang) {
    if (DataTree.isMarkup(lang)) return lang === "HTML" ? "html" : "xml";
    if (lang === "JSON") return "json";
    if (lang !== "Plain Text") throw new Error(T("Cây / truy vấn chỉ dùng cho JSON, XML, HTML (tab này là {lang}).", { lang }));
    return text.trimStart()[0] === "<" ? "xml" : "json";
  }

  function query(text, ctx, q) {
    const mode = modeOf(text, ctx.lang), expr = (q || (mode === "json" ? "$.*" : "/*")).trim();
    const line = DataTree.lineIndex(TextUtil.stripBom(text));
    let res, fixes = [];
    if (mode === "json") {
      if (!expr.startsWith("$")) throw new Error(T("Tab JSON dùng JSONPath (bắt đầu bằng $), ví dụ $..price — XPath chỉ dùng cho XML / HTML."));
      const r = JsonTool.parse(text);
      fixes = r.fixes;
      const all = JsonPath.query(r.ast, expr, MAX + 1);
      const raw = n => { const s = JsonTool.stringify(n, ""); return s.length > 2000 ? s.slice(0, 2000) + "…" : s; };
      res = { total: all.length, results: all.slice(0, MAX).map(x => ({ path: JsonPath.pathText(x.path), value: raw(x.node), at: x.node.at })), more: all.length > MAX };
    } else res = XPathQuery.run(text, expr, mode === "html", MAX);
    const rows = res.results.map(x => ({ path: x.path, value: x.value, line: x.at === undefined ? 0 : line(x.at) }));
    const lang = mode === "json" ? "JSONPath" : "XPath", count = res.more ? MAX + "+" : res.total, NL = String.fromCharCode(10);
    // JSONPath values are raw JSON text (19-digit ids stay exact), XPath values are strings.
    const val = v => mode === "json" ? v : JSON.stringify(v);
    const out = "{" + NL + '  "query": ' + JSON.stringify(expr) + "," + NL + '  "lang": "' + lang + '",' + NL + '  "count": ' + JSON.stringify(count) + "," + NL + '  "results": ['
      + rows.map((r, i) => NL + '    { "path": ' + JSON.stringify(r.path) + ', "value": ' + val(r.value) + " }" + (i < rows.length - 1 ? "," : "")).join("") + NL + "  ]" + NL + "}" + NL;
    const notes = res.total > rows.length ? [T("Chỉ hiện {n} kết quả đầu.", { n: I18n.num(rows.length) })] : [];
    return { text: out, fixes, notes, view: { kind: "query", q: expr, lang, count, rows, srcId: ctx.id } };
  }

  return { tree, query };
})();
