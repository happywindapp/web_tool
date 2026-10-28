// Unit tests for the DOM-free modules. Run: node --test src/data-workbench/tests/pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = [
  "third-party/js-yaml.min.js", "js/core/i18n-ui-language-vi-en.js", "js/core/text-utils.js", "js/core/share-link-codec.js", "js/parsers/format-detect.js", "js/parsers/json-tolerant-parser.js",
  "js/parsers/json-ast-transforms.js", "js/parsers/markup-tolerant-parser.js", "js/parsers/csv-parser.js", "js/parsers/css-minifier.js",
  "js/converters/value-model.js", "js/converters/table-shape.js", "js/converters/xml-value-mapper.js", "js/converters/output-writers.js",
  "js/converters/convert-engine.js", "js/diff/myers-sequence-diff.js", "js/diff/json-structural-diff.js",
];
// Top-level const of a script is not a context property, so export the modules explicitly.
const code = FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { ShareCodec, Detect, JsonTool, JsonAst, MarkupTool, CsvTool, CssMin, Val, Convert, SeqDiff, JsonDiff };";
const ctx = vm.createContext({ Blob, Response, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, btoa, atob, console });
vm.runInContext(code, ctx);
const { ShareCodec, Detect, JsonTool, JsonAst, MarkupTool, CsvTool, CssMin, Val, Convert, SeqDiff, JsonDiff } = ctx.M;
// Objects from the vm realm have another Object.prototype → compare through JSON.
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

test("json: tolerant parse repairs and keeps big numbers raw", () => {
  const r = JsonTool.parse("{a:1, 'b':'x', c:[1,2,], id: 12345678901234567890 // note\n}");
  assert.equal(JsonTool.stringify(r.ast, ""), '{"a":1,"b":"x","c":[1,2],"id":12345678901234567890}');
  assert.ok(r.fixes.length >= 4);
});

test("json ast: sort keys + decode nested stringified JSON", () => {
  const ast = JsonTool.parse('{"z":1,"a":"{\\"y\\":2,\\"b\\":[1]}","m":"{not json}"}').ast;
  const d = JsonAst.decodeNested(JsonAst.sortKeys(ast));
  assert.equal(d.count, 1);
  assert.equal(JsonTool.stringify(JsonAst.sortKeys(d.ast), ""), '{"a":{"b":[1],"y":2},"m":"{not json}","z":1}');
  same(JsonAst.stats(ast), { nodes: 4, depth: 1 });
});

test("markup: xml repair reports & fix; html keeps bare & untouched (WT-5)", () => {
  const x = MarkupTool.build("<a>A & B</a>", false);
  assert.equal(MarkupTool.serialize(x.root, "  ", false), "<a>A &amp; B</a>");
  assert.equal(x.fixes.length, 1);
  const h = MarkupTool.build('<p>A & B <a href="?a=1&b=2">x</a></p>', true);
  assert.equal(h.fixes.length, 0);
  assert.match(MarkupTool.minify(h.root, true), /A & B .*a=1&b=2/);
});

test("csv: sniff delimiter, quoted newline, mismatched columns and unclosed quote", () => {
  const r = CsvTool.parse('ten;"ghi chu";so\nAn;"dòng 1\ndòng 2";007\nBình;x\n\n"mở;1;2');
  assert.equal(r.delimiter, ";");
  same(r.rows[1], ["An", "dòng 1\ndòng 2", "007"]);
  assert.equal(r.rows.length, 4);
  assert.ok(r.fixes.some(f => /không có nháy đóng/.test(f.msg)));
  assert.ok(r.fixes.some(f => /2 cột/.test(f.msg) && f.line === 4));
  assert.equal(CsvTool.stringify([["a,b", 'c"d', " e"]], ","), '"a,b","c""d"," e"');
});

test("convert: json → csv flattens, keeps leading zeros and big ids", () => {
  const r = Convert.run('{"data":[{"id":12345678901234567890,"code":"007","u":{"n":"An"}},{"id":2,"x":true}]}', "json", "csv");
  assert.equal(r.out, "id,code,u.n,x\n12345678901234567890,007,An,\n2,,,true");
  assert.ok(r.notes.some(n => /data/.test(n)));
});

