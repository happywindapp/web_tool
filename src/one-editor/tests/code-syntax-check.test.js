// Run: node --test src/one-editor/tests/code-syntax-check.test.js — real parsers (tools/vendor syntax-check bundle + Prettier plugins) in a vm.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const tools = path.join(root, "..", "..", "tools");
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, atob, WebAssembly, console, TextDecoder, TextEncoder, performance });
ctx.globalThis = ctx;
const PATHS = vm.runInNewContext(fs.readFileSync(path.join(root, "js/core/one-editor-vendor-paths.js"), "utf8") + ";VendorPaths.PATHS");
ctx.VendorPaths = { load: async name => { if (!ctx["loaded " + name]) { vm.runInContext(fs.readFileSync(path.join(tools, PATHS[name]), "utf8"), ctx); ctx["loaded " + name] = true; } } };
ctx.Formatter = { opts: { sql: "transactsql" }, SQL_DIALECTS: { transactsql: "T-SQL", postgresql: "PostgreSQL", mysql: "MySQL", plsql: "PL/SQL" } };
ctx.LangLoader = { support: async () => null };
vm.runInContext(["js/editor/code-syntax-check-engines.js", "js/editor/code-syntax-lint.js"].map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.CodeLint = CodeLint;", ctx);
const { CodeLint } = ctx;
const VN = "// Tính tổng — chú thích tiếng Việt trước lỗi\n";
const brief = r => JSON.parse(JSON.stringify(r.items.map(x => `${x.line}:${x.col} ${x.msg}`)));

test("tree-sitter: valid code is clean, a missing bracket is named with the right line:col after Vietnamese text", async () => {
  assert.deepEqual(brief(await CodeLint.check("package main\n" + VN + "func f(x int) int {\n\treturn x\n}\n", "Go")), []);
  const r = await CodeLint.check("package main\n" + VN + "func f(x int) int {\n\tif x > 0 {\n\t\tprintln(x\n\t}\n\treturn x\n}\n", "Go");
  assert.equal(r.engine, "tree-sitter");
  assert.deepEqual(brief(r), ["5:12 Thiếu “)”"]);
  assert.deepEqual(brief(await CodeLint.check("package main\nfunc f(x int) int {\n\tprintln(x\n\treturn x\n}\n", "Go")), ["3:9 Lỗi cú pháp gần “(x”"]);
  assert.deepEqual(brief(await CodeLint.check("class A {\n  void f() { int y = 1\n  }\n}\n", "Java")), ["2:23 Thiếu “;”"]);
  assert.equal((await CodeLint.check("def f(x)\n    return x\n", "Python")).items[0].line, 1);
  assert.deepEqual(brief(await CodeLint.check("  \n", "Go")), [], "blank text is not parsed");
  for (const [lang, text] of [["Java", "class A { void f() { g(h(i(j(k(l(m(n(o(p(q(r(s(t(u(v(w(x(y(z(1"], ["Python", "x = f(g(h(i(j(k(l(m(n(o(p(q(r(s(t(u(1"], ["Go", "package main\nvar x = " + "(".repeat(30)]])
    assert.ok((await CodeLint.check(text, lang)).items.length > 0, lang + ": an unrecoverable parse (root ERROR node) still reports");
});

test("Prettier parsers: Babel for JS, TypeScript for TS; TS above 100 KB falls back to Lezer", async () => {
  assert.deepEqual(brief(await CodeLint.check(VN + "const f = x => x * 2;\n", "JavaScript")), []);
  const js = await CodeLint.check(VN + "function f(x) {\n  if (x > 0 { return x; }\n}\n", "JavaScript");
  assert.equal(js.engine, "Prettier · Babel");
  assert.equal(js.items.length, 1);
  assert.deepEqual([js.items[0].line, js.items[0].col], [3, 13], "Prettier columns are 1-based");
  assert.match(js.items[0].msg, /expected "\)"/);
  assert.deepEqual(brief(await CodeLint.check("interface U { id: number }\nconst f = (u: U): number => u.id;\n", "TypeScript")), []);
  assert.equal((await CodeLint.check("let x: = 1;\n", "TypeScript")).items.length, 1);
  await assert.rejects(CodeLint.check("let x = 1;\n".repeat(11000), "TypeScript"), /Không nạp được bộ phân tích cú pháp TypeScript/, "big TS goes to Lezer (stubbed out here)");
});

test("SQL follows the dialect of the SQL options; T-SQL syntax is rejected by MySQL / PostgreSQL", async () => {
  const tsql = "SELECT TOP 10 [a].[Id] FROM dbo.[Account] a WITH (NOLOCK) WHERE a.Code = N'X'\n";
  assert.deepEqual(brief(await CodeLint.check(tsql, "SQL")), []);
  const bad = await CodeLint.check("SELECT a, b FROM t WHERE (a > 1 ORDER BY b\n", "SQL");
  assert.equal(bad.engine, "node-sql-parser · T-SQL");
  assert.deepEqual(brief(bad), ["1:33 SQL (T-SQL): không hiểu “ORDER” ở đây"]);
  assert.equal(bad.items[0].sev, "warning", "procedural SQL is often not understood: warnings, not errors");
  try {
    for (const db of ["mysql", "postgresql"]) {
      ctx.Formatter.opts.sql = db;
      assert.equal((await CodeLint.check(tsql, "SQL")).items.length, 1, db);
    }
    ctx.Formatter.opts.sql = "postgresql";
    assert.deepEqual(brief(await CodeLint.check("SELECT a.id, a.data->>'name' FROM account a WHERE a.code ILIKE 'x%' LIMIT 10\n", "SQL")), []);
    ctx.Formatter.opts.sql = "plsql";
    await assert.rejects(CodeLint.check("SELECT 1 FROM dual", "SQL"), /Không nạp được bộ phân tích cú pháp SQL/, "PL/SQL goes to Lezer (stubbed out here)");
    assert.equal(CodeLint.lives("SQL", 10), false, "no live check for PL/SQL: Format errors keep their own marks");
  } finally { ctx.Formatter.opts.sql = "transactsql"; }
  assert.deepEqual(brief(await CodeLint.check("SELECT 1 FROM t WHERE (a = 1\n", "SQL")), ["1:29 SQL (T-SQL): câu lệnh kết thúc giữa chừng"]);
  assert.deepEqual(brief(await CodeLint.check("-- just a comment\n/* and a block */\n", "SQL")), [], "comments only is clean");
  assert.deepEqual(brief(await CodeLint.check("SELECT 1\nGO\nSELECT 2\ngo 3\nSELECT a FROM t WHERE (a = 1\nGO\n", "SQL")), ["5:29 SQL (T-SQL): câu lệnh kết thúc giữa chừng"], "T-SQL is checked per GO batch, positions stay in the whole text");
  assert.deepEqual(brief(await CodeLint.check("\n\n  SELECT TOP 1 x FROM t WHERE ([a] = 1 ORDER BY x\n", "SQL")), ["3:40 SQL (T-SQL): không hiểu “ORDER” ở đây"], "leading blank lines do not shift the position");
  assert.equal(CodeLint.lives("Go", CodeLint.LIVE_MAX + 1), false);
  assert.equal(CodeLint.lives("Go", 100), true);
});

test("unsupported languages say which ones are supported; every underline stays on its line", async () => {
  await assert.rejects(CodeLint.check("class A {}", "C#"), /Chưa kiểm cú pháp được C# — hỗ trợ: Go, Java, Python/);
  const r = await CodeLint.check("package main\nfunc f() {\n\tx := (1 +\n\n}\n", "Go");
  const text = "package main\nfunc f() {\n\tx := (1 +\n\n}\n";
  for (const x of r.items) assert.ok(!text.slice(x.from, x.to).includes("\n"), JSON.stringify(x));
});
