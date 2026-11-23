// Run: node --test src/one-editor/tests/pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, File, Blob, Uint8Array, TextDecoder, TextEncoder });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js",
  "js/core/layout-presets.js", "js/core/fuzzy-match.js", "js/core/command-registry.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/notepadpp/encoding-detect-convert.js", "js/providers/local-file-system-access-provider.js",
  "js/editor/search-in-selection.js", "js/core/hex-dump.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { LangDetect, OutputOps, ShareState, DEMOS, LocalFs, Layouts, Fuzzy, Commands, SearchInSelection, HexDump });", ctx);
const { LangDetect: L, OutputOps, ShareState, DEMOS, LocalFs, Layouts, Fuzzy, Commands, SearchInSelection, HexDump } = ctx;

test("hex dump: offset, two 8-byte groups, ascii column, truncation note", () => {
  const bytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x41, 0x42, 0x0a, 0xff, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x7e, 0x20]);
  const rows = HexDump.format(bytes, 100).split("\n");
  assert.equal(rows[0], "00000000  4d 5a 90 00 41 42 0a ff  30 31 32 33 34 35 36 37  |MZ..AB..01234567|");
  assert.equal(rows[1], "00000010  7e 20" + " ".repeat(18) + "  " + " ".repeat(23) + "  |~ |");
  assert.match(rows[2], /18 .*100/);
});

test("indent detection: tabs, 2 / 4 spaces, default 2", () => {
  const TAB = String.fromCharCode(9);
  assert.equal(L.indentOf("func main() {\n" + TAB + "x := 1\n" + TAB + "if x {\n" + TAB + TAB + "y()\n" + TAB + "}\n}"), TAB);
  assert.equal(L.indentOf("def f():\n    a = 1\n    if a:\n        b()\n"), "    ");
  assert.equal(L.indentOf("a:\n  b:\n    c: 1\n  d: 2\n"), "  ");
  assert.equal(L.indentOf("no indentation here\nat all\n"), "  ");
});

test("replace in selection: literal, escapes, regex groups, case flag", () => {
  const r = (q, text) => SearchInSelection.replacement({ search: "", replace: "", regexp: false, literal: false, caseSensitive: false, ...q }, text);
  assert.equal(r({ replace: "x" }, "abc"), "x");
  assert.equal(r({ replace: "a\\nb" }, "q"), "a\nb");
  assert.equal(r({ replace: "a\\nb", literal: true }, "q"), "a\\nb");
  assert.equal(r({ regexp: true, search: "(\\w+)@(\\w+)", replace: "$2 at $1" }, "user@host"), "host at user");
  assert.equal(r({ regexp: true, search: "abc", replace: "Z" }, "ABC"), "Z");
});

test("language by file name: every listed extension maps back to its id", () => {
  const cases = { "app.ts": "TypeScript", "x.JSON": "JSON", "README.md": "Markdown", "a/b/c.py": "Python", "C:\\w\\Main.java": "Java", "Program.cs": "C#",
    "main.go": "Go", "q.sql": "SQL", "k.yml": "YAML", "s.ps1": "PowerShell", "Dockerfile": "Dockerfile", "Dockerfile.dev": "Dockerfile", ".env": "Properties files",
    "flow.mmd": "Mermaid", "seq.puml": "PlantUML", "arch.d2": "D2", "db.dbml": "DBML", "trades.csv": "CSV", "app.log": "Log", "notes.txt": "Plain Text", "web.config": "XML" };
  for (const [name, id] of Object.entries(cases)) assert.equal(L.detect(name, "").id, id, name);
  assert.equal(L.detect("noext", "").id, "Plain Text");
  assert.equal(L.detect("x.unknownext", "").by, "none");
});

test("language by shebang and modeline", () => {
  assert.equal(L.detect("run", "#!/usr/bin/env python3\nprint(1)").id, "Python");
  assert.equal(L.detect("run", "#!/bin/bash\necho hi").id, "Shell");
  assert.equal(L.detect("run", "#!/usr/bin/env -S deno run\nconsole.log(1)").id, "JavaScript");
  assert.equal(L.detect("run", "#!/usr/bin/env pwsh\nWrite-Host 1").id, "PowerShell");
  assert.equal(L.detect("x", "# -*- mode: ruby; coding: utf-8 -*-\nputs 1").id, "Ruby");
  assert.equal(L.detect("x", "line 1\nline 2\n# vim: set ft=yaml:").id, "YAML");
  assert.equal(L.byHeader("# -*- coding: utf-8 -*-\nx = 1"), "");
});

