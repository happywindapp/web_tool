// Run: node --test src/one-editor/tests/todo-tag-scan-pure.test.js — TODO / FIXME panel scan (TodoScan.tags / regex / scan / tone / byTag).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/todo-tag-scan-pure.js"), "utf8") + "\nglobalThis.TodoScan = TodoScan;", ctx);
const { TodoScan: S } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const re = S.regex(S.DEFAULT);

test("tags: comma list cleaned, upper-cased, unique; junk or empty ⇒ defaults", () => {
  assert.deepEqual(plain(S.tags("todo, Fixme,  NOTE, todo")), ["TODO", "FIXME", "NOTE"]);
  assert.deepEqual(plain(S.tags("  ,  ")), plain(S.DEFAULT));
  assert.deepEqual(plain(S.tags("a b, <x>")), plain(S.DEFAULT));
  assert.deepEqual(plain(S.tags(null)), plain(S.DEFAULT));
});

test("comment marks of many languages match, with line / col / tag / note", () => {
  const text = [
    "const a = 1; // TODO: rename a",
    "# FIXME(bob) handle None",
    "<!-- HACK remove after launch -->",
    "/* XXX: slow path */",
    " * BUG off by one",
    "-- TODO add index",
    "; TODO ini key",
    "REM TODO batch",
    "TODO: line start in Markdown",
  ].join("\n");
  const hits = plain(S.scan(text, re));
  assert.deepEqual(hits.map(h => h.tag), ["TODO", "FIXME", "HACK", "XXX", "BUG", "TODO", "TODO", "TODO", "TODO"]);
  assert.deepEqual(hits[0], { line: 1, col: 17, tag: "TODO", note: "rename a" });
  assert.equal(hits[1].note, "bob) handle None");
  assert.equal(hits[2].note, "remove after launch");
  assert.equal(hits[3].note, "slow path");
  assert.equal(hits[8].line, 9);
});

test("prose does not match: todoList, TODO.md, lower case, no comment mark, TODO-list", () => {
  const text = "const todoList = [];\nSee TODO.md for details\nTODO.md lists it\n// todo lower case\nwe should TODO this\n// TODO-list item\nx = TODOS";
  assert.deepEqual(plain(S.scan(text, re)), []);
});

test("max caps the hits; long lines are skipped", () => {
  assert.equal(S.scan("// TODO a\n// TODO b\n// TODO c", re, 2).length, 2);
  assert.equal(S.scan("// TODO " + "x".repeat(5000), re).length, 0);
});

test("custom tags and tones; byTag keeps the tag-list order", () => {
  const r2 = S.regex(["NOTE", "TODO"]);
  assert.equal(S.scan("// NOTE: keep", r2)[0].tag, "NOTE");
  assert.equal(S.tone("FIXME"), "todo-bad");
  assert.equal(S.tone("HACK"), "todo-warn");
  assert.equal(S.tone("TODO"), "todo-acc");
  const groups = [{ key: "a", hits: [{ tag: "TODO" }, { tag: "FIXME" }] }, { key: "b", hits: [{ tag: "FIXME" }] }];
  const t = S.byTag(groups, ["FIXME", "TODO", "HACK"]);
  assert.deepEqual(plain(t.map(x => x.tag + ":" + x.items.length)), ["FIXME:2", "TODO:1"]);
});