test("convert: csv → json unflattens a.b and infers types", () => {
  const r = Convert.run("id,u.n,code,ok\n1,An,007,true", "csv", "json", { indent: "" });
  assert.equal(r.out, '[{"id":1,"u":{"n":"An"},"code":"007","ok":true}]');
});

test("convert: xml ⇄ json with attributes, repeated tags and text", () => {
  const r = Convert.run('<lib v="1"><book id="1">A &amp; B</book><book id="2"><t>C</t></book></lib>', "xml", "json", { indent: "" });
  assert.equal(r.out, '{"lib":{"@v":1,"book":[{"@id":1,"#text":"A & B"},{"@id":2,"t":"C"}]}}');
  const back = Convert.run(r.out, "json", "xml");
  assert.equal(back.out, '<?xml version="1.0" encoding="UTF-8"?>\n<lib v="1">\n  <book id="1">A &amp; B</book>\n  <book id="2">\n    <t>C</t>\n  </book>\n</lib>');
});

test("convert: yaml ⇄ json, sql, markdown, js literal", () => {
  assert.equal(Convert.run("a: 1\nb: [x, 'y z']\nc: 1.50", "yaml", "json", { indent: "" }).out, '{"a":1,"b":["x","y z"],"c":1.5}');
  const y = Convert.run('{"a":1,"big":12345678901234567890}', "json", "yaml");
  assert.equal(y.out, "a: 1\nbig: '12345678901234567890'");
  assert.ok(y.notes.some(n => /chuỗi/.test(n)));
  assert.equal(Convert.run('[{"n":"O\'Hara","v":1,"z":null}]', "json", "sql", { table: "t" }).out, "INSERT INTO t (n, v, z) VALUES\n  ('O''Hara', 1, NULL);");
  assert.equal(Convert.run('[{"a":"x|y","n":1}]', "json", "markdown").out, "| a | n |\n| --- | ---: |\n| x\\|y | 1 |");
  assert.equal(Convert.run('{"a-b":"it\'s","c":[1]}', "json", "js", { indent: "" }).out, "{'a-b':'it\\'s',c:[1]}");
});

test("detect: data / code sniffing", () => {
  assert.equal(Detect.data("a: 1\nb: 2"), "yaml");
  assert.equal(Detect.data("a\tb\n1\t2"), "tsv");
  assert.equal(Detect.data("a,b\n1,2"), "csv");
  assert.equal(Detect.code("a{color:red}"), "css");
  assert.equal(Detect.code("const a = () => 1"), "js");
});

test("diff: myers line diff and json structural compare", () => {
  const ops = SeqDiff.diff(["a", "b", "c", "d"], ["a", "x", "c", "d", "e"]);
  same(ops.map(o => o.op), ["eq", "del", "ins", "eq", "eq", "ins"]);
  const a = Val.fromAst(JsonTool.parse('{"a":1,"b":[1,2],"c":{"d":"x"}}').ast);
  const b = Val.fromAst(JsonTool.parse('{"c":{"d":"y"},"a":1.0,"b":[1],"e":true}').ast);
  same(JsonDiff.compare(a, b).map(JsonDiff.describe), ["− $.b[1] bị xoá (giá trị cũ: 2)", "~ $.c.d: \"x\" → \"y\"", "+ $.e thêm mới: true"]);
});

test("css minify keeps meaningful spaces", () => {
  const r = CssMin.minify('/* c */ a :hover , b > c { width: calc(100% - 10px) ; content: "a  ;  b" ; }\n@media screen and (max-width: 10px) { x { y: z } }');
  assert.equal(r.text, 'a :hover,b>c{width:calc(100% - 10px);content:"a  ;  b"}@media screen and (max-width:10px){x{y:z}}');
  assert.equal(r.comments, 1);
});

test("review fixes: column name collisions never drop data silently", () => {
  const a = Convert.run("a,a.b\n1,2", "csv", "json", { indent: "" });
  assert.equal(a.out, '[{"a":1,"a.b":2}]');
  assert.ok(a.notes.some(n => /tiền tố/.test(n)));
  assert.equal(Convert.run("a.b,a\n1,2", "csv", "json", { indent: "" }).out, '[{"a.b":1,"a":2}]');
  const b = Convert.run('[{"a.b":1,"a":{"b":2}}]', "json", "csv");
  assert.equal(b.out, "a.b,a.b_2\n1,2");
  const c = Convert.run("a,a,a_2\n1,2,3", "csv", "json", { indent: "" });
  assert.equal(c.out, '[{"a":1,"a_2":2,"a_2_2":3}]');
  assert.equal(c.notes.filter(n => /bị trùng/.test(n)).length, 2);
});

