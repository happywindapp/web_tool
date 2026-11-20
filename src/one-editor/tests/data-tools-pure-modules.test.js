// Run: node --test src/one-editor/tests/data-tools-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, I18n: { num: n => String(n) }, TextEncoder, Intl });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/third-party/js-yaml.min.js", "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js",
  "../data-workbench/js/parsers/json-tolerant-parser.js", "../data-workbench/js/parsers/markup-tolerant-parser.js", "../data-workbench/js/parsers/csv-parser.js",
  "js/editor/language-detect.js", "js/core/layout-presets.js", "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-data.js",
  "js/data/jsonpath-filter-expression.js", "js/data/jsonpath-subset-query.js", "js/data/json-xml-tree-model.js", "js/data/data-tools-ops.js", "js/log/line-filter-to-output.js", "js/data/tolerant-lint-sources.js", "js/data/rainbow-csv-columns.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { OutputOps, ShareState, DEMOS, JsonPath, JsonTool, DataTree, DataLint, RainbowCsv, DataToolsOps });", ctx);
const { OutputOps, ShareState, DEMOS, JsonPath, JsonTool, DataTree, DataLint, RainbowCsv, DataToolsOps } = ctx;

const STORE = `{"store":{"book":[{"title":"A","price":8.95,"cat":"ref"},{"title":"B","price":12.99},{"title":"C","price":22,"isbn":"x"}],"bike":{"color":"red","price":19.95}},"a b":1,"n":null}`;
const ast = JsonTool.parse(STORE).ast;
const q = e => JsonPath.query(ast, e).map(r => JsonPath.pathText(r.path) + "=" + JSON.stringify(typeof JsonPath.val(r.node) === "object" && JsonPath.val(r.node) ? "obj" : JsonPath.val(r.node)));

test("JSONPath subset: names, wildcards, recursive descent, indexes, unions, slices, quoted keys", () => {
  eq(q("$.store.book[*].title"), ['$.store.book[0].title="A"', '$.store.book[1].title="B"', '$.store.book[2].title="C"']);
  eq(q("$..price"), ["$.store.book[0].price=8.95", "$.store.book[1].price=12.99", "$.store.book[2].price=22", "$.store.bike.price=19.95"]);
  eq(q("$.store.book[-1].title"), ['$.store.book[2].title="C"']);
  eq(q("$.store.book[0,2].title"), ['$.store.book[0].title="A"', '$.store.book[2].title="C"']);
  eq(q("$.store.book[1:].title"), ['$.store.book[1].title="B"', '$.store.book[2].title="C"']);
  eq(q("$.store.book[::-1].title"), ['$.store.book[2].title="C"', '$.store.book[1].title="B"', '$.store.book[0].title="A"']);
  eq(q("$['a b']"), ['$["a b"]=1']);
  eq(q("$.store.*").length, 2);
  eq(q("$.nothing.here"), []);
  eq(q("$.n"), ["$.n=null"]);
  for (const bad of ["store", "$.store[", "$.store.book[?(@.price <)]", "$..book[?(@.title =~ /x)]"]) assert.throws(() => JsonPath.query(ast, bad), /JSONPath/, bad);
});

test("JSONPath filters: comparisons, existence, regex, && || ! and parentheses — no eval", () => {
  eq(q("$..book[?(@.price < 10)].title"), ['$.store.book[0].title="A"']);
  eq(q("$..book[?(@.isbn)].title"), ['$.store.book[2].title="C"']);
  eq(q("$..book[?(@.title =~ /^[bc]$/i && @.price > 15)].title"), ['$.store.book[2].title="C"']);
  eq(q("$..book[?(@.cat == 'ref' || @.price >= 22)].title"), ['$.store.book[0].title="A"', '$.store.book[2].title="C"']);
  eq(q("$..book[?(!(@.price > 10))].title"), ['$.store.book[0].title="A"']);
  eq(q("$..book[?(@.price != 12.99)].title").length, 2);
  eq(q("$.store.book[?(@.title == 1)]"), [], "type mismatch is false");
  const evil = "$..book[?(@.title == constructor)]";
  assert.throws(() => JsonPath.query(ast, evil), /JSONPath/, "identifiers are not evaluated");
});

