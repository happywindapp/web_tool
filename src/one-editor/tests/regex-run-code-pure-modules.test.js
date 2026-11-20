// Run: node --test src/one-editor/tests/regex-run-code-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const T = (s, p) => p ? s.replace(/\{(\w+)\}/g, (m, k) => k in p ? String(p[k]) : m) : s;
const ctx = vm.createContext({ T });
const src = f => fs.readFileSync(path.join(root, f), "utf8");
vm.runInContext(["js/extras/regex-tester-core.js", "js/extras/sandbox-loop-guard.js"].map(src).join("\n;\n") + "\n;Object.assign(globalThis, { RegexCore, LoopGuard });", ctx);
const { RegexCore, LoopGuard } = ctx;
const j = v => JSON.parse(JSON.stringify(v));

test("regex: matches with numbered + named groups and offsets, g vs first only, empty matches advance", () => {
  const text = "ACME=100 GLOBX=50 x=1";
  const r = RegexCore.matches(text, RegexCore.compile("(?<sym>[A-Z]{3,6})=(\\d+)", "g"));
  assert.deepEqual(j(r.list.map(m => [m.at, m.text, m.groups.map(g => [g.n, g.name, g.at, g.text])])), [
    [0, "ACME=100", [[1, "sym", 0, "ACME"], [2, "", 5, "100"]]], [9, "GLOBX=50", [[1, "sym", 9, "GLOBX"], [2, "", 15, "50"]]]]);
  assert.equal(RegexCore.matches(text, RegexCore.compile("\\d+", "")).list.length, 1, "no g → first match only");
  assert.equal(RegexCore.matches("abc", RegexCore.compile("x*", "g")).list.length, 4, "empty matches do not loop forever");
  assert.equal(RegexCore.matches("a".repeat(10), RegexCore.compile("a", "g"), 3).more, true);
  assert.equal(RegexCore.matches("(a)[b]", RegexCore.compile("\\((?<x>a)\\)[[(]b]", "g")).list[0]?.groups[0].name, "x", "escaped ( and [class] are no groups");
  assert.equal(RegexCore.replace("2026-11-20", RegexCore.compile("(\\d+)-(\\d+)-(\\d+)", "g"), "$3/$2/$1\\n"), "20/11/2026\n");
  assert.throws(() => RegexCore.compile("(", "g"), /Regex/);
  assert.throws(() => RegexCore.compile("a", "gg"), /g i m/);
});

test("regex explain: tokens, groups numbered, quantifiers, classes, lookaround, literal runs", () => {
  const e = RegexCore.explain("^(?<id>ORD)-\\d{4,}(?:x|y)?[^a-z]+?(?=\\s)abc$");
  assert.deepEqual(j(e.map(x => x.tok)), ["^", "(?<id>", "ORD", ")", "-", "\\d", "{4,}", "(?:", "x", "|", "y", ")", "?", "[^a-z]", "+?", "(?=", "\\s", ")", "abc", "$"]);
  assert.match(e[1].desc, /nhóm bắt 1 tên “id”/);
  assert.match(e[6].desc, /4 lần trở lên/);
  assert.match(e[14].desc, /lười/);
});

test("loop guard: while / for / do-while conditions guarded, strings / comments / regex / templates skipped, lines kept", () => {
  const code = [
    "let s = 'while (x) {}'; // for (;;)",
    "/* while(1) */ const re = /for\\(/g, t = `while ${ 1 + [1].map(x => { return x; }) } (y)`;",
    "while (i < 3) i++;",
    "for (let k = 0; k < n; k++) {}",
    "for (;;) { break; }",
    "do { i-- } while (i > 0, i > 1)",
    "for (const x of list) {}",
    "obj.while(1); a.for = 2;",
    "for await (const x of g()) {}",
  ].join("\n");
  const g = LoopGuard.insert(code, "G");
  assert.equal(g.count, 4);
  assert.equal(g.code.split("\n").length, code.split("\n").length, "no line added");
  const out = g.code.split("\n");
  assert.equal(out[0], code.split("\n")[0]);
  assert.equal(out[1], code.split("\n")[1]);
  assert.equal(out[2], "while (G() && (i < 3)) i++;");
  assert.equal(out[3], "for (let k = 0; G() && ( k < n); k++) {}");
  assert.equal(out[4], "for (; G() ;) { break; }");
  assert.equal(out[5], "do { i-- } while (G() && (i > 0, i > 1))");
  assert.equal(out[6], code.split("\n")[6], "for-of left alone");
  assert.equal(out[7], code.split("\n")[7], "property names left alone");
  new Function(g.code.replace(/^for await.*$/m, ""));
});

test("loop guard: a guarded endless loop throws once the guard says so", () => {
  let calls = 0;
  const G = () => { if (++calls > 1000) throw new Error("stopped"); return true; };
  const run = new Function("G", LoopGuard.insert("let i = 0; while (true) { i++; } return i;", "G").code);
  assert.throws(() => run(G), /stopped/);
  assert.equal(new Function("G", LoopGuard.insert("let n = 0; for (let i = 0; i < 5; i++) n += i; return n;", "G").code)(() => true), 10, "normal loops unchanged");
});