const CONTENT = [
  ["JSON", '{"symbol":"ACME","qty":100}'], ["JSON", '[\n  {"id": 1},\n  {"id": 2}\n]'], ["JSON", '{\n  "a": 1,,\n}'],
  ["XML", '<?xml version="1.0"?>\n<order id="1"/>'], ["HTML", "<!doctype html>\n<html><body><p>Hi</p></body></html>"], ["XML", "<order><qty>1</qty></order>"],
  ["YAML", "service: gateway\nport: 8080\nlog:\n  level: info\nvenues:\n  - MAIN\n  - DARK\n"],
  ["Markdown", "# Title\n\nSome **bold** text and a [link](https://example.com).\n\n- one\n- two\n"],
  ["SQL", "SELECT a.id, b.name\nFROM accounts a\nJOIN brokers b ON b.id = a.broker_id\nWHERE a.active = 1\nORDER BY b.name;"],
  ["Python", "import os\n\ndef main(args):\n    for a in args:\n        print(a)\n\nif __name__ == '__main__':\n    main([])\n"],
  ["Go", "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tx := 1\n\tfmt.Println(x)\n}\n"],
  ["Java", "package demo;\n\nimport java.util.List;\n\npublic class App {\n  @Override\n  public String toString() { return \"x\"; }\n  public static void main(String[] a) { System.out.println(1); }\n}\n"],
  ["C#", "using System;\nnamespace Demo\n{\n  public class Order { public string Id { get; set; } }\n  class P { static void Main() { Console.WriteLine(1); } }\n}\n"],
  ["Shell", "set -e\necho \"build\"\nif [ -f out.txt ]; then\n  rm out.txt\nfi\ncat log | grep ERROR | wc -l\n"],
  ["PowerShell", "param($Path)\n$items = Get-ChildItem $Path\nforeach ($i in $items) { if ($i.Length -gt 0) { Write-Host $i.Name } }\n"],
  ["JavaScript", "const total = items => items.reduce((s, x) => s + x.qty, 0);\nfunction show(x) {\n  console.log(x);\n}\nmodule.exports = { total };\n"],
  ["TypeScript", "export interface Order {\n  id: string;\n  qty: number;\n}\nexport const total = (o: Order[]): number => o.reduce((s, x) => s + x.qty, 0);\n"],
  ["CSS", ".toolbar {\n  display: flex;\n  gap: 8px;\n}\n@media (max-width: 640px) {\n  .toolbar { gap: 4px; }\n}\n"],
  ["Mermaid", "flowchart LR\n  A[Client] --> B[Gateway]\n  B --> C[(DB)]\n"], ["Mermaid", "sequenceDiagram\n  Alice->>Bob: Hi\n"],
  ["PlantUML", "@startuml\nAlice -> Bob: hello\n@enduml\n"],
  ["D2", "direction: right\nclient -> api: HTTPS\napi -> db: SQL\ndb.shape: cylinder\n"],
  ["DBML", "Table orders {\n  id int [pk, increment]\n  account_id int [not null]\n}\n\nRef: orders.account_id > accounts.id\n"],
  ["FIX", "8=FIX.4.4|9=65|35=D|49=CLIENT|56=BROKER|11=ORD1|55=ACME|54=1|38=100|10=123|"],
  ["CSV", "id,symbol,qty\n1,ACME,100\n2,GLOBX,50\n3,INITECH,75\n"], ["TSV", "id\tsymbol\tqty\n1\tACME\t100\n2\tGLOBX\t50\n"],
  ["Log", "2026-11-18 09:00:01 INFO started\n2026-11-18 09:00:02 WARN slow\n2026-11-18 09:00:03 ERROR failed\n"],
  ["Dockerfile", "FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD [\"node\", \"server.js\"]\n"],
  ["Rust", "use std::io;\n\nfn main() {\n    let mut n = 0;\n    println!(\"{}\", n);\n}\n"],
  ["C++", "#include <iostream>\nint main() {\n  std::cout << 1 << std::endl;\n}\n"], ["C", "#include <stdio.h>\nint main(void) {\n  printf(\"hi\");\n  return 0;\n}\n"],
  ["Properties files", "[server]\nhost = localhost\nport = 8080\n\n[log]\nlevel = info\n"],
  ["diff", "--- a/app.js\n+++ b/app.js\n@@ -1,2 +1,2 @@\n-const a = 1;\n+const a = 2;\n"],
  ["PHP", "<?php\necho 'hi';\n"], ["Kotlin", "fun main() {\n    val x = 1\n    println(x)\n}\n"],
];

