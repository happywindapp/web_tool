// Syntax-check engines, no code is run: tree-sitter (Go · Java · Python), Prettier's Babel / TypeScript parsers, node-sql-parser per SQL dialect, Lezer trees. Each → [{ from, to, msg, sev }].
const SyntaxEngines = (() => {
  const SQL_DB = new Set(["transactsql", "postgresql", "mysql"]);
  const tsLangs = {}, sqlParsers = {};
  let tsParser = null;
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const parsers = () => VendorPaths.load("syntaxCheck").then(() => globalThis.SyntaxParsers);

  // The token at [from, to) (or the next word when empty), shortened for a message; "" at the end of the text.
  function tokenAt(text, from, to) {
    const s = (to > from ? text.slice(from, to) : text.slice(from).match(/^\s*([\w$@#]+|\S)/)?.[1] || "").split("\n")[0].trim();
    return s.length > 30 ? s.slice(0, 30) + "…" : s;
  }
  function near(text, from, to) {
    const tok = tokenAt(text, from, to);
    return tok ? T("Lỗi cú pháp gần “{tok}”", { tok }) : T("Hết file mà còn khối / ngoặc chưa đóng");
  }

  function lezer(tree, text) {
    const out = [];
    tree.iterate({ enter: n => { if (!n.type.isError) return; out.push({ from: n.from, to: n.to, msg: near(text, n.from, n.to), sev: "error" }); return false; } });
    return out;
  }

  async function treeSitter(text, key) {
    const P = await parsers();
    // A failed WASM compile aborts inside emscripten and the cached init promise never settles: onAbort turns it into a rejection.
    tsParser ??= new Promise((ok, no) => P.TreeSitter.init({ wasmBinary: b64(P.wasm.runtime), onAbort: e => no(new Error(String(e))) }).then(ok, no)).then(() => new P.TreeSitter());
    const parser = await tsParser;
    tsLangs[key] ??= P.TreeSitter.Language.load(b64(P.wasm[key])).catch(e => { delete tsLangs[key]; throw e; });
    parser.setLanguage(await tsLangs[key]);
    const tree = parser.parse(text), out = [];
    const walk = nodes => {
      for (const c of nodes) {
        if (c.isMissing) out.push({ from: c.startIndex, to: c.startIndex, msg: T("Thiếu “{tok}”", { tok: c.type }), sev: "error" });
        else if (c.type === "ERROR") out.push({ from: c.startIndex, to: c.endIndex, msg: near(text, c.startIndex, c.endIndex), sev: "error" });
        else if (c.hasError) walk(c.children);
      }
    };
    // The root itself is an ERROR node when the parser could not recover at all.
    try { if (tree.rootNode.hasError) walk([tree.rootNode]); } finally { tree.delete(); }
    return out;
  }

  // Babel / TypeScript stop at the first error: one diagnostic with Prettier's own message.
  async function prettier(text, lang) {
    const name = lang === "TypeScript" || lang === "TSX" ? "typescript" : "babel";
    await VendorPaths.load("prettier-" + name);
    try { await globalThis.prettierPlugins[name].parsers[name].parse(text, { filepath: lang === "TSX" ? "a.tsx" : lang === "JSX" ? "a.jsx" : "" }); return []; }
    catch (e) {
      const at = e.loc?.start;
      if (!at) throw e;
      return [{ line: at.line, col: at.column, msg: String(e.message).split("\n")[0].replace(/\s*\(\d+:\d+\)\s*$/, ""), sev: "error" }];
    }
  }

  const COMMENTS_ONLY = /^(?:\s|--[^\n]*|\/\*[\s\S]*?\*\/)*$/;
  // Statements only (SELECT / DML / DDL): procedural blocks are often not understood, so findings are warnings. T-SQL is checked per GO batch.
  async function sql(text, db) {
    const P = await parsers();
    sqlParsers[db] ??= new P.sql[db]();
    const batches = [], dialect = Formatter.SQL_DIALECTS[db];
    if (db === "transactsql") {
      let from = 0;
      for (const m of text.matchAll(/^[ \t]*GO[ \t]*(?:\d+[ \t]*)?$/gim)) { batches.push([from, m.index]); from = m.index + m[0].length; }
      batches.push([from, text.length]);
    } else batches.push([0, text.length]);
    const out = [];
    for (const [from, to] of batches) {
      const part = text.slice(from, to);
      if (COMMENTS_ONLY.test(part)) continue;
      try { sqlParsers[db].astify(part, { database: db }); }
      catch (e) {
        const at = e.location?.start;
        if (!at) throw e;
        // node-sql-parser trims leading whitespace before it counts offsets.
        const off = part.length - part.trimStart().length + at.offset, pos = from + off, tok = tokenAt(part, off, off);
        const msg = tok ? T("SQL ({dialect}): không hiểu “{tok}” ở đây", { dialect, tok }) : T("SQL ({dialect}): câu lệnh kết thúc giữa chừng", { dialect });
        out.push({ from: pos, to: pos, msg, sev: "warning" });
      }
    }
    return out;
  }

  async function lezerByLang(text, lang) {
    const support = await LangLoader.support(lang);
    if (!support) throw new Error(T("Không nạp được bộ phân tích cú pháp {lang}.", { lang }));
    return lezer(support.language.parser.parse(text), text);
  }

  const sqlDb = () => SQL_DB.has(Formatter.opts.sql) ? Formatter.opts.sql : "";
  return { treeSitter, prettier, sql, lezerByLang, sqlDb };
})();
