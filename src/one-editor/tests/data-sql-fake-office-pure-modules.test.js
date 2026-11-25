// Run: node --test src/one-editor/tests/data-sql-fake-office-pure-modules.test.js — phase 14b: SqlTabsPure, the SQL / xlsx worker handlers on the real vendored sql.js + SheetJS, FakeData.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const libs = path.join(root, "../../tools/" + "vendor");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const ctx = vm.createContext({ atob, btoa, WebAssembly, TextDecoder, TextEncoder, setTimeout, clearTimeout });
ctx.globalThis = ctx;
ctx.self = ctx;
vm.runInContext(["js/extras/sql-on-tabs-pure.js", "js/extras/fake-data-from-json-schema-pure.js"].map(read).join("\n;\n")
  + "\n;Object.assign(globalThis, { SqlTabsPure, FakeData, sqlTabsPureFactory });", ctx);
const { SqlTabsPure: S, FakeData: F } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));

// The worker handler factories run as the worker would: libraries on self, then "(" + fn + ")()".
function worker(file, fnName, lib, libFile) {
  vm.runInContext(fs.readFileSync(path.join(libs, libFile), "utf8"), ctx);
  ctx[lib] = ctx.OEWorkerLibs[lib]();
  const src = read(file), at = src.indexOf("function " + fnName), end = src.indexOf("\n}\n", at);
  return vm.runInContext("(" + src.slice(at, end + 2) + ")()", ctx);
}

test("SqlTabsPure: CSV parse, types, JSON arrays, names", () => {
  assert.deepEqual(plain(S.parseCsv('a,b\r\n"x, ""y""",2\n"multi\nline",\n', ",")), [["a", "b"], ['x, "y"', "2"], ["multi\nline", ""]]);
  assert.equal(S.sniff("a;b;c\n1;2;3", "CSV"), ";");
  assert.equal(S.sniff("a,b", "TSV"), "\t");
  const t = S.readTable("id,code,qty,note\n1,007,12.5,\n2,ABC,1234567890123456,x\n", "CSV");
  assert.deepEqual(plain(t.cols), ["id", "code", "qty", "note"]);
  assert.deepEqual(plain(t.rows[0]), [1, "007", 12.5, null], "007 stays text, empty is NULL");
  assert.equal(t.rows[1][2], "1234567890123456", "16 digits stay text");
  const j = S.readTable('[{"a":1,"b":{"x":1}},{"c":true}]', "JSON");
  assert.deepEqual(plain(j.cols), ["a", "b", "c"]);
  assert.deepEqual(plain(j.rows), [[1, '{"x":1}', null], [null, null, 1]]);
  assert.throws(() => S.readTable('{"a":1}', "JSON"), /array of objects/);
  assert.deepEqual(plain(S.tableNames(["orders.csv", "Orders.json", "2026 trades.tsv", "a ⇢ SQL", ""])), ["orders", "Orders_2", "t_2026_trades", "a", "tab"]);
  assert.deepEqual(plain(S.readTable("a,a,\n1,2,3\n", "CSV").cols), ["a", "a_2", "col3"]);
});

test("SqlTabsPure: error position, CSV / JSON out, hash", () => {
  assert.deepEqual(plain(S.errorAt("SELECT *\nFRM orders", 'near "FRM": syntax error')), { line: 2, col: 1 });
  assert.deepEqual(plain(S.errorAt("select x from orders", "no such column: x")), { line: 1, col: 8 });
  assert.deepEqual(plain(S.errorAt("select 1", "out of memory")), { line: 0, col: 0 });
  assert.equal(S.toCsv(["a", "b"], [[1, 'x,"y"'], [null, " lead"]]), 'a,b\n1,"x,""y"""\n," lead"\n');
  assert.deepEqual(JSON.parse(S.toJson(["a"], [[1], [null]])), [{ a: 1 }, { a: null }]);
  assert.notEqual(S.hash("abc"), S.hash("abd"));
  assert.equal(S.hash("abc"), S.hash("abc"));
});

