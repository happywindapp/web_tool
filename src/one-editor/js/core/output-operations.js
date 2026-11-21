// Operations that turn a tab's text into an output tab in the other view (OutputLink). live: re-run while the source is edited. Errors carry the 1-based source line.
// run(text, { lang, name, id, quiet }) → string | { text, fixes, notes } (or a Promise of it); lang: output language, or a function of the source context; live: bool or fn(output tab).
const OutputOps = (() => {
  function parseJson(text) {
    try { return JSON.parse(text); } catch (e) {
      const pos = /position (\d+)/.exec(e.message), lc = /line (\d+) column (\d+)/.exec(e.message);
      const line = pos ? TextUtil.lineCol(text, +pos[1]).line : lc ? +lc[1] : 0;
      throw Object.assign(new Error(T("JSON lỗi: {msg}", { msg: e.message })), { line });
    }
  }

  const FROM = { JSON: "json", YAML: "yaml", XML: "xml", CSV: "csv", TSV: "tsv" };
  function convert(text, c, to) {
    const r = Convert.run(text, FROM[c.lang] || "auto", to, { fileName: c.name });
    return { text: r.out.replace(/\n?$/, "\n"), fixes: r.fixes, notes: r.notes };
  }

  const baseName = name => (name || "").replace(/\s*⇢.*$/, "").replace(/\.[^.]*$/, "") || "Root";
  const types = lang => (t, c) => { const r = JsonTool.parse(t); return { text: TypeGen.generate(r.ast, lang, TypeGen.pascal(baseName(c.name))), fixes: r.fixes }; };
  const same = c => c.lang;
  const power = name => (t, c) => PowerTools.op(name)(t, c);

  const OPS = {
    "json-pretty": { label: "JSON đẹp", group: "Format", lang: "JSON", live: true, run: t => JSON.stringify(parseJson(t), null, 2) },
    "json-minify": { label: "JSON gọn 1 dòng", group: "Format", lang: "JSON", live: true, run: t => JSON.stringify(parseJson(t)) },
    "format": { label: "Format theo ngôn ngữ", group: "Format", lang: same, live: true, run: (t, c) => Formatter.format(t, c.lang) },
    "minify": { label: "Minify (JSON · XML · HTML · CSS)", group: "Format", lang: same, live: true, run: (t, c) => Formatter.minify(t, c.lang) },
    "to-json": { label: "→ JSON", group: "Chuyển đổi", lang: "JSON", live: true, run: (t, c) => convert(t, c, "json") },
    "to-yaml": { label: "→ YAML", group: "Chuyển đổi", lang: "YAML", live: true, run: (t, c) => convert(t, c, "yaml") },
    "to-xml": { label: "→ XML", group: "Chuyển đổi", lang: "XML", live: true, run: (t, c) => convert(t, c, "xml") },
    "to-csv": { label: "→ CSV", group: "Chuyển đổi", lang: "CSV", live: true, run: (t, c) => convert(t, c, "csv") },
    "html-to-md": { label: "HTML → Markdown", group: "Chuyển đổi", lang: "Markdown", live: true, run: t => HtmlToMd.convert(t) },
    "to-go": { label: "JSON → Go struct", group: "Sinh kiểu từ JSON", lang: "Go", live: true, run: types("go") },
    "to-ts": { label: "JSON → TypeScript interface", group: "Sinh kiểu từ JSON", lang: "TypeScript", live: true, run: types("ts") },
    "to-cs": { label: "JSON → C# class", group: "Sinh kiểu từ JSON", lang: "C#", live: true, run: types("cs") },
    "to-java": { label: "JSON → Java class", group: "Sinh kiểu từ JSON", lang: "Java", live: true, run: types("java") },
    "to-cpp": { label: "JSON → C++ struct", group: "Sinh kiểu từ JSON", lang: "C++", live: true, run: types("cpp") },
    "preview": { label: "Preview", group: "Preview", lang: same, live: true, preview: true, pane: true, run: (t, c) => PreviewRender.run(t, c) },
    // pane + text: the translation shows in a pane and also stays as the tab's text (export, copy, share).
    "translate": { label: "Dịch", group: "Dịch", lang: same, live: d => Translate.liveOn(d), pane: true, restore: d => Translate.restored(d), run: (t, c) => Translate.run(t, c) },
    "filter": { label: "Lọc dòng (log)", group: "Log", lang: same, live: true, pane: true, run: async (t, c) => { await DataOps.load(); return LineFilter.run(t, c); } },
    "fix-detail": { label: "FIX → Chi tiết message", group: "Log", lang: "JSON", live: true, pane: true, run: (t, c) => FixDetailOp.run(t, c) },
    "tree": { label: "Cây JSON / XML", group: "Dữ liệu", lang: "Plain Text", live: true, pane: true, run: (t, c) => DataOps.tree(t, c) },
    "query": { label: "Truy vấn JSONPath / XPath", group: "Dữ liệu", lang: "JSON", live: true, pane: true, run: (t, c) => DataOps.query(t, c) },
    "jwt": { label: "JWT decode (không kiểm chữ ký)", group: "Công cụ dev", lang: "JSON", live: true, pane: true, restore: d => DevReport.restore(d), run: t => DevReport.jwt(t) },
    "url-parts": { label: "URL → thành phần + bảng query", group: "Công cụ dev", lang: "JSON", live: true, pane: true, restore: d => DevReport.restore(d), run: t => DevReport.url(t) },
    "regex": { label: "Regex tester (cú pháp JavaScript)", group: "Công cụ dev", lang: "JSON", live: true, pane: true, run: power("regex") },
    "cron": { label: "Cron → giải thích + 10 lần chạy kế", group: "Công cụ dev", lang: "Markdown", live: true, run: power("cron") },
    "invisible": { label: "Tìm ký tự vô hình / chữ giống Latin", group: "Công cụ dev", lang: "Plain Text", live: true, pane: true, run: power("invisible") },
    "recipe": { label: "Recipe biến đổi (kiểu CyberChef)", group: "Công cụ dev", lang: "Plain Text", live: true, pane: true, run: power("recipe") },
    "sql-insert": { label: "CSV / JSON → SQL INSERT", group: "Chuyển đổi", lang: "SQL", live: true, run: power("sqlInsert") },
    "sql-update": { label: "CSV / JSON → SQL UPDATE … WHERE khoá", group: "Chuyển đổi", lang: "SQL", live: true, run: power("sqlUpdate") },
    "json-schema": { label: "JSON → JSON Schema (2020-12)", group: "Sinh kiểu từ JSON", lang: "JSON", live: true, run: power("schema") },
    "run-code": { label: "Chạy HTML / JS (sandbox)", group: "Chạy code", lang: "Plain Text", live: d => PowerTools.state(d.link.src, "run-code").live === true, pane: true, run: power("run") },
    "code-image": { label: "Code → ảnh (PNG / SVG)", group: "Xuất", lang: "SVG", live: true, pane: true, run: power("codeImage") },
  };

  const get = id => typeof id === "string" && Object.hasOwn(OPS, id) ? OPS[id] : null;
  const langOf = (op, ctx) => typeof op.lang === "function" ? op.lang(ctx) : op.lang;
  const isLive = (op, out) => typeof op.live === "function" ? !!op.live(out) : !!op.live;
  // Normalises any run() result to { text, fixes, notes } (+ view / error of a preview).
  async function exec(op, text, ctx) {
    const r = await op.run(text, ctx);
    return typeof r === "string" ? { text: r, fixes: [], notes: [] } : { fixes: [], notes: [], ...r };
  }

  return { get, ids: Object.keys(OPS), parseJson, langOf, isLive, exec, baseName };
})();
