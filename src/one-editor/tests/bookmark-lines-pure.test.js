// Run: node --test src/one-editor/tests/bookmark-lines-pure.test.js — bookmark line lists (BookmarkLines.clean / texts).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/bookmark-lines-pure.js"), "utf8") + "\nglobalThis.BookmarkLines = BookmarkLines;", ctx);
const { BookmarkLines: B } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));

test("clean: unique, sorted, positive integers only", () => {
  assert.deepEqual(plain(B.clean([5, 2, 5, 0, -1, 2.5, "3", 9])), [2, 5, 9]);
  assert.deepEqual(plain(B.clean(null)), []);
  assert.deepEqual(plain(B.clean([])), []);
});

test("texts: lines by number across \\n, \\r\\n and \\r, in the order asked", () => {
  const text = "first\r\nsecond\nthird\rfourth";
  assert.deepEqual(plain(B.texts(text, [4, 1, 3])), ["fourth", "first", "third"]);
  assert.deepEqual(plain(B.texts(text, [2])), ["second"]);
});

test("texts: lines past the end and empty lines give empty text", () => {
  assert.deepEqual(plain(B.texts("a\n\nc\n", [2, 4, 9])), ["", "", ""]);
  assert.deepEqual(plain(B.texts("", [1])), [""]);
});

test("texts: long lines are cut at max characters", () => {
  const long = "x".repeat(500);
  assert.equal(B.texts("a\n" + long, [2])[0].length, 200);
  assert.equal(B.texts(long, [1], 10)[0], "xxxxxxxxxx");
});
