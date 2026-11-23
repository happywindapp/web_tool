// Run: node --test src/one-editor/tests/explorer-search-compare-pure.test.js — phase 11e pure parts: folder compare pairing / byte compare / sync plan (DirDiff), search criteria + duplicate groups (FileFind).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({ Blob, Uint8Array, Promise, Date });
for (const f of ["js/core/explorer-folder-compare-pure.js", "js/core/explorer-search-duplicates-pure.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
vm.runInContext("globalThis.DirDiff = DirDiff; globalThis.FileFind = FileFind;", ctx);
const { DirDiff: D, FileFind: F } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const f = (name, size) => ({ name, dir: false, size }), d = name => ({ name, dir: true });

test("match: pairs by name in any case, one-sided folders stay one row, file vs folder = diff", () => {
  const { rows, both } = D.match([f("README.md", 5), d("src"), d("only-left"), f("a.txt", 1), d("x")], [f("readme.MD", 5), d("SRC"), f("b.txt", 2), f("x", 3)]);
  const st = Object.fromEntries(rows.map(r => [r.name, r.st]));
  assert.deepEqual(plain(st), { "README.md": "check", "only-left": "left", "a.txt": "left", x: "diff", "b.txt": "right" });
  assert.deepEqual(plain(both.map(([a, b]) => a.name + "|" + b.name)), ["src|SRC"]);
  assert.deepEqual(plain(D.match([], []).rows), []);
});

test("bySize: different known sizes ⇒ diff, equal or unknown ⇒ check the bytes", () => {
  assert.equal(D.bySize(10, 11), "diff");
  assert.equal(D.bySize(10, 10), "check");
  assert.equal(D.bySize(null, 10), "check");
});

test("equalBlobs: block by block, first differing block decides, stop gives null", async () => {
  const a = new Blob(["hello world, same bytes"]), b = new Blob(["hello world, same bytes"]), c = new Blob(["hello world, SAME bytes"]);
  assert.equal(await D.equalBlobs(a, b, undefined, 4), true);
  assert.equal(await D.equalBlobs(a, c, undefined, 4), false);
  assert.equal(await D.equalBlobs(a, new Blob(["short"])), false);
  assert.equal(await D.equalBlobs(a, b, () => true, 4), null);
  assert.equal(await D.equalBlobs(new Blob([]), new Blob([])), true);
  assert.equal(D.sameBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2])), true);
});

test("plan: left → right copies left-only, overwrites diff, deletes right-only only when asked; = rows stay", () => {
  const rows = [{ st: "left", a: "A1", b: null }, { st: "right", a: null, b: "B2" }, { st: "diff", a: "A3", b: "B3" }, { st: "same", a: "A4", b: "B4" }];
  const ab = D.plan(rows, "ab");
  assert.deepEqual(plain([ab.copy.map(s => s.src), ab.over.map(s => s.src + ">" + s.dst), ab.del.length]), [["A1"], ["A3>B3"], 0]);
  assert.deepEqual(plain(D.plan(rows, "ab", true).del.map(s => s.dst)), ["B2"]);
  const ba = D.plan(rows, "ba", true);
  assert.deepEqual(plain([ba.copy.map(s => s.src), ba.over.map(s => s.src + ">" + s.dst), ba.del.map(s => s.dst)]), [["B2"], ["B3>A3"], ["A1"]]);
});

test("parseSize / parseDay: units, comma decimals, strict dates", () => {
  assert.equal(F.parseSize(""), null);
  assert.equal(F.parseSize("500"), 500);
  assert.equal(F.parseSize("2 KB"), 2048);
  assert.equal(F.parseSize("1,5mb"), 1572864);
  assert.ok(Number.isNaN(F.parseSize("lots")));
  assert.equal(F.parseDay("23/11/2026"), new Date(2026, 10, 23).getTime());
  assert.equal(F.parseDay("2026-11-23"), new Date(2026, 10, 23).getTime());
  assert.ok(Number.isNaN(F.parseDay("31/02/2026")));
  assert.equal(F.parseDay(" "), null);
});

test("meta: kind, size bounds, date presets and range (end day inclusive); folders fail size / date", () => {
  const NOW = new Date(2026, 10, 23, 15, 0).getTime(), DAY = 864e5;
  const m = F.meta({ kind: "file", min: "1 KB", date: "7" }, NOW);
  assert.equal(m.stat, true);
  assert.equal(m.test({ dir: false, size: 2048, mod: NOW - DAY }), true);
  assert.equal(m.test({ dir: false, size: 100, mod: NOW - DAY }), false, "too small");
  assert.equal(m.test({ dir: false, size: 2048, mod: NOW - 8 * DAY }), false, "too old");
  assert.equal(m.test({ dir: true }), false);
  const today = F.meta({ date: "today" }, NOW);
  assert.equal(today.test({ dir: false, size: 1, mod: new Date(2026, 10, 23, 0, 5).getTime() }), true);
  assert.equal(today.test({ dir: false, size: 1, mod: new Date(2026, 10, 22, 23, 59).getTime() }), false);
  const range = F.meta({ date: "range", from: "20/11/2026", to: "21/11/2026" }, NOW);
  assert.equal(range.test({ dir: false, mod: new Date(2026, 10, 21, 23, 0).getTime() }), true);
  assert.equal(range.test({ dir: false, mod: new Date(2026, 10, 22, 0, 0).getTime() }), false);
  const dirs = F.meta({ kind: "dir" }, NOW);
  assert.equal(dirs.stat, false);
  assert.equal(dirs.test({ dir: true }), true);
  assert.equal(dirs.test({ dir: false }), false);
  assert.deepEqual(plain(F.problems({ min: "x" })), ["size"]);
  assert.deepEqual(plain(F.problems({ min: "2 KB", max: "1 KB" })), ["sizeOrder"]);
  assert.deepEqual(plain(F.problems({ date: "range", from: "22/11/2026", to: "20/11/2026" })), ["dateOrder"]);
  assert.deepEqual(plain(F.problems({ date: "range", from: "x" })), ["date"]);
  assert.deepEqual(plain(F.problems({})), []);
});

test("sizeGroups / fnv1a / pick: groups of ≥ 2 by size, empty files optional, keep newest / oldest / shortest", () => {
  const files = [{ p: "a", size: 10 }, { p: "b", size: 10 }, { p: "c", size: 3 }, { p: "e1", size: 0 }, { p: "e2", size: 0 }, { p: "big1", size: 99 }, { p: "big2", size: 99 }];
  assert.deepEqual(plain(F.sizeGroups(files).map(g => g.map(x => x.p).join())), ["big1,big2", "a,b"]);
  assert.equal(F.sizeGroups(files, false).length, 3);
  const enc = s => new TextEncoder().encode(s);
  assert.equal(F.fnv1a(enc("")), 0x811c9dc5);
  assert.equal(F.fnv1a(enc("a")), 0xe40c292c);
  assert.notEqual(F.fnv1a(enc("ab")), F.fnv1a(enc("ba")));
  const g = [{ path: "x/long/name.txt", mod: 3 }, { path: "x/a.txt", mod: 1 }, { path: "x/bb.txt", mod: 2 }];
  assert.deepEqual(plain(F.pick(g, "newest").map(x => x.path)), ["x/a.txt", "x/bb.txt"]);
  assert.deepEqual(plain(F.pick(g, "oldest").map(x => x.path)), ["x/long/name.txt", "x/bb.txt"]);
  assert.deepEqual(plain(F.pick(g, "shortest").map(x => x.path)), ["x/long/name.txt", "x/bb.txt"]);
});
