// Run: node --test src/one-editor/tests/pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s, File, Blob, Uint8Array, TextDecoder });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js",
  "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/providers/local-file-system-access-provider.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { LangDetect, OutputOps, ShareState, DEMOS, LocalFs });", ctx);
const { LangDetect: L, OutputOps, ShareState, DEMOS, LocalFs } = ctx;

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

test("every language id with a highlighter exists in the vendored CodeMirror language-data", () => {
  const dir = path.join(root, "..", "..", "tools", "vendor", "codemirror-6.43.15");
  const cm = { navigator: { userAgent: "node", platform: "", vendor: "" } };
  cm.globalThis = cm;
  vm.createContext(cm);
  vm.runInContext(fs.readFileSync(path.join(dir, "codemirror-core.min.js"), "utf8"), cm);
  vm.runInContext(fs.readFileSync(path.join(dir, "codemirror-languages.min.js"), "utf8"), cm);
  const { LanguageDescription } = cm.CM.language;
  for (const id of L.ids.filter(L.highlighter)) assert.ok(LanguageDescription.matchLanguageName(cm.CM.languages, id, false), id);
});

test("share payload: round trip, untrusted fields dropped", () => {
  const p = ShareState.parse(ShareState.build([[{ name: "a.json", lang: "JSON", text: "{}" }], [{ name: "b", lang: "", text: "x" }]], true));
  assert.deepEqual(JSON.parse(JSON.stringify(p)), { views: [[{ name: "a.json", lang: "JSON", text: "{}" }], [{ name: "b", lang: "", text: "x" }]], wrap: true, run: "" });
  const q = ShareState.parse({ views: [[{ n: "../../etc/passwd", l: "<script>", t: "x", handle: "h" }, { n: "no text" }, 5]], run: "rm -rf", wrap: "yes" });
  assert.equal(q.views[0].length, 1);
  assert.equal(q.views[0][0].name, ".._.._etc_passwd");
  assert.equal(q.views[0][0].lang, "");
  assert.deepEqual([q.run, q.wrap, q.views[1].length], ["", false, 0]);
  assert.throws(() => ShareState.parse({ views: [[], []] }));
  assert.throws(() => ShareState.parse("text"));
  assert.equal(ShareState.parse({ views: [Array.from({ length: 99 }, () => ({ t: "" }))] }).views[0].length, ShareState.MAX_TABS);
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
  assert.deepEqual(ids, { "README.md": "Markdown", "app.py": "Python", "snippet": "Go", "query.sql": "SQL", "config.yaml": "YAML", "deploy": "Shell" });
  assert.equal(DEMOS.large.payload().views[0][0].t.split("\n").length, 50001);
  assert.throws(() => OutputOps.get("json-pretty").run(DEMOS["json-broken"].payload().views[0][0].t), e => e.line === 6);
});

test("local files: CRLF / BOM / binary detected on read and restored on save", async () => {
  const crlf = await LocalFs.readText(new File([String.fromCharCode(0xfeff) + "a\r\nb\r\n"], "x.txt"));
  assert.deepEqual([crlf.text, crlf.eol, crlf.bom, crlf.binary], ["a\nb\n", "\r\n", true, false]);
  assert.equal(LocalFs.encode(crlf.text, crlf), String.fromCharCode(0xfeff) + "a\r\nb\r\n");
  assert.equal((await LocalFs.readText(new File([new Uint8Array([80, 75, 3, 4, 0, 0])], "z.zip"))).binary, true);
  const cp1252 = await LocalFs.readText(new File([new Uint8Array([99, 97, 102, 0xe9])], "latin.txt"));
  assert.deepEqual([cp1252.notUtf8, cp1252.binary], [true, false]);
});
