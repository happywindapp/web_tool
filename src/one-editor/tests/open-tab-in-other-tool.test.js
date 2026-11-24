// Run: node --test src/one-editor/tests/open-tab-in-other-tool.test.js — which page / tab / payload each target tool gets for a tab.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({});
for (const f of ["js/core/share-link-state.js", "js/workbench/open-tab-in-other-tool.js", "js/workbench/editor-selection-actions.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
const { OpenInTool, SelectionActions } = vm.runInContext("({ OpenInTool, SelectionActions })", ctx);
const src = (lang, extra = {}) => ({ name: "a", lang, autoLang: "", text: "x", drawio: false, wrap: false, ...extra });
const plain = o => JSON.parse(JSON.stringify(o));

test("Data Workbench tab follows the language", () => {
  assert.equal(OpenInTool.target("workbench", src("JSON")).search, "?tab=format");
  assert.deepEqual(plain(OpenInTool.target("workbench", src("TSV")).payload), { tab: "csv", text: "x" });
  assert.equal(OpenInTool.target("workbench", src("JavaScript")).search, "?tab=code");
  assert.equal(OpenInTool.target("workbench", src("Plain Text")).page, "data-workbench.html");
});

test("Diagram Editor engine: diagram language, draw.io XML, else Mermaid", () => {
  assert.deepEqual(plain(OpenInTool.target("diagram", src("PlantUML")).payload), { tab: "plantuml", code: "x" });
  assert.equal(OpenInTool.target("diagram", src("XML", { drawio: true })).search, "?tab=drawio");
  assert.equal(OpenInTool.target("diagram", src("JSON")).payload.tab, "mermaid");
});

test("FIX Parser gets the text; One Editor gets its own share payload", () => {
  assert.deepEqual(plain(OpenInTool.target("fix", src("FIX")).payload), { text: "x" });
  const p = plain(OpenInTool.target("oneEditor", src("JSON", { name: "n.json", autoLang: "JSON", wrap: true })).payload);
  assert.deepEqual(p, { v: 1, views: [[{ n: "n.json", l: "JSON", t: "x" }], []], layout: "", wrap: true });
});

test("every listed tool has a target page", () => {
  for (const t of OpenInTool.TOOLS) assert.match(OpenInTool.target(t.id, src("JSON")).page, /^[a-z-]+\.html$/);
});

test("Ask AI URL: ?q= carries the encoded text, too long or no ?q= ⇒ bare site (clipboard)", () => {
  const ai = n => SelectionActions.AI.find(a => a.name === n);
  assert.equal(SelectionActions.aiUrl(ai("ChatGPT"), "a&b c"), "https://chatgpt.com/?q=a%26b%20c");
  assert.equal(SelectionActions.aiUrl(ai("Gemini"), "x"), "https://gemini.google.com");
  assert.equal(SelectionActions.aiUrl(ai("Copilot M365"), "x"), "https://copilot.cloud.microsoft");
  assert.equal(SelectionActions.aiUrl(ai("Google"), "NATS"), "https://www.google.com/search?q=NATS");
  assert.equal(SelectionActions.aiUrl(ai("Perplexity"), "x".repeat(7000)), "https://www.perplexity.ai/search");
});

test("selected text joins non-empty ranges with new lines", () => {
  const doc = "hello world\nsecond";
  const v = { state: { selection: { ranges: [{ from: 0, to: 5, empty: false }, { from: 6, to: 6, empty: true }, { from: 12, to: 18, empty: false }] }, sliceDoc: (a, b) => doc.slice(a, b) } };
  assert.equal(SelectionActions.text(v), "hello\nsecond");
  assert.equal(SelectionActions.text(null), "");
});
