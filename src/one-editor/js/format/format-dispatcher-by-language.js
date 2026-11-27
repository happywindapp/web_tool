// Format by language in 3 tiers: (1) JSON/XML tolerant + sql-formatter + FIX, (2) Prettier with plugins loaded per language or gofmt / clang-format / ruff, (3) re-indent from the syntax tree + trim line ends.
const Formatter = (() => {
  const PRETTIER = {
    JavaScript: ["babel", "babel estree"], JSX: ["babel", "babel estree"], TypeScript: ["typescript", "typescript estree"], TSX: ["typescript", "typescript estree"],
    CSS: ["css", "postcss"], SCSS: ["scss", "postcss"], LESS: ["less", "postcss"], HTML: ["html", "html postcss babel estree"],
    Vue: ["vue", "html postcss babel estree typescript"], Markdown: ["markdown", "markdown"], YAML: ["yaml", "yaml"], GraphQL: ["graphql", "graphql"],
  };
  const SQL_DIALECTS = { transactsql: "T-SQL", postgresql: "PostgreSQL", mysql: "MySQL", plsql: "PL/SQL" };
  const CF = "clang-format", WASM = { Go: "gofmt", C: CF, "C++": CF, Java: CF, "C#": CF, ProtoBuf: CF, Python: "ruff" };
  const CLANG_STYLES = ["LLVM", "Google", "Chromium", "Mozilla", "WebKit", "Microsoft"];
  // Indentation carries meaning there: re-indenting could change the program.
  const INDENT_SENSITIVE = new Set(["Python"]);
  const opts = { indent: "auto", width: 80, sql: "transactsql", clang: "LLVM", pyWidth: 88, pyQuote: "double" };
  const SOH = String.fromCharCode(1), TAB = String.fromCharCode(9);

  const tier = lang => ["JSON", "XML", "SQL", "FIX"].includes(lang) ? 1 : Object.hasOwn(PRETTIER, lang) || Object.hasOwn(WASM, lang) ? 2 : 3;
  const trimEnds = s => s.replace(/[ \t]+$/gm, "");
  // Go is always tab-indented (gofmt), whatever the file currently uses.
  const unitOf = (text, lang, o) => o.indent === "tab" || (o.indent === "auto" && lang === "Go") ? TAB : o.indent === "auto" ? LangDetect.indentOf(text) : " ".repeat(+o.indent || 2);
  // Options from a share link: known keys of the same type; a huge indent would build a giant string.
  const known = x => Object.fromEntries(Object.entries(Object(x)).filter(([k, v]) => Object.hasOwn(opts, k) && typeof v === typeof opts[k] && (k !== "sql" || Object.hasOwn(SQL_DIALECTS, v)) && (k !== "indent" || /^(auto|tab|[1-8])$/.test(v))));
  const width = unit => unit === TAB ? 4 : unit.length;
  const located = (msg, line, col) => Object.assign(new Error(msg), { line: line || 0, col: col || 0 });

  // FIX: one tag=value per line (SOH or "|" separated), a blank line between messages, other lines untouched.
  function fixLines(text) {
    const out = text.split("\n").map(line => {
      const sep = line.includes(SOH) ? SOH : /\|\d+=/.test(line) && /(^|\|)8=FIX/.test(line) ? "|" : "";
      if (!sep) return line;
      const at = line.search(/(^|[^\d])8=FIX/), cut = at > 0 ? at + 1 : 0;
      const head = line.slice(0, cut).trimEnd(), tags = line.slice(cut).split(sep).filter(t => t.trim());
      return (head ? head + "\n" : "") + tags.map((t, i) => (i && /^8=FIX/.test(t) ? "\n" : "") + t).join("\n") + "\n";
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  }

  function json(text, unit) {
    const r = JsonTool.parse(text);
    return { text: JsonTool.stringify(r.ast, unit) + "\n", fixes: r.fixes };
  }

  function xml(text, unit) {
    const r = MarkupTool.build(text, false);
    return { text: MarkupTool.serialize(r.root, unit, false) + "\n", fixes: r.fixes };
  }

  async function sql(text, unit, o) {
    await VendorPaths.load("sqlFormatter");
    try { return { text: globalThis.sqlFormatter.format(text, { language: o.sql, tabWidth: width(unit), useTabs: unit === TAB }) + "\n" }; }
    catch (e) { const m = /line (\d+)(?:,? column (\d+))?/i.exec(e.message); throw located(T("SQL lỗi ({dialect}): {msg}", { dialect: SQL_DIALECTS[o.sql], msg: e.message.split("\n")[0] }), m && +m[1], m && +m[2]); }
  }

  // WasmFmt (extras): a failure falls back to reindent and says why.
  async function wasm(text, lang, unit, o) {
    const engine = WASM[lang];
    let r;
    try { await PowerTools.load(); r = await WasmFmt.format(text, lang, engine, o); }
    catch (e) { const x = await reindent(text, lang, unit); return { ...x, fallback: true, notes: [T("Không chạy được {engine}: {msg}", { engine, msg: e.message.replace(/\.?$/, ".") }), ...x.notes] }; }
    if (r.error) throw located(T("{lang} lỗi cú pháp: {msg}", { lang, msg: r.error.msg }), r.error.line, r.error.col);
    return r;
  }

  async function prettier(text, lang, unit, o) {
    const [parser, list] = PRETTIER[lang], names = list.split(" ");
    await VendorPaths.load("prettier");
    await Promise.all(names.map(p => VendorPaths.load("prettier-" + p)));
    try {
      return { text: await globalThis.prettier.format(text, { parser, plugins: names.map(p => globalThis.prettierPlugins[p]), useTabs: unit === TAB, tabWidth: width(unit), printWidth: o.width }) };
    } catch (e) {
      const at = e.loc && e.loc.start;
      throw located(T("{lang} lỗi cú pháp: {msg}", { lang, msg: String(e.message).split("\n")[0] }), at && at.line, at && at.column);
    }
  }

  async function reindent(text, lang, unit) {
    const support = INDENT_SENSITIVE.has(lang) ? null : await LangLoader.support(lang).catch(() => null);
    if (!support) return { text: trimEnds(text), notes: [T("{lang}: chỉ xoá khoảng trắng cuối dòng (không có bộ căn lề an toàn).", { lang })] };
    const L = CM.language, S = CM.state.EditorState;
    const st = S.create({ doc: text, extensions: [support, L.indentUnit.of(unit), S.tabSize.of(width(unit))] });
    L.ensureSyntaxTree(st, st.doc.length, 5000);
    const out = st.update({ changes: L.indentRange(st, 0, st.doc.length) }).state.doc.toString();
    return { text: trimEnds(out), notes: [T("{lang}: chỉ căn lề lại theo cú pháp + xoá khoảng trắng cuối dòng.", { lang })] };
  }

  // → { text, fixes: [{line, col, msg}], notes, tier }; throws an Error with .line/.col on a syntax error (the text is never half-changed).
  async function format(text, lang, linkOpts) {
    const o = linkOpts ? { ...opts, ...known(linkOpts) } : opts, unit = unitOf(text, lang, o), base = { fixes: [], notes: [], tier: tier(lang) };
    if (!text.trim()) return { ...base, text };
    if (lang === "JSON") return { ...base, ...json(text, unit) };
    if (lang === "XML") return { ...base, ...xml(text, unit) };
    if (lang === "SQL") return { ...base, ...await sql(text, unit, o) };
    if (lang === "FIX") return { ...base, text: fixLines(text) };
    if (Object.hasOwn(PRETTIER, lang)) return { ...base, ...await prettier(text, lang, unit, o) };
    if (Object.hasOwn(WASM, lang)) return { ...base, ...await wasm(text, lang, unit, o) };
    return { ...base, ...await reindent(text, lang, unit) };
  }

  function minify(text, lang) {
    if (lang === "JSON") { const r = JsonTool.parse(text); return { text: JsonTool.stringify(r.ast, ""), fixes: r.fixes }; }
    if (lang === "XML" || lang === "HTML") { const r = MarkupTool.build(text, lang === "HTML"); return { text: MarkupTool.minify(r.root, lang === "HTML"), fixes: r.fixes }; }
    if (lang === "CSS") return { text: CssMin.minify(text).text };
    throw new Error(T("Minify chỉ dùng cho JSON, XML, HTML, CSS (tab này: {lang}).", { lang }));
  }

  return { format, minify, fixLines, tier, opts, SQL_DIALECTS, PRETTIER, CLANG_STYLES };
})();