test("tree model: JSON offsets → lines, path text; XML paths with sibling indexes; tolerant input keeps its fixes", () => {
  const text = '{\n  "a": [1, {"b": "x"}],\n  "c": true\n}\n', m = DataTree.build(text, "JSON"), line = DataTree.lineIndex(text);
  assert.equal(m.fmt, "json");
  eq(m.text.trim().split("\n"), ["$ = {}", "$.a = []", "$.a[0] = 1", "$.a[1] = {}", '$.a[1].b = "x"', "$.c = true"]);
  const b = JsonPath.query(m.root, "$.a[1].b")[0].node, c = JsonPath.query(m.root, "$.c")[0].node;
  eq([line(b.at), line(c.at)], [2, 3]);
  const x = DataTree.build("<r>\n  <i id=\"1\">a</i>\n  <i>b</i>\n  <j/>\n</r>", "XML");
  eq(x.text.trim().split("\n"), ["/r", "/r/i[1]", '/r/i[1]/@id = "1"', '/r/i[1]/text() = "a"', "/r/i[2]", '/r/i[2]/text() = "b"', "/r/j"]);
  const fixed = DataTree.build("{a: 1,}", "JSON");
  assert.ok(fixed.fixes.length >= 1 && fixed.text.includes("$.a = 1"), "tolerant JSON still builds the tree");
  assert.equal(DataTree.build("  ", "JSON").root, null);
  assert.equal(DataTree.build("<root><item>x</item></root>", "Plain Text").fmt, "xml", "content decides when the language is unknown");
});

test("lint sources: JSON error + auto-fix hints, YAML mark, CSS braces / comments / strings", () => {
  eq(DataLint.issues('{"a": 1}', "JSON"), []);
  const j = DataLint.issues('{\n  "a": 1,,\n  "b": 2\n}', "JSON");
  assert.equal(j[0].sev, "error");
  assert.ok(j.slice(1).every(x => x.sev === "warning" && /tự sửa/.test(x.msg)) && j.length > 1);
  const y = DataLint.issues("a: 1\n  b: 2\nc: [1, 2\n", "YAML");
  assert.equal(y.length, 1); assert.equal(y[0].line, 2);
  eq(DataLint.issues("a: [1, 2]\n---\nb: 3\n", "YAML"), [], "multi-document YAML");
  eq(DataLint.issues('a { color: red; content: "}" } /* ok */', "CSS"), []);
  eq(DataLint.issues("a { color: red;\nb { }", "CSS").map(x => x.msg), ["Thiếu dấu } đóng khối mở ở đây"]);
  eq(DataLint.issues("a { } }", "CSS").map(x => x.at), [6]);
  eq(DataLint.issues('a { content: "x\n}', "CSS").map(x => x.msg), ["Chuỗi chưa đóng nháy"]);
  eq(DataLint.issues("/* open\na {}", "CSS").map(x => x.msg), ["Chú thích /* chưa đóng"]);
  eq(DataLint.issues("anything", "Python"), []);
});

test("Rainbow CSV: quote-aware fields, align / shrink round trip, CRLF kept", () => {
  eq(RainbowCsv.fields('a,"b,c",d', ","), [[0, 1], [2, 7], [8, 9]]);
  eq(RainbowCsv.fields('x;"say ""hi"";y";z', ";"), [[0, 1], [2, 16], [17, 18]]);
  const csv = 'id,name,qty\r\n1,"Smith, J",100\r\n22,Lee,5\r\n';
  const aligned = RainbowCsv.align(csv, ",");
  eq(aligned.split("\r\n"), ["id,name      ,qty", '1 ,"Smith, J",100', "22,Lee       ,5", ""]);
  assert.equal(RainbowCsv.shrink(aligned, ","), csv);
  assert.equal(RainbowCsv.delimOf("a\tb\nc\td", "TSV"), "\t");
  assert.equal(RainbowCsv.delimOf("a;b;c\n1;2;3", "CSV"), ";");
});

