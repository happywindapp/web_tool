// Run: node --test src/one-editor/tests/power-tools-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const T = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s;
const ctx = vm.createContext({ T, I18n: { lang: "en", num: String }, Intl, TextEncoder, TextDecoder });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/json-tolerant-parser.js", "../data-workbench/js/parsers/csv-parser.js", "js/core/find-in-files-core.js",
  "js/extras/cron-expression-parser.js", "js/extras/cron-expression-explain.js", "js/extras/data-to-sql-statements.js", "js/extras/json-to-json-schema.js",
  "js/extras/batch-replace-rules.js", "js/extras/unicode-invisible-inspector.js", "js/extras/markdown-table-tools.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { Cron, CronExplain, DataSql, JsonSchemaGen, BatchRules, Invisible, MdTable });", ctx);
const { Cron, CronExplain, DataSql, JsonSchemaGen, BatchRules, Invisible, MdTable } = ctx;
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const local = t => [t.getFullYear(), t.getMonth() + 1, t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds()].join(" ");
const C = String.fromCharCode;

test("cron: Unix fields, steps, ranges, names, OR of both day fields, macros, crontab command", () => {
  const from = new Date(2026, 10, 20, 17, 50);
  const p = Cron.parse("*/15 9-17 * * 1-5");
  assert.equal(p.kind, "unix");
  eq(Cron.next(p, from, 3).map(local), ["2026 11 23 9 0 0", "2026 11 23 9 15 0", "2026 11 23 9 30 0"], "Friday 17:50 → Monday 09:00");
  assert.match(CronExplain.sentence(p), /^Every 15 minutes, từ 09:00 đến 17:59|^Every 15 minutes|^Mỗi 15 phút/i);
  eq(Cron.next(Cron.parse("0 0 13 * FRI"), new Date(2026, 0, 1), 3).map(local), ["2026 1 2 0 0 0", "2026 1 9 0 0 0", "2026 1 13 0 0 0"], "day 13 OR Friday");
  eq(Cron.next(Cron.parse("0 0 */10 * 1"), new Date(2026, 1, 1), 1).map(local), ["2026 5 11 0 0 0"], "a * prefix keeps AND: day 1/11/21/31 that is a Monday");
  eq(Cron.next(Cron.parse("@monthly"), new Date(2026, 10, 20), 1).map(local), ["2026 12 1 0 0 0"]);
  const cmd = Cron.parse("30 2 * * 0 /usr/local/bin/backup.sh --full");
  assert.equal(cmd.command, "/usr/local/bin/backup.sh --full");
  assert.equal(Cron.next(cmd, new Date(2026, 10, 20), 1)[0].getDay(), 0);
  assert.equal(Cron.parse("@reboot /opt/start.sh").kind, "reboot");
  assert.throws(() => Cron.parse("61 * * * *"), /0–59/);
  assert.throws(() => Cron.parse("* * *"), /5/);
  eq(Cron.next(Cron.parse("0 22-2 * * *"), new Date(2026, 0, 1, 12), 5).map(t => t.getHours()), [22, 23, 0, 1, 2], "range wraps past midnight");
});

test("cron: Quartz seconds, ?, L, W, #, 1 = Sunday, year", () => {
  const from = new Date(2026, 10, 1);
  eq(Cron.next(Cron.parse("0 15 10 L * ?"), from, 2).map(local), ["2026 11 30 10 15 0", "2026 12 31 10 15 0"]);
  eq(Cron.next(Cron.parse("0 15 10 ? * 6#3"), from, 1).map(local), ["2026 11 20 10 15 0"], "third Friday");
  eq(Cron.next(Cron.parse("0 0 12 ? * 6L"), from, 1).map(local), ["2026 11 27 12 0 0"], "last Friday");
  eq(Cron.next(Cron.parse("0 0 9 15W * ?"), from, 2).map(local), ["2026 11 16 9 0 0", "2026 12 15 9 0 0"], "Sunday 15th → Monday 16th");
  eq(Cron.next(Cron.parse("0 0 9 LW * ?"), from, 1).map(local), ["2026 11 30 9 0 0"]);
  eq(Cron.next(Cron.parse("*/20 * * * * ?"), new Date(2026, 0, 1, 0, 0, 5), 3).map(local), ["2026 1 1 0 0 20", "2026 1 1 0 0 40", "2026 1 1 0 1 0"]);
  eq(Cron.next(Cron.parse("0 0 12 ? * MON-FRI"), new Date(2026, 10, 21), 1).map(local), ["2026 11 23 12 0 0"]);
  eq(Cron.next(Cron.parse("0 0 0 1 1 ? 2030"), from, 2).map(local), ["2030 1 1 0 0 0"], "year field stops the search");
  assert.throws(() => Cron.parse("0 0 12 ? * 0"), /1 = /, "0 is not a Quartz weekday");
  assert.throws(() => Cron.parse("0 0 12 5 * MON"), /\?/, "both day fields set");
  assert.equal(Cron.parse("0 0 12 * * MON").kind, "quartz", "Spring-style * day of month");
});