test("SQL worker handlers on real sql.js: tables, JOIN, writes in RAM, errors, .db bytes", async () => {
  const H = worker("js/extras/sql-on-tabs-op-and-worker.js", "sqlWorkerHandlers", "sqljs", "sqljs-1.16.0/sql-wasm-base64.js");
  const orders = "id,cust,qty\n1,C1,5\n2,C2,7\n3,C1,1\n", custs = "cust,name,acct\nC1,Alex,007\nC2,Blair,008\n";
  const s = await H.tables({ list: [{ name: "orders", tab: "orders.csv", lang: "CSV", text: orders }, { name: "custs", tab: "c.csv", lang: "CSV", text: custs }] });
  assert.deepEqual(plain(s.schema.map(t => [t.name, t.count])), [["custs", 2], ["orders", 3]]);
  const r = H.query({ sql: "SELECT c.name, SUM(o.qty) q, typeof(c.acct) t FROM orders o JOIN custs c USING (cust) GROUP BY c.name ORDER BY q DESC", show: 10, textRows: 10 });
  assert.deepEqual(plain(r.rows), [["Alex", 6, "text"], ["Blair", 7, "text"]].sort((a, b) => b[1] - a[1]));
  assert.match(r.csv, /^name,q,t\n/);
  const w = H.query({ sql: "DELETE FROM orders WHERE cust = 'C1'; SELECT count(*) FROM orders", show: 10, textRows: 10 });
  assert.equal(w.statements, 2);
  assert.equal(w.rows[0][0], 1, "writes change the copy in RAM");
  assert.throws(() => H.query({ sql: "SELEC 1", show: 1, textRows: 1 }), /syntax error/);
  // Unchanged text keeps the table (the delete stays); changed text reloads it.
  await H.tables({ list: [{ name: "orders", tab: "orders.csv", lang: "CSV", text: orders }] });
  assert.equal(H.query({ sql: "SELECT count(*) FROM orders", show: 1, textRows: 1 }).rows[0][0], 1);
  assert.equal(H.query({ sql: "SELECT count(*) FROM sqlite_master WHERE name = 'custs'", show: 1, textRows: 1 }).rows[0][0], 0, "a closed tab's table is dropped");
  await H.tables({ list: [{ name: "orders", tab: "orders.csv", lang: "CSV", text: orders + "4,C2,9\n" }] });
  assert.equal(H.query({ sql: "SELECT count(*) FROM orders", show: 1, textRows: 1 }).rows[0][0], 4);
  const big = H.query({ sql: "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2500) SELECT i FROM n", show: 1000, textRows: 2000 });
  assert.equal(big.total, 2500);
  assert.equal(big.rows.length, 1000);
  assert.equal(big.csv.trim().split("\n").length, 2001);
  assert.equal(JSON.parse(H.export({ format: "json" })).length, 2500);
  const broken = await H.tables({ list: [{ name: "orders", tab: "orders.json", lang: "JSON", text: '[{"id":1}' }] });
  assert.equal(broken.errors.length, 1);
  assert.equal(broken.schema.length, 0, "a tab that no longer parses leaves no stale table");
  assert.throws(() => H.export({ format: "csv", src: "other" }), /no result/);
  const demo = await H.demo();
  const bytes = demo.$value;
  assert.equal(Buffer.from(bytes.slice(0, 15)).toString(), "SQLite format 3");
  const d = await H.database({ key: "k1", bytes });
  assert.deepEqual(plain(d.schema.map(t => t.type + ":" + t.name)), ["table:accounts", "table:trades", "view:position"]);
  assert.equal(H.query({ sql: "SELECT count(*) FROM trades", show: 1, textRows: 1 }).rows[0][0], 60);
  assert.equal((await H.database({ key: "k1" })).schema.length, 3, "same key: no bytes needed");
  await assert.rejects(H.database({ key: "k2" }), /reload/);
});

test("xlsx worker handlers on real SheetJS mini: demo workbook, sheets, filter, csv / tsv", () => {
  const H = worker("js/extras/office-xlsx-docx-viewer.js", "xlsxWorkerHandlers", "sheetjs", "sheetjs-mini-0.20.3/xlsx-mini.js");
  const bytes = H.demo().$value;
  const list = H.open({ key: "x", bytes });
  assert.deepEqual(plain(list.map(s => s.name)), ["Trades", "Symbols", "Accounts"]);
  const v = H.view({ name: "Trades", filter: "", show: 10, csv: 5 });
  assert.equal(v.total, 41);
  assert.equal(v.rows.length, 10);
  assert.equal(v.csv.trim().split("\n").length, 5);
  const f = H.view({ name: "Trades", filter: "sell", show: 100, csv: 0 });
  assert.ok(f.matched > 0 && f.matched < 41 && f.rows.every(r => r.includes("SELL")));
  assert.equal(H.view({ name: "Accounts", filter: "", show: 9, csv: 0 }).rows[3][2], "=no formulas are run");
  assert.match(H.csv({ name: "Symbols" }), /^Symbol,Name,Board\nACME,/);
  assert.equal(H.tsv({ name: "Trades", filter: "T00001" }).split("\n")[0].split("\t")[0], "T00001");
  assert.throws(() => H.open({ key: "other" }), /reload/);
});

