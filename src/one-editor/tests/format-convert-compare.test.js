// Phase 2a pure modules: format dispatcher (tier 1), convert / type ops, minimal change, share flag for compare, new demos.
// Run: node --test src/one-editor/tests/format-convert-compare.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, Prefs: { get: (k, d) => d, set() {} } });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
const DW = "../data-workbench/";
vm.runInContext([
  DW + "third-party/js-yaml.min.js", DW + "js/core/text-utils.js", DW + "js/parsers/format-detect.js", DW + "js/parsers/json-tolerant-parser.js",
  DW + "js/parsers/markup-tolerant-parser.js", DW + "js/parsers/csv-parser.js", DW + "js/parsers/css-minifier.js", DW + "js/converters/value-model.js",
  DW + "js/converters/table-shape.js", DW + "js/converters/xml-value-mapper.js", DW + "js/converters/output-writers.js", DW + "js/converters/convert-engine.js",
  DW + "js/converters/json-to-type-definitions.js", "js/editor/language-detect.js", "js/core/layout-presets.js", "js/core/output-operations.js",
  "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-format-compare.js", "js/format/format-dispatcher-by-language.js", "js/format/format-actions.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { OutputOps, ShareState, DEMOS, Formatter, FormatActions, TypeGen, JsonTool, LangDetect });", ctx);
const { OutputOps, ShareState, DEMOS, Formatter, FormatActions, TypeGen, JsonTool, LangDetect } = ctx;
const SOH = String.fromCharCode(1);

test("format tier: JSON/XML/SQL/FIX → 1, Prettier languages → 2, the rest → 3", () => {
  eq(["JSON", "XML", "SQL", "FIX", "JavaScript", "YAML", "GraphQL", "Go", "Python", "C++", "Rust", "Plain Text"].map(Formatter.tier), [1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3]);
  assert.equal(LangDetect.byName("schema.graphql"), "GraphQL");
});

test("format JSON: tolerant repair reported as fixes with lines, indent detected from the file", async () => {
  const r = await Formatter.format("{\n    // note\n    'a': 1,,\n    \"b\": [true,],\n}", "JSON");
  assert.equal(r.text, '{\n    "a": 1,\n    "b": [\n        true\n    ]\n}\n');
  assert.ok(r.fixes.length >= 3 && r.fixes.every(f => f.line >= 2 && f.msg));
  Formatter.opts.indent = "2";
  assert.equal((await Formatter.format('{"a":{"b":1}}', "JSON")).text, '{\n  "a": {\n    "b": 1\n  }\n}\n');
  Formatter.opts.indent = "auto";
});

test("format WASM tier: engine + language + link options reach WasmFmt; a syntax error is located; a failure falls back with the reason", async () => {
  const seen = [];
  ctx.PowerTools = { load: async () => {} };
  ctx.WasmFmt = { format: async (text, lang, engine, o) => { seen.push([lang, engine, o.clang, o.pyWidth]); return text === "bad" ? { error: { line: 3, col: 7, msg: "expected ')'" } } : { text: "ok\n", notes: [] }; } };
  assert.equal((await Formatter.format("x", "C#", { clang: "Google", pyWidth: "99", evil: 1 })).text, "ok\n");
  await Formatter.format("x", "Python");
  eq(seen, [["C#", "clang-format", "Google", 88], ["Python", "ruff", "LLVM", 88]], "unknown key / wrong type from a link are dropped");
  assert.equal((await Formatter.format('{"a":1}', "JSON", { indent: "100000000" })).text, '{\n  "a": 1\n}\n', "a huge indent from a link is ignored");
  assert.equal((await Formatter.format('{"a":1}', "JSON", { indent: "4", sql: "oracle" })).text, '{\n    "a": 1\n}\n');
  await assert.rejects(Formatter.format("bad", "Go"), e => e.line === 3 && e.col === 7 && /Go/.test(e.message));
  ctx.PowerTools = { load: async () => { throw new Error("one-editor-extras.js"); } };
  const r = await Formatter.format("def f():\n  return 1   \n", "Python");
  assert.equal(r.fallback, true);
  assert.equal(r.text, "def f():\n  return 1\n", "Python fallback only trims line ends");
  assert.match(r.notes[0], /ruff: one-editor-extras\.js/);
});

test("format XML (tolerant) and minify JSON / XML / CSS; minify refuses other languages", async () => {
  const x = await Formatter.format("<a><b>1</b><c/></a>", "XML");
  assert.equal(x.text, "<a>\n  <b>1</b>\n  <c/>\n</a>\n");
  assert.equal(Formatter.minify('{ "a" : [ 1 , 2 ] }', "JSON").text, '{"a":[1,2]}');
  assert.equal(Formatter.minify("<a>\n  <b>1</b>\n</a>", "XML").text, "<a><b>1</b></a>");
  assert.equal(Formatter.minify("a {\n  color: red ;\n}\n", "CSS").text, "a{color:red}");
  assert.throws(() => Formatter.minify("x", "Go"), /Go/);
});

test("format FIX: one tag per line, blank line between messages, log prefix kept", async () => {
  const msg = ["8=FIX.4.4", "35=D", "55=ACME", "10=001"].join(SOH) + SOH;
  assert.equal(Formatter.fixLines(msg), "8=FIX.4.4\n35=D\n55=ACME\n10=001\n");
  assert.equal(Formatter.fixLines("09:00 IN 8=FIX.4.4|35=0|10=002|8=FIX.4.4|35=1|10=003|\nplain line"), "09:00 IN\n8=FIX.4.4\n35=0\n10=002\n\n8=FIX.4.4\n35=1\n10=003\n\nplain line\n");
  assert.equal((await Formatter.format("a | b = c", "FIX")).text, "a | b = c\n");
});

test("convert ops: JSON → YAML / CSV / XML, YAML → JSON; output language follows the op", async () => {
  const c = { lang: "JSON", name: "t.json" }, run = (id, text, cx = c) => OutputOps.exec(OutputOps.get(id), text, cx);
  assert.equal((await run("to-yaml", '{"a":1,"b":[1,2]}')).text, "a: 1\nb:\n  - 1\n  - 2\n");
  assert.equal((await run("to-csv", '[{"id":1,"s":"x"},{"id":2,"s":"y"}]')).text, "id,s\n1,x\n2,y\n");
  assert.match((await run("to-xml", '{"order":{"id":7}}')).text, /<order>\s*<id>7<\/id>\s*<\/order>/);
  assert.equal((await run("to-json", "a: 1\nb: [x]\n", { lang: "YAML", name: "c.yaml" })).text, '{\n  "a": 1,\n  "b": [\n    "x"\n  ]\n}\n');
  eq(["to-go", "to-ts", "to-cs", "to-java", "to-cpp", "format"].map(id => OutputOps.langOf(OutputOps.get(id), { lang: "SQL" })), ["Go", "TypeScript", "C#", "Java", "C++", "SQL"]);
});

test("JSON → types: merged array items, optional / nullable fields, names per language", async () => {
  const json = '{"orderId":"A","qty":1,"price":2.5,"fills":[{"venue":"MAIN"},{"venue":null,"fee":1}],"class":true}';
  const go = (await OutputOps.exec(OutputOps.get("to-go"), json, { lang: "JSON", name: "order.json ⇢ x" })).text;
  assert.match(go, /^type Order struct \{\n\tOrderID string +`json:"orderId"`/);
  assert.match(go, /Fills +\[\]Fill/);
  assert.match(go, /Venue \*string `json:"venue"`/);
  assert.match(go, /Fee +int64 +`json:"fee,omitempty"`/);
  const ts = TypeGen.generate(JsonTool.parse(json).ast, "ts", "Order");
  assert.match(ts, /venue: string \| null;\n  fee\?: number;/);
  assert.match(TypeGen.generate(JsonTool.parse(json).ast, "java", "Order"), /private boolean class_;[\s\S]*public boolean isClass_\(\)/);
  assert.match(TypeGen.generate(JsonTool.parse(json).ast, "cs", "Order"), /public long\? Fee \{ get; set; \}/);
  assert.match(TypeGen.generate(JsonTool.parse(json).ast, "cpp", "Order"), /^#include <cstdint>[\s\S]*struct Fill \{[\s\S]*struct Order \{\n {4}std::string order_id;/);
  assert.match(TypeGen.generate(JsonTool.parse("[{\"a\":1},{\"b\":\"x\"}]").ast, "ts", "Root"), /a\?: number;\n  b\?: string;/);
  assert.throws(() => TypeGen.generate(JsonTool.parse("42").ast, "go"), /object/);
  eq([TypeGen.singular("entries"), TypeGen.singular("addresses"), TypeGen.singular("status"), TypeGen.pascal("2fa_code")], ["entry", "address", "status", "T2faCode"]);
});

test("format in place uses the smallest single change", () => {
  eq(FormatActions.minimalChange("abcXYZdef", "abc12def"), { from: 3, to: 6, insert: "12" });
  eq(FormatActions.minimalChange("same", "same"), { from: 4, to: 4, insert: "" });
});

test("share link keeps the compare flag (true / json) and drops anything else", () => {
  const views = [[{ n: "a", t: "x" }], [{ n: "b", t: "y" }]];
  eq(["compare", "json", "yes", 1].map(c => ShareState.parse({ views, compare: c === "compare" ? true : c }).compare), [true, "json", false, false]);
  assert.equal(ShareState.build([[{ name: "a", lang: "", text: "x" }], []], false, "2c", true).compare, true);
  assert.equal("compare" in JSON.parse(JSON.stringify(ShareState.build([[{ name: "a", lang: "", text: "x" }], []], false, "2c", false))), false);
});

test("phase 2a demos parse, run a known op, detect the intended languages", () => {
  for (const key of ["compare", "compare-json", "format-mixed", "json-to-types", "html-to-md"]) {
    const p = ShareState.parse(DEMOS[key].payload());
    assert.ok(p.views.flat().length && (p.run || p.compare), key);
  }
  const tabs = ShareState.parse(DEMOS["format-mixed"].payload()).views[0];
  eq(tabs.map(t => LangDetect.detect(t.name, t.text).id), ["JavaScript", "SQL", "JSON", "FIX", "Go"]);
});