test("data ops + demos: ops are live panes, demo payloads parse", () => {
  for (const id of ["tree", "query"]) { const op = OutputOps.get(id); assert.ok(op.pane && op.live && !op.restore, id); }
  assert.equal(ShareState.parse(DEMOS["json-tree"].payload()).run, "tree");
  for (const k of ["jsonpath", "xpath", "lint-yaml", "rainbow-csv"]) assert.ok(ShareState.parse(DEMOS[k].payload()).views[0][0].text.length > 20, k);
  assert.ok(DataLint.issues(ShareState.parse(DEMOS["lint-yaml"].payload()).views[0][0].text, "YAML").length === 1, "lint demo has one YAML error");
  const orders = ShareState.parse(DEMOS.jsonpath.payload()).views[0][0].text;
  eq(JsonPath.query(JsonTool.parse(orders).ast, "$.orders[?(@.status == 'FILLED' && @.qty > 50)].id").map(r => JsonPath.val(r.node)), ["ORD-1", "ORD-3"]);
});

test("review fixes: late matches past the cap, paren filters, existence, sticky regex, slices, quoted keys, multi-line CSV cells, sibling indexes", () => {
  const big = JsonTool.parse(JSON.stringify({ a: Array.from({ length: 10001 }, (x, i) => i === 10000 ? { b: 1 } : {}) })).ast;
  assert.equal(JsonPath.query(big, "$.a[*].b").length, 1, "a match after 10 000 middle nodes");
  const t = JsonTool.parse('{"a":[{"x":1,"y":2},{"x":1,"y":3},{"f":false},{"f":null},{"f":0}],"k":{"a\\nb":5}}').ast;
  assert.equal(JsonPath.query(t, "$.a[?(@.x==1) && (@.y==2)]").length, 1);
  assert.equal(JsonPath.query(t, "$.a[?(@.f)]").length, 3, "existence: false / null / 0 all exist");
  assert.equal(JsonPath.query(JsonTool.parse('["ab","ab","ab"]').ast, "$[?(@ =~ /a/y)]").length, 3);
  assert.equal(JsonPath.query(JsonTool.parse("[1,2,3]").ast, "$[-10::-1]").length, 0);
  assert.equal(JsonPath.query(t, JsonPath.pathText(["k", "a\nb"])).length, 1, "path with \n round-trips");
  assert.equal(JsonPath.query(JsonTool.parse('["a]b","c"]').ast, "$[?@ =~ /]/]").length, 1, "] inside a regex");
  const csv = '1,"hello, world\nsecond line, here",x\n22,y,z\n';
  assert.equal(RainbowCsv.shrink(csv, ","), csv, "multi-line quoted cells untouched");
  assert.ok(RainbowCsv.align(csv, ",").startsWith('1,"hello, world\nsecond line, here",x\n22,y,z'));
  eq(RainbowCsv.fields('a,5" pipe,b', ","), [[0, 1], [2, 9], [10, 11]], "a quote inside a field does not open quoting");
  const x = DataTree.build("<r>" + "<i/>".repeat(20000) + "</r>", "XML");
  assert.ok(x.text.includes("/r/i[20000]"));
  assert.throws(() => DataTree.build("a: 1", "YAML"), /JSON, XML, HTML/);
});

test("JSONPath op: result text is JSON with raw values (19-digit ids exact), count shows the cap", () => {
  const r = DataToolsOps.query('{"a":[{"id":1234567890123456789},{"id":2}]}', { lang: "JSON", id: "s" }, "$.a[*].id");
  assert.ok(r.text.includes('"value": 1234567890123456789'));
  eq(JSON.parse(r.text.replace(/1234567890123456789/, "1")).results.map(x => x.path), ["$.a[0].id", "$.a[1].id"]);
  assert.equal(r.view.count, 2);
  assert.throws(() => DataToolsOps.query("a: 1", { lang: "YAML", id: "s" }, "$"), /JSON, XML, HTML/);
  assert.equal(DataToolsOps.tree('{"x":1}', { lang: "JSON", id: "s" }).text, ["$ = {}", "$.x = 1", ""].join(String.fromCharCode(10)));
});
