// Run: node --test src/one-editor/tests/live-preview-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const eq = (a, b, msg) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, msg);
const ctx = vm.createContext({ T: (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext([
  "../data-workbench/js/core/text-utils.js", "../data-workbench/js/parsers/format-detect.js", "js/editor/language-detect.js", "js/core/layout-presets.js",
  "js/core/command-registry.js", "js/core/output-operations.js", "js/core/share-link-state.js", "js/core/demo-samples.js", "js/core/demo-samples-preview.js",
  "js/preview/preview-kind-by-language.js",
].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { LangDetect, OutputOps, ShareState, DEMOS, Commands, PreviewKind });", ctx);
const { LangDetect: L, OutputOps, ShareState, DEMOS, Commands, PreviewKind } = ctx;

test("preview kind: diagram languages map to sandbox engines, others have none", () => {
  const map = { Mermaid: "mermaid", PlantUML: "plantuml", D2: "d2", DBML: "dbml", Structurizr: "structurizr", Graphviz: "graphviz" };
  for (const [lang, engine] of Object.entries(map)) eq(PreviewKind.of(lang), { kind: "diagram", engine }, lang);
  for (const lang of ["JavaScript", "Plain Text", "", "constructor", "__proto__"]) assert.equal(PreviewKind.of(lang), null, lang);
  eq(PreviewKind.config("dbml"), { rankdir: "LR", fields: "all" });
  eq(PreviewKind.config("structurizr", "containers"), { view: "containers" });
  eq(PreviewKind.config("structurizr", 5), {});
  eq(PreviewKind.config("mermaid", "x"), {});
});

test("language detect: Structurizr / Graphviz by extension and content, Mermaid graph TD unchanged", () => {
  assert.equal(L.detect("bank.dsl").id, "Structurizr");
  assert.equal(L.detect("deps.dot").id, "Graphviz");
  assert.equal(L.detect("deps.gv").id, "Graphviz");
  assert.equal(L.detect("", 'workspace "Bank" {\n  model {\n    user = person "Customer"\n  }\n  views {\n  }\n}\n').id, "Structurizr");
  assert.equal(L.detect("", "digraph deps {\n  rankdir=LR;\n  api -> db;\n  api -> cache;\n}\n").id, "Graphviz");
  assert.equal(L.detect("", "strict graph g {\n  a -- b;\n}\n").id, "Graphviz");
  assert.equal(L.detect("", "digraph G\n{\n  a -> b;\n  b -> c;\n  c -> a;\n}\n").id, "Graphviz");
  assert.equal(L.detect("", "graph TD\n  A --> B\n  B --> C\n").id, "Mermaid");
  assert.equal(L.detect("", "graph TD\n  A[Start] --> B{Valid?}\n  B --> C\n").id, "Mermaid");
  assert.equal(L.highlighter("Graphviz"), "");
});

test("output ops: preview is a live op that keeps the source language", () => {
  const op = OutputOps.get("preview");
  assert.ok(op && op.live && op.preview);
  assert.equal(OutputOps.langOf(op, { lang: "Mermaid" }), "Mermaid");
  assert.equal(OutputOps.baseName("flow.mmd ⇢ Preview"), "flow");
});

test("commands: chord Ctrl+K V runs once, the prefix alone is swallowed, other keys pass", () => {
  let ran = 0, typed = 0;
  Commands.add("pv", "Preview", ["Ctrl+k v"], () => ran++);
  const key = (code, mods = {}) => {
    const e = { key: code.replace(/^Key/, "").toLowerCase(), code, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, ...mods,
      target: { closest: () => null }, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() {} };
    Commands.onKey(e);
    if (!e.prevented) typed++;
    return e.prevented;
  };
  assert.equal(key("KeyK", { ctrlKey: true }), true);
  assert.equal(key("KeyV"), true);
  assert.equal(ran, 1);
  assert.equal(key("KeyV"), false);
  key("KeyK", { ctrlKey: true });
  assert.equal(key("KeyA"), false);
  assert.equal(ran, 1);
  assert.equal(typed, 2);
  let saved = 0;
  Commands.add("sv", "Save", "Ctrl+s", () => saved++);
  key("KeyK", { ctrlKey: true });
  assert.equal(key("KeyS", { ctrlKey: true }), true, "Ctrl+K then Ctrl+S still saves");
  assert.equal(saved, 1);
  key("KeyK", { ctrlKey: true });
  vm.runInContext("globalThis.__now = Date.now; Date.now = () => __now() + 2000;", ctx);
  assert.equal(key("KeyV"), false, "an expired chord lets v be typed");
  vm.runInContext("Date.now = __now;", ctx);
  assert.equal(ran, 1);
  assert.equal(Commands.keyLabel({ keys: ["Ctrl+k v"] }), "Ctrl+K V");
  assert.equal(Commands.keyLabel({ keys: ["Ctrl+Shift+p"] }), "Ctrl+Shift+P");
});

test("share link: run=preview survives the round trip, unknown run is dropped", () => {
  const obj = ShareState.build([[{ name: "flow.mmd", lang: "", text: "flowchart LR\n A-->B\n" }], []], false, "2c", false, "preview");
  assert.equal(ShareState.parse(JSON.parse(JSON.stringify(obj))).run, "preview");
  assert.equal(ShareState.parse({ ...obj, run: "rm -rf" }).run, "");
});

test("preview demos: payloads parse and every tab detects as a previewable language", () => {
  const keys = ["mermaid-flow", "mermaid-chart", "mermaid-error", "plantuml-seq", "d2", "dbml"];
  for (const k of keys) {
    assert.ok(DEMOS[k], k);
    const p = ShareState.parse(DEMOS[k].payload());
    for (const t of p.views.flat()) assert.ok(PreviewKind.of(L.detect(t.name, t.text).id), k + " " + t.name);
  }
});