test("FakeData: schema rows are seeded, typed and follow the constraints", () => {
  const schema = { type: "object", required: ["id", "acct", "side", "qty", "sym"], properties: {
    id: { type: "string", format: "uuid" }, acct: { type: "string", pattern: "^DEMO[0-9]{6}$" }, side: { enum: ["BUY", "SELL"] },
    qty: { type: "integer", minimum: 100, maximum: 1000, multipleOf: 100 }, px: { type: "number", exclusiveMinimum: 0, maximum: 10 },
    sym: { $ref: "#/$defs/sym" }, tags: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 2 }, when: { type: "string", format: "date-time" } },
    $defs: { sym: { type: "string", pattern: "^[A-Z]{3}$" } } };
  const a = F.fromSchema(schema, 200, "s1"), b = F.fromSchema(schema, 200, "s1"), c = F.fromSchema(schema, 200, "s2");
  assert.deepEqual(plain(a), plain(b), "same seed, same rows");
  assert.notDeepEqual(plain(a.rows), plain(c.rows));
  assert.equal(a.notes.length, 0);
  for (const r of a.rows) {
    assert.match(r.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.match(r.acct, /^DEMO\d{6}$/);
    assert.ok(["BUY", "SELL"].includes(r.side));
    assert.ok(Number.isInteger(r.qty) && r.qty >= 100 && r.qty <= 1000 && r.qty % 100 === 0);
    assert.match(r.sym, /^[A-Z]{3}$/);
    if ("px" in r) assert.ok(r.px > 0 && r.px <= 10);
    if ("tags" in r) assert.ok(r.tags.length >= 1 && r.tags.length <= 2);
    if ("when" in r) assert.ok(!Number.isNaN(Date.parse(r.when)));
  }
  assert.ok(a.rows.some(r => !("px" in r)) && a.rows.some(r => "px" in r), "optional properties come and go");
});

test("FakeData: refs, cycles, root arrays, patterns, columns, CSV, row cap", () => {
  const loop = F.fromSchema({ $defs: { node: { type: "object", required: ["next"], properties: { next: { $ref: "#/$defs/node" } } } }, $ref: "#/$defs/node" }, 2, 1);
  assert.equal(loop.rows.length, 2);
  assert.ok(loop.notes.some(n => n.kind === "depth"));
  assert.ok(F.fromSchema({ allOf: [{ $ref: "#" }] }, 1, 1).rows.length === 1, "allOf self-reference ends");
  assert.ok(F.fromSchema({ type: "object", properties: { x: { $ref: "other.json#/a" } }, required: ["x"] }, 1, 1).notes.some(n => n.kind === "ref"));
  const arr = F.fromSchema({ type: "array", items: { type: "object", properties: { n: { const: 7 } }, required: ["n"] } }, 3, 1);
  assert.deepEqual(plain(arr.rows), [{ n: 7 }, { n: 7 }, { n: 7 }]);
  const r = F.rng(1);
  assert.match(F.fromPattern("^(BUY|SELL)-[A-F0-9]{4}\\.x?$", r), /^(BUY|SELL)-[A-F0-9]{4}\.x?$/);
  assert.equal(F.fromPattern("(?=x)a", r), null, "lookahead is not supported");
  assert.equal(F.fromPattern("(a)\\1", r), null, "backreference is not supported");
  assert.ok(F.fromSchema({ type: "object", required: ["s"], properties: { s: { type: "string", pattern: "(?<=x)a" } } }, 1, 1).notes.some(n => n.kind === "pattern"));
  const p = F.parseCols("id:uuid, name, price, foo:nope, email");
  assert.deepEqual(plain(p.cols.map(c => c.kind)), ["uuid", "name", "price", "email"]);
  assert.deepEqual(plain(p.bad), ["nope"]);
  const rows = F.fromColumns(p.cols, 50000, "x");
  assert.equal(rows.length, F.MAX_ROWS, "capped at 10k rows");
  assert.deepEqual(plain(F.fromColumns(p.cols, 3, "x")), plain(rows.slice(0, 3)));
  assert.equal(F.toCsv([{ a: 1, b: { c: "x,y" } }, { a: null }]), 'a,b\n1,"{""c"":""x,y""}"\n,\n');
  const t0 = Date.now(), evil = F.fromSchema({ type: "string", pattern: "^(a{1,20}){1,20}\\W$" }, 3, 1);
  assert.ok(Date.now() - t0 < 1000 && evil.rows.length === 3, "a backtracking pattern from a link never runs");
  const t1 = Date.now(), rec = F.fromSchema({ type: "object", required: ["a", "b", "c", "d", "e"], properties: Object.fromEntries("abcde".split("").map(k => [k, { $ref: "#" }])) }, 20, 1);
  assert.ok(Date.now() - t1 < 5000 && rec.notes.some(n => n.kind === "budget" || n.kind === "depth"), "recursive schema is cut");
  assert.ok(F.fromSchema({ type: "string", minLength: 1e9 }, 1, 1).rows[0].length <= 10000);
  const s = F.fromSchema({ type: "string", minLength: 12, maxLength: 12 }, 5, 1);
  assert.ok(s.rows.every(x => x.length === 12));
});