test("cron report: one section per line, comments and env lines skipped, error kept per line", () => {
  const r = CronExplain.report("# nightly\nMAILTO=ops@example.com\n0 2 * * *\nbad line here x\n", new Date(2026, 10, 20, 12));
  assert.equal((r.text.match(/^## /gm) || []).length, 2);
  assert.match(r.text, /\| 1 \| 2026-11-21 \S+ 02:00 \|/);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].line, 4);
});

test("SQL: CSV / JSON rows → batched INSERT, UPDATE by key, escaping per dialect", () => {
  const csv = DataSql.read("id,name,qty,code\n1,O'Brien,10,007\n2,Nguyễn,,x\n3,\"a,b\",5,y\n", "CSV");
  eq([...csv.cols], ["id", "name", "qty", "code"]);
  const ins = DataSql.build(csv, { dialect: "tsql", batch: 2 }, "orders.csv").text;
  assert.match(ins, /INSERT INTO \[orders\] \(\[id\], \[name\], \[qty\], \[code\]\)\nVALUES\n  \(1, 'O''Brien', 10, '007'\),\n  \(2, N'Nguyễn', NULL, 'x'\);/);
  assert.equal((ins.match(/INSERT INTO/g) || []).length, 2, "batch of 2 → 2 statements");
  const pg = DataSql.build(csv, { dialect: "pg", mode: "update", key: "id", table: "sales.orders" }).text;
  assert.match(pg, /UPDATE "sales"\."orders" SET "name" = 'O''Brien', "qty" = 10, "code" = '007' WHERE "id" = 1;/);
  const json = DataSql.read('[{"id":12345678901234567890,"ok":true,"tags":["a"],"n":null},{"id":2,"extra":"x"}]', "JSON");
  const j = DataSql.build(json, { dialect: "pg" }, "t.json").text;
  assert.match(j, /\(12345678901234567890, TRUE, '\["a"\]', NULL, NULL\)/, "big int kept, nested → JSON text, missing → NULL");
  assert.match(DataSql.build(json, { dialect: "tsql" }, "t").text, /\(12345678901234567890, 1,/);
  assert.equal(DataSql.lit({ t: "str", v: "a\\b" }, "pg"), "'a\\b'");
  assert.equal(DataSql.ident("we]ird", "tsql"), "[we]]ird]");
  assert.match(DataSql.build(csv, { dialect: "tsql", batch: 5000 }).notes.join(" "), /1000/);
  assert.throws(() => DataSql.build(csv, { mode: "update", key: "nope" }), /nope/);
  assert.throws(() => DataSql.read("[1,2]", "JSON"), /object/);
});

test("JSON Schema 2020-12: types, required in every object, merged array items, formats", () => {
  const s = JSON.parse(JsonSchemaGen.generate('[{"id":1,"at":"2026-11-20T09:30:00Z","email":"a@example.com","price":1.5,"tags":["x"]},{"id":2,"price":3,"tags":[],"note":null}]', "Orders").text);
  assert.equal(s.$schema, "https://json-schema.org/draft/2020-12/schema");
  assert.equal(s.title, "Orders");
  assert.equal(s.type, "array");
  const o = s.items;
  eq([...o.required], ["id", "price", "tags"]);
  assert.equal(o.properties.id.type, "integer");
  assert.equal(o.properties.price.type, "number", "integer + number → number");
  assert.equal(o.properties.at.format, "date-time");
  assert.equal(o.properties.email.format, "email");
  assert.equal(o.properties.tags.items.type, "string");
  assert.equal(o.properties.note.type, "null");
  eq([...JSON.parse(JsonSchemaGen.generate('[1,"a",null]').text).items.type], ["integer", "string", "null"]);
});

test("batch replace: rules in order, off / empty skipped, regex groups, \\n, bad regex reported", () => {
  const r = BatchRules.apply("foo bar foo\nBAZ", [
    { on: true, find: "foo", repl: "x" }, { on: false, find: "bar", repl: "y" }, { on: true, find: "(x) (bar)", repl: "$2-$1\\n", regex: true },
    { on: true, find: "baz", repl: "Q", matchCase: true }, { on: true, find: "([", repl: "", regex: true }, { on: true, find: "", repl: "z" },
  ]);
  assert.equal(r.text, "bar-x\n x\nBAZ");
  eq([...r.counts], [2, null, 1, 0, null, null]);
  assert.equal(r.total, 3);
  assert.equal(r.errors[0].i, 4);
  assert.equal(BatchRules.apply("a$b", [{ on: true, find: "$", repl: "$$" }]).text, "a$$b", "plain mode is literal");
  eq({ ...BatchRules.diff("hello world", "hello there world") }, { from: 6, to: 6, insert: "there " });
  assert.equal(BatchRules.clean([{ find: 1, on: false }, null, "x"]).length, 1);
});

test("Unicode inspector: zero-width, NBSP, SOH, BOM mid-file, bidi, look-alike inside Latin word; fixes", () => {
  const text = "a" + C(0x200b) + "b c" + C(0xa0) + "d\n8=FIX.4.4" + C(1) + "35=D\n" + C(0xfeff) + "x " + C(0x202e) + "y\npаypal Москва\n";
  const r = Invisible.scan(text);
  eq(r.items.map(i => i.code + " " + i.kind + " " + i.line + ":" + i.col), ["U+200B zw 1:2", "U+00A0 space 1:6", "U+0001 control 2:10", "U+FEFF zw 3:1", "U+202E bidi 3:4", "U+0430 look 4:2"]);
  assert.equal(r.items[2].name, "SOH (FIX)");
  const apply = (t, es) => { let out = "", at = 0; for (const e of es) { out += t.slice(at, e.from) + e.insert; at = e.to; } return out + t.slice(at); };
  assert.equal(apply(text, Invisible.edits(text, "soh")).split("\n")[1], "8=FIX.4.4|35=D");
  assert.equal(apply(text, Invisible.edits(text, "look")).split("\n")[3], "paypal Москва", "only the Latin word changes");
  assert.equal(Invisible.edits(text, "zw").length, 2);
  const c = Invisible.context(text, r.items[0]);
  assert.equal(c.before + c.mark + c.after, "a⟨U+200B⟩b c⟨U+00A0⟩d 8=FIX.4.4⟨U+0001⟩35=D ⟨U+FEFF⟩x …");
});

test("Markdown tables: TSV → table (numbers right), align with wide chars, escaped pipes, TOC anchors", () => {
  assert.equal(MdTable.fromTsv(["Symbol\tQty\tNote", "ACME\t100\ta|b", "GLOBX\t2500\t\"two", "lines\"", ""].join("\n")),
    ["| Symbol |  Qty | Note         |", "| ------ | ---: | ------------ |", "| ACME   |  100 | a\\|b         |", "| GLOBX  | 2500 | two<br>lines |"].join("\n"));
  assert.equal(MdTable.fromTsv("just one line\twith tab"), null);
  const f = MdTable.format("text\n|a|b|\n|:-:|--:|\n|日本|1|\n|x|`a\\|b`|\nend");
  assert.equal(f.count, 1);
  assert.equal(f.text, "text\n|  a   |      b |\n| :--: | -----: |\n| 日本 |      1 |\n|  x   | `a\\|b` |\nend", "GFM: a pipe in a code span is escaped");
  const md = "# Title\n\n## Getting started\n### Install & run\n```\n## not a heading\n```\n## Getting started\n## Tiếng Việt có dấu\n";
  assert.equal(MdTable.toc(md), "<!-- toc -->\n- [Getting started](#getting-started)\n  - [Install & run](#install--run)\n- [Getting started](#getting-started-1)\n- [Tiếng Việt có dấu](#tiếng-việt-có-dấu)\n<!-- /toc -->");
  eq({ ...MdTable.tocRange("x\n<!-- toc -->\n- a\n<!-- /toc -->\ny") }, { from: 2, to: 32 });
  assert.equal(MdTable.width("日本a"), 5);
});

test("review fixes: crontab command words, dotted CSV columns, bracketed table, TOC underscores / C#, setext is no table, strict date-time", () => {
  for (const line of ["0 2 * * * reboot", "*/5 * * * * uptime", "30 2 * * * certbot renew"]) assert.equal(Cron.parse(line).kind, "unix", line);
  assert.equal(Cron.parse("0 0 9 ? * MON-FRI 2027").kind, "quartz");
  assert.match(CronExplain.report("0 0 9 * * 1-5").text, /Spring/);
  const data = DataSql.read("address.city,qty\nHanoi,1\n", "CSV");
  assert.match(DataSql.build(data, { dialect: "tsql", table: "[dbo].[Orders]" }).text, /INSERT INTO \[dbo\]\.\[Orders\] \(\[address\.city\], \[qty\]\)/);
  assert.match(MdTable.toc("## max_retries\n## Learn C#\n"), /\[max_retries\]\(#max_retries\)[\s\S]*\[Learn C#\]\(#learn-c\)/);
  assert.equal(MdTable.format("Options | Flags\n---\n").count, 0, "setext heading");
  assert.equal(JSON.parse(JsonSchemaGen.generate('{"a":"2026-01-01 10:00"}').text).properties.a.format, undefined);
});
