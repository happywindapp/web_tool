// Run: node --test src/one-editor/tests/git-changes-group-pure.test.js — Git panel grouping (GitChanges.group / count / head).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/git-changes-group-pure.js"), "utf8") + "\nglobalThis.GitChanges = GitChanges;", ctx);
const { GitChanges: G } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const files = new Map([["src/b.js", "m"], ["a.txt", "m"], ["new/x.md", "a"], ["old.txt", "d"], ["tmp/u.log", "u"], ["keep.txt", "c"], ["z", "i"]]);

test("groups in order m · a · d · u, clean / unknown codes dropped, sorted by path", () => {
  const g = plain(G.group(files));
  assert.deepEqual(g.map(x => x.code), ["m", "a", "d", "u"]);
  assert.deepEqual(g[0].items.map(x => x.path), ["a.txt", "src/b.js"]);
  assert.deepEqual(g[0].items[1], { path: "src/b.js", code: "m", name: "b.js", dir: "src" });
  assert.equal(g[0].items[0].dir, "");
});

test("query filters by path, any case; empty groups vanish", () => {
  const g = plain(G.group(files, "  SRC/ "));
  assert.equal(g.length, 1);
  assert.deepEqual(g[0].items.map(x => x.name), ["b.js"]);
  assert.deepEqual(plain(G.group(files, "nothing")), []);
});

test("count = changed files only; head = branch or short oid", () => {
  assert.equal(G.count(files), 5);
  assert.equal(G.count(new Map()), 0);
  assert.equal(G.head("main", ""), "main");
  assert.equal(G.head(null, "0123456789abcdef"), "0123456");
  assert.equal(G.head(null, ""), "?");
});