test("language by content: ≥ 90% of the sample table, short text stays plain", () => {
  const wrong = CONTENT.filter(([id, text]) => L.detect("", text).id !== id).map(([id, text]) => `${id} → ${L.detect("", text).id}`);
  assert.ok(wrong.length <= Math.floor(CONTENT.length * 0.1), "misdetected:\n" + wrong.join("\n"));
  assert.equal(L.detect("", "hello world").id, "Plain Text");
  assert.equal(L.detect("", "").by, "none");
  const t0 = Date.now();
  for (const s of ["a".repeat(20000), " ".repeat(20000) + "x", "a -".repeat(7000)]) L.detect("", s);
  assert.ok(Date.now() - t0 < 100, "long single lines must stay fast: " + (Date.now() - t0) + "ms");
});

const cmDir = path.join(root, "..", "..", "tools", "vendor", "codemirror-6.43.15");
const cm = { navigator: { userAgent: "node", platform: "", vendor: "" }, setTimeout, clearTimeout };
cm.globalThis = cm;
vm.createContext(cm);
vm.runInContext(fs.readFileSync(path.join(cmDir, "codemirror-core.min.js"), "utf8"), cm);
vm.runInContext(fs.readFileSync(path.join(cmDir, "codemirror-languages.min.js"), "utf8"), cm);
vm.runInContext(src("js/editor/document-symbols.js") + "\n;globalThis.Symbols = Symbols;", cm);

test("minimap bundle attaches to the shared CodeMirror instance", () => {
  vm.runInContext(fs.readFileSync(path.join(cmDir, "codemirror-minimap.min.js"), "utf8"), cm);
  const ext = cm.CM.minimap.showMinimap.of({ create: () => ({ dom: {} }), displayText: "blocks" });
  const state = cm.CM.state.EditorState.create({ doc: "a", extensions: [ext] });
  assert.equal(state.facet(cm.CM.minimap.showMinimap).displayText, "blocks");
});

test("every language id with a highlighter exists in the vendored CodeMirror language-data", () => {
  const { LanguageDescription } = cm.CM.language;
  for (const id of L.ids.filter(L.highlighter)) assert.ok(LanguageDescription.matchLanguageName(cm.CM.languages, id, false), id);
});

test("go to symbol: syntax tree for JS / Python / Go / Markdown, regex fallback otherwise", async () => {
  const names = async (lang, text) => {
    const desc = lang && cm.CM.language.LanguageDescription.matchLanguageName(cm.CM.languages, lang, false);
    const state = cm.CM.state.EditorState.create({ doc: text, extensions: desc ? [await desc.load()] : [] });
    return cm.Symbols.list(state).map(s => s.label + ":" + s.line);
  };
  eq(await names("JavaScript", "function a() {}\nclass B {\n  run() {}\n}\nconst c = 1;\nexport const d = x => x;"), ["a:1", "B:2", "run:3", "d:6"]);
  eq(await names("Python", "def f(x):\n    pass\n\nclass K:\n    def m(self):\n        pass\n"), ["f:1", "K:4", "m:5"]);
  eq(await names("Go", "package main\n\nfunc main() {}\n\ntype Order struct{}\n"), ["main:3", "Order:5"]);
  eq(await names("Markdown", "# Top\ntext\n## Sub\n"), ["Top:1", "Sub:3"]);
  eq(await names("", "public class Order {\n  public static void Main() {}\n}\n"), ["Order:1"]);
});

test("share payload: round trip, untrusted fields dropped", () => {
  const p = ShareState.parse(ShareState.build([[{ name: "a.json", lang: "JSON", text: "{}" }], [{ name: "b", lang: "", text: "x" }]], true));
  eq(JSON.parse(JSON.stringify(p)), { views: [[{ name: "a.json", lang: "JSON", text: "{}" }], [{ name: "b", lang: "", text: "x" }]], layout: "", wrap: true, run: "", compare: false });
  const four = ShareState.parse({ views: [[{ t: "1" }], [{ t: "2" }], [{ t: "3" }], [{ t: "4" }], [{ t: "5" }]] });
  eq([four.views.length, four.layout], [4, "4g"]);
  assert.equal(ShareState.parse({ views: [[{ t: "1" }], [], [{ t: "3" }]], layout: "2c" }).layout, "3c");
  assert.equal(ShareState.parse({ views: [[{ t: "1" }], [{ t: "2" }]], layout: "2r" }).layout, "2r");
  assert.equal(ShareState.parse({ views: [[{ t: "1" }], [], [], []] }).views.length, 2);
  const q = ShareState.parse({ views: [[{ n: "../../etc/passwd", l: "<script>", t: "x", handle: "h" }, { n: "no text" }, 5]], run: "rm -rf", wrap: "yes" });
  assert.equal(q.views[0].length, 1);
  assert.equal(q.views[0][0].name, ".._.._etc_passwd");
  assert.equal(q.views[0][0].lang, "");
  eq([q.run, q.wrap, q.views[1].length], ["", false, 0]);
  assert.throws(() => ShareState.parse({ views: [[], []] }));
  assert.throws(() => ShareState.parse("text"));
  assert.equal(ShareState.parse({ views: [Array.from({ length: 99 }, () => ({ t: "" }))] }).views[0].length, ShareState.MAX_TABS);
});