test("review fixes: duplicate keys noted, wrapper kept, nested arrays in xml, css detect, number precision", () => {
  assert.ok(Convert.run('{"a":1,"a":2}', "json", "yaml").notes.some(n => /trùng/.test(n)));
  assert.equal(Convert.run('{"user":{"name":"x","age":1}}', "json", "csv").out, "user.name,user.age\nx,1");
  const x = Convert.run('{"m":[[1,2],[3]]}', "json", "xml");
  assert.match(x.out, /<m>\n {4}<item>1<\/item>\n {4}<item>2<\/item>\n {2}<\/m>/);
  assert.equal(Detect.code("a{color:var(--c)}"), "css");
  assert.equal(Detect.code('@import url("a.css");\nb{c:d}'), "css");
  assert.equal(Detect.code("var x = 1"), "js");
  const p = s => Val.fromAst(JsonTool.parse(s).ast);
  assert.equal(JsonDiff.compare(p('{"p":0.30000000000000001}'), p('{"p":0.3}')).length, 1);
  assert.equal(JsonDiff.compare(p('{"p":1.0}'), p('{"p":1}')).length, 0);
});

test("sql dialects: quoting, string escape, booleans, schema.table", () => {
  const src = '[{"tên KH":"O\'Hara\\\\","ok":true}]';
  const sql = d => Convert.run(src, "json", "sql", { table: "app.khach hang", sqlDialect: d }).out.split("\n")[1];
  assert.equal(Convert.run(src, "json", "sql", { table: "app.khach hang" }).out.split("\n")[0], 'INSERT INTO app."khach hang" ("tên KH", ok) VALUES');
  assert.equal(sql("postgresql"), "  ('O''Hara\\', TRUE);");
  assert.equal(sql("mysql"), "  ('O''Hara\\\\', TRUE);");
  assert.equal(sql("sqlserver"), "  (N'O''Hara\\', 1);");
  assert.equal(sql("sqlite"), "  ('O''Hara\\', 1);");
  assert.match(Convert.run(src, "json", "sql", { sqlDialect: "sqlserver" }).out, /\[tên KH\]/);
  assert.match(Convert.run(src, "json", "sql", { sqlDialect: "mysql" }).out, /`tên KH`/);
});

test("xml → json notes dropped comments / <?…?> / DOCTYPE", () => {
  const r = Convert.run('<?xml version="1.0"?>\n<!DOCTYPE a>\n<!-- c1 -->\n<a><!-- c2 --><b>1</b></a>', "xml", "json", { indent: "" });
  assert.equal(r.out, '{"a":{"b":1}}');
  same(r.notes, ["Bỏ 2 chú thích, 1 khai báo <?…?>, 1 DOCTYPE (JSON không có chỗ chứa)"]);
  same(Convert.run("<a>1</a>", "xml", "json").notes, []);
});

test("share link codec: pako round trip, base64, raw text → null", async () => {
  const p = { tab: "diff", text: "Tiếng Việt ✔ " + "x".repeat(70000), text2: "{}", opts: { "df-ws": true } };
  const link = await ShareCodec.encode(p);
  assert.match(link, /^pako:[A-Za-z0-9_-]+$/);
  same(await ShareCodec.decode(link), p);
  same(await ShareCodec.decode("base64:" + Buffer.from('{"tab":"format","text":"a"}').toString("base64url")), { tab: "format", text: "a" });
  assert.equal(await ShareCodec.decode("hello"), null);
  await assert.rejects(ShareCodec.decode("pako:not-zlib"));
});

test("text utils: Excel-exact cells (leading zeros, long ids, trailing decimals, times) but not plain numbers or text", () => {
  const { TextUtil } = vm.runInContext("({ TextUtil })", ctx);
  for (const v of ["007", "12345678901234567890", "25.40", "09:00:30.120", "-0.50"]) assert.equal(TextUtil.excelExact(v), true, v);
  for (const v of ["42", "-3.5", "ABC", "C000123", ""]) assert.equal(TextUtil.excelExact(v), false, v);
});
