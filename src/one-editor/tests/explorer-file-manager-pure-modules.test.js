// Run: node --test src/one-editor/tests/explorer-file-manager-pure-modules.test.js — folder tab name matching (filter, type-to-select, ranges) and recycle bin quota rules.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({});
for (const f of ["js/core/explorer-name-match-pure.js", "js/core/explorer-trash-quota-pure.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
vm.runInContext("globalThis.NameMatch = NameMatch; globalThis.TrashQuota = TrashQuota;", ctx);
const { NameMatch, TrashQuota } = ctx;
const NAMES = ["docs", "src", "README.md", "readme-old.txt", "Report.md", "app.js", "app.test.js", "Bảng giá.csv", "rules.json"];

test("filter: contains, ignores case and accents", () => {
  const f = NameMatch.filter("bang gia");
  assert.deepEqual(NAMES.filter(f), ["Bảng giá.csv"]);
  assert.deepEqual(NAMES.filter(NameMatch.filter("READ")), ["README.md", "readme-old.txt"]);
  assert.equal(NameMatch.filter("  ;  "), null);
});

test("filter: wildcards and several patterns", () => {
  assert.deepEqual(NAMES.filter(NameMatch.filter("*.md")), ["README.md", "Report.md"]);
  assert.deepEqual(NAMES.filter(NameMatch.filter("*.md; *.json")), ["README.md", "Report.md", "rules.json"]);
  assert.deepEqual(NAMES.filter(NameMatch.filter("app.??t.js")), []);
  assert.deepEqual(NAMES.filter(NameMatch.filter("app.?es?.js")), ["app.test.js"]);
  assert.deepEqual(NAMES.filter(NameMatch.filter("a(b")), [], "regex characters are literal");
});

test("seek: prefix from the focused item, one letter goes to the next match", () => {
  assert.equal(NameMatch.seek(NAMES, "re", -1), 2);
  assert.equal(NameMatch.seek(NAMES, "rep", 2), 4);
  assert.equal(NameMatch.seek(NAMES, "r", 2), 3);
  assert.equal(NameMatch.seek(NAMES, "r", 8), 2, "wraps around");
  assert.equal(NameMatch.seek(NAMES, "zz", 0), -1);
  assert.equal(NameMatch.seek(NAMES, "b", -1), 7, "accent-insensitive");
});

test("seek: a repeated letter cycles when no name starts with it twice", () => {
  assert.equal(NameMatch.seek(NAMES, "rr", 2), 3);
  assert.equal(NameMatch.seek(["llama", "lib", "log"], "ll", 1), 0, "a real prefix wins over cycling");
});

test("range: anchor to target either way", () => {
  assert.deepEqual([...NameMatch.range(NAMES, "src", "readme-old.txt")], ["src", "README.md", "readme-old.txt"]);
  assert.deepEqual([...NameMatch.range(NAMES, "Report.md", "README.md")], ["README.md", "readme-old.txt", "Report.md"]);
  assert.deepEqual([...NameMatch.range(NAMES, "gone", "src")], ["src"]);
  assert.deepEqual([...NameMatch.range(NAMES, "src", "gone")], []);
});

test("trash: per-delete cap", () => {
  const { MB } = TrashQuota;
  assert.equal(TrashQuota.fits(100 * MB, 2000), true);
  assert.equal(TrashQuota.fits(100 * MB + 1, 1), false);
  assert.equal(TrashQuota.fits(1, 2001), false);
});

test("trash: drops expired items, then the oldest over the total", () => {
  const { MB } = TrashQuota, now = Date.parse("2026-11-23T00:00:00Z"), day = 864e5;
  const recs = [
    { id: "old", at: now - 31 * day, size: 1 },
    { id: "a", at: now - 3 * day, size: 200 * MB },
    { id: "b", at: now - 2 * day, size: 200 * MB },
    { id: "c", at: now - day, size: 50 * MB },
  ];
  assert.deepEqual([...TrashQuota.drops(recs, 0, now)], ["old"]);
  assert.deepEqual([...TrashQuota.drops(recs, 60 * MB, now)], ["old", "a"]);
  assert.deepEqual([...TrashQuota.drops(recs, 300 * MB, now)], ["old", "a", "b"]);
});

test("trash: free names like Windows restore", async () => {
  const taken = list => async n => list.includes(n);
  assert.equal(await TrashQuota.freeName("a.txt", false, taken([])), "a.txt");
  assert.equal(await TrashQuota.freeName("a.txt", false, taken(["a.txt", "a (2).txt"])), "a (3).txt");
  assert.equal(await TrashQuota.freeName("v1.2", true, taken(["v1.2"])), "v1.2 (2)");
  assert.equal(await TrashQuota.freeName(".gitignore", false, taken([".gitignore"])), ".gitignore (2)");
});
