// Run: node --test src/one-editor/tests/my-library-import-export-pure.test.js — My library file (MyLibrary.parse / pack / merge / clashes / uniqueName).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/my-library-import-export-pure.js"), "utf8") + "\nglobalThis.MyLibrary = MyLibrary;", ctx);
const { MyLibrary: M } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const sample = { snippets: [{ prefix: "log", body: "console.log($1)", lang: "JavaScript", desc: "mine" }], macros: { "dup line": [{ c: "copyLineDown" }, { t: "x" }] },
  replaceSets: [{ name: "tabs", rules: [{ find: "\t", repl: "  " }] }], recipes: [{ name: "b64", steps: [{ op: "base64Decode" }] }] };

test("pack → parse round trip keeps all four kinds", () => {
  const back = plain(M.parse(M.pack(sample)));
  assert.deepEqual(back.snippets, sample.snippets);
  assert.deepEqual(back.macros, [{ name: "dup line", steps: [{ c: "copyLineDown" }, { t: "x" }] }]);
  assert.deepEqual(back.replaceSets, sample.replaceSets);
  assert.deepEqual(back.recipes, sample.recipes);
  assert.equal(JSON.parse(M.pack(sample)).version, 1);
});

test("parse refuses junk: bad JSON, wrong version, too big", () => {
  assert.throws(() => M.parse("{oops"), e => e.code === "json");
  assert.throws(() => M.parse('{"version":2}'), e => e.code === "format");
  assert.throws(() => M.parse("null"), e => e.code === "format");
  assert.throws(() => M.parse(" ".repeat(M.MAX_BYTES + 1)), e => e.code === "big");
});

test("parse drops malformed entries and prototype keys; key steps keep only known fields", () => {
  const evil = '{"version":1,"snippets":[{"prefix":" ","body":"x"},{"prefix":"ok","body":1},{"prefix":"a","body":"b","lang":5}],'
    + '"macros":{"__proto__":[{"c":"x"}],"m":[{"k":{"key":"Enter","ctrlKey":true,"onclick":"alert(1)"}},{"z":1},null],"empty":[]},'
    + '"replaceSets":[{"name":"","rules":[]},{"name":"s","rules":"nope"}],"recipes":"x"}';
  const r = plain(M.parse(evil));
  assert.deepEqual(r.snippets, [{ prefix: "a", body: "b", lang: "", desc: "" }]);
  assert.deepEqual(r.macros, [{ name: "m", steps: [{ k: { key: "Enter", code: "", ctrlKey: true } }] }]);
  assert.deepEqual(r.replaceSets, [{ name: "s", rules: [] }]);
  assert.deepEqual(r.recipes, []);
  assert.equal(({}).polluted, undefined);
});

test("merge: replace in place, or keep both renamed; clashes counted", () => {
  const key = x => x.name, old = [{ name: "a", v: 1 }, { name: "b", v: 1 }], inc = [{ name: "a", v: 2 }, { name: "c", v: 2 }];
  assert.equal(M.clashes(old, inc, key), 1);
  assert.deepEqual(plain(M.merge(old, inc, { key, field: "name", replace: true })), [{ name: "a", v: 2 }, { name: "b", v: 1 }, { name: "c", v: 2 }]);
  assert.deepEqual(plain(M.merge(old, inc, { key, field: "name", replace: false })).map(x => x.name), ["a", "b", "a (2)", "c"]);
  const snipKey = s => s.prefix + "\u0000" + s.lang;
  const snips = M.merge([{ prefix: "log", lang: "JS" }], [{ prefix: "log", lang: "JS" }], { key: snipKey, field: "prefix", replace: false, sep: "" });
  assert.deepEqual(plain(snips).map(s => s.prefix), ["log", "log2"]);
  assert.equal(M.uniqueName("x", new Set(["x", "x (2)"])), "x (3)");
});