test("layouts: view counts and 'the other view'", () => {
  eq(Layouts.LIST.map(l => l.n), [1, 2, 3, 2, 4, 3, 3]);
  eq(Layouts.LIST.filter(l => l.bar).map(l => l.id), ["2c", "12", "21"]);
  eq([1, 2, 3, 4, 9].map(Layouts.forCount), ["1", "2c", "3c", "4g", "4g"]);
  eq([Layouts.other(0, 1), Layouts.other(0, 2), Layouts.other(1, 2), Layouts.other(2, 3), Layouts.other(3, 4)], [-1, 1, 0, 0, 0]);
});

test("fuzzy: subsequence match, word starts and runs rank first", () => {
  assert.equal(Fuzzy.score("xyz", "orders.js"), null);
  const ranked = Fuzzy.filter("oj", [{ label: "config.yaml" }, { label: "lorem-ojx.txt" }, { label: "orders.js" }]).map(x => x.label);
  eq(ranked, ["orders.js", "lorem-ojx.txt"]);
  eq(Fuzzy.score("gts", "Go to symbol").hits, [0, 3, 6]);
  assert.equal(Fuzzy.filter("", [{ label: "a" }, { label: "b" }]).length, 2);
});

test("commands: shortcut strings by physical key, palette list honours when()", () => {
  const ev = (code, key, mods = {}) => ({ code, key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });
  assert.equal(Commands.keyOf(ev("KeyP", "P", { ctrlKey: true, shiftKey: true })), "Ctrl+Shift+p");
  assert.equal(Commands.keyOf(ev("Digit5", "%", { altKey: true, shiftKey: true })), "Alt+Shift+5");
  assert.equal(Commands.keyOf(ev("F2", "F2", { ctrlKey: true })), "Ctrl+F2");
  let ran = 0;
  Commands.add("t1", "Test", "Ctrl+k", () => ran++);
  Commands.add("t2", "Hidden", null, () => ran++, () => false);
  eq(Commands.all().map(c => c.id), ["t1"]);
  Commands.run("t2"); Commands.run("t1");
  assert.equal(ran, 1);
  assert.equal(Commands.keyLabel(Commands.all()[0]), "Ctrl+K");
});

test("output ops: pretty / minify JSON, error carries the source line", () => {
  assert.equal(OutputOps.get("json-pretty").run('{"a":[1,2]}'), '{\n  "a": [\n    1,\n    2\n  ]\n}');
  assert.equal(OutputOps.get("json-minify").run('{\n "a" : 1\n}'), '{"a":1}');
  assert.throws(() => OutputOps.get("json-pretty").run('{\n  "a": 1,,\n  "b": 2\n}'), e => e.line === 2);
  assert.equal(OutputOps.get("__proto__"), null);
});

test("demos: every payload parses and names / content detect as intended", () => {
  for (const [key, d] of Object.entries(DEMOS)) assert.ok(ShareState.parse(d.payload()).views.flat().length, key);
  const tabs = ShareState.parse(DEMOS["multi-tab"].payload()).views.flat();
  const ids = Object.fromEntries(tabs.map(t => [t.name, L.detect(t.name, t.text).id]));
  eq(ids, { "README.md": "Markdown", "app.py": "Python", "snippet": "Go", "query.sql": "SQL", "config.yaml": "YAML", "deploy": "Shell" });
  assert.equal(DEMOS.large.payload().views[0][0].t.split("\n").length, 50001);
  assert.throws(() => OutputOps.get("json-pretty").run(DEMOS["json-broken"].payload().views[0][0].t), e => e.line === 6);
});

test("local files: CRLF / BOM / binary detected on read and restored on save", async () => {
  const crlf = await LocalFs.readText(new File([String.fromCharCode(0xfeff) + "a\r\nb\r\n"], "x.txt"));
  eq([crlf.text, crlf.eol, crlf.bom, crlf.binary], ["a\nb\n", "\r\n", true, false]);
  assert.equal(Buffer.from(LocalFs.encode(crlf.text, crlf)).toString("hex"), "efbbbf610d0a620d0a");
  assert.equal((await LocalFs.readText(new File([new Uint8Array([80, 75, 3, 4, 0, 0])], "z.zip"))).binary, true);
  const cp1252 = await LocalFs.readText(new File([new Uint8Array([99, 97, 102, 0xe9])], "latin.txt"));
  eq([cp1252.enc, cp1252.guessed, cp1252.binary, cp1252.text], ["windows-1252", true, false, "caf" + String.fromCharCode(0xe9)]);
});
