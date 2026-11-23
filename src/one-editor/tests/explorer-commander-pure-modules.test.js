// Run: node --test src/one-editor/tests/explorer-commander-pure-modules.test.js — phase 11 pure modules: Group by buckets + column filter + age colours (FolderGroups), settings registry (Settings), colour tags (TagMap).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({});
for (const f of ["js/core/explorer-name-match-pure.js", "js/core/explorer-group-and-column-filter-pure.js", "js/core/settings-registry.js", "js/core/explorer-color-tags-pure.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
vm.runInContext("globalThis.FolderGroups = FolderGroups; globalThis.Settings = Settings; globalThis.TagMap = TagMap;", ctx);
const { FolderGroups: G, Settings: S, TagMap: M } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));

test("family: by extension, folders and unknown apart", () => {
  assert.equal(G.family("app.TS"), "code");
  assert.equal(G.family("data.json"), "data");
  assert.equal(G.family("README.md"), "doc");
  assert.equal(G.family("logo.svg"), "image");
  assert.equal(G.family("site.tar.gz"), "archive");
  assert.equal(G.family("tool.exe"), "binary");
  assert.equal(G.family("Makefile"), "other");
  assert.equal(G.family(".gitignore"), "other", "a leading dot is no extension");
  assert.equal(G.family("src", true), "folder");
});

test("date: today / yesterday / this week / this month / older, local calendar days", () => {
  const now = new Date(2026, 10, 25, 15, 0).getTime(); // Wednesday 25 Nov 2026
  const at = (d, h = 12) => new Date(2026, 10, d, h).getTime();
  assert.equal(G.date(at(25, 0), now), "today");
  assert.equal(G.date(at(26), now), "today", "future counts as today");
  assert.equal(G.date(at(24, 23), now), "yesterday");
  assert.equal(G.date(at(23, 1), now), "week", "Monday of this week");
  assert.equal(G.date(at(22, 23), now), "month", "Sunday belongs to last week");
  assert.equal(G.date(at(1, 0), now), "month");
  assert.equal(G.date(new Date(2026, 9, 31, 23).getTime(), now), "older");
  assert.equal(G.date(null, now), "none");
  const monday = new Date(2026, 10, 23, 9).getTime();
  assert.equal(G.date(new Date(2026, 10, 22, 20).getTime(), monday), "yesterday", "yesterday wins over last week");
  assert.equal(G.date(new Date(2026, 10, 1, 9).getTime(), new Date(2026, 10, 1, 18).getTime()), "today");
});

test("size: Windows buckets", () => {
  assert.equal(G.size(0), "empty");
  assert.equal(G.size(16 * 1024 - 1), "tiny");
  assert.equal(G.size(16 * 1024), "small");
  assert.equal(G.size(1048576), "medium");
  assert.equal(G.size(128 * 1048576), "large");
  assert.equal(G.size(10, true), "none");
  assert.equal(G.size(null), "none");
});

test("group: first-seen order, or a fixed order with unknown keys last", () => {
  const items = ["b1", "a1", "b2", "c1", "a2"];
  assert.deepEqual(plain(G.group(items, s => s[0])), [{ key: "b", items: ["b1", "b2"] }, { key: "a", items: ["a1", "a2"] }, { key: "c", items: ["c1"] }]);
  assert.deepEqual(plain(G.group(items, s => s[0], ["a", "b"]).map(g => g.key)), ["a", "b", "c"]);
  assert.deepEqual(plain(G.group([], s => s)), []);
});

test("passes: every non-empty column set must hold the item's value", () => {
  const val = (it, col) => it[col];
  const it = { type: "code", size: "tiny" };
  assert.equal(G.passes(it, {}, val), true);
  assert.equal(G.passes(it, { type: new Set(["code", "doc"]) }, val), true);
  assert.equal(G.passes(it, { type: new Set(["code"]), size: new Set(["large"]) }, val), false);
  assert.equal(G.passes(it, { type: new Set() }, val), true, "empty set = no filter");
});

test("Settings: add checks id, group and type", () => {
  const box = { v: true };
  S.add({ id: "t.wrap", group: "editor", label: "Xuống dòng mềm", hint: "Gói dòng dài trong khung", get: () => box.v, set: v => { box.v = v; }, def: true });
  assert.throws(() => S.add({ id: "t.wrap", group: "editor", label: "x", get() {}, set() {} }), /duplicate/);
  assert.throws(() => S.add({ id: "t.bad", group: "nope", label: "x", get() {}, set() {} }), /group/);
  assert.throws(() => S.add({ id: "t.bad2", group: "editor", type: "color", label: "x", get() {}, set() {} }), /type/);
  assert.equal(S.entry("t.wrap").type, "bool");
});

test("Settings: borrowed value, defaults, reset and change listener", async () => {
  const src = { font: 13 };
  let calls = 0;
  S.onChange(() => { calls++; });
  S.add({ id: "t.font", group: "editor", type: "number", label: "Cỡ chữ editor", get: () => src.font, set: v => { src.font = v; }, def: 13, min: 9, max: 28 });
  const e = S.entry("t.font");
  assert.equal(S.isDefault(e), true);
  src.font = 20;
  assert.equal(S.isDefault(e), false, "a change made elsewhere shows at once");
  await S.set(e, 99);
  assert.equal(src.font, 28, "clamped to max");
  await S.set(e, "abc");
  assert.equal(src.font, 28, "not a number ⇒ ignored");
  await S.set(e, "  ");
  assert.equal(src.font, 28, "emptied box ⇒ ignored, not the minimum");
  await S.reset(e);
  assert.equal(src.font, 13);
  assert.ok(calls >= 2);
  const before = calls;
  await S.reset(e);
  assert.equal(calls, before, "reset at the default does nothing");
});

test("Settings: info entries have no default; reset of a group", async () => {
  const a = { v: false }, b = { v: "x" };
  S.add({ id: "t.info", group: "data", type: "info", label: "Dung lượng đã dùng", get: () => "1 MB" });
  S.add({ id: "t.a", group: "keys", label: "Vim", get: () => a.v, set: v => { a.v = v; }, def: false });
  S.add({ id: "t.b", group: "keys", type: "choice", label: "Bộ phím", choices: () => [["x", "X"], ["y", "Y"]], get: () => b.v, set: v => { b.v = v; }, def: "x" });
  assert.equal(S.hasDefault(S.entry("t.info")), false);
  assert.equal(S.isDefault(S.entry("t.info")), true);
  a.v = true; b.v = "y";
  await S.resetGroup("keys");
  assert.deepEqual([a.v, b.v], [false, "x"]);
});

test("Settings: search Vietnamese without accents, English through tr, every word", () => {
  const tr = s => ({ "Xuống dòng mềm": "Word wrap", "Gói dòng dài trong khung": "Wrap long lines", "Cỡ chữ editor": "Editor font size" })[s] || s;
  const ids = q => plain(S.search(q, tr).map(e => e.id));
  assert.deepEqual(ids("xuong dong"), ["t.wrap"]);
  assert.deepEqual(ids("WRAP"), ["t.wrap"]);
  assert.deepEqual(ids("font size"), ["t.font"]);
  assert.deepEqual(ids("font wrap"), []);
  assert.ok(ids("phim tat").includes("t.a"), "group name matches");
  assert.deepEqual(ids("   "), []);
});

test("age: within the hour / earlier today / 7 days / older", () => {
  const now = new Date(2026, 10, 25, 15, 0).getTime();
  assert.equal(G.age(now - 10 * 60e3, now), "hour");
  assert.equal(G.age(now + 60e3, now), "hour", "future counts as just changed");
  assert.equal(G.age(new Date(2026, 10, 25, 9).getTime(), now), "today");
  assert.equal(G.age(new Date(2026, 10, 24, 23).getTime(), now), "week", "yesterday is within 7 days");
  assert.equal(G.age(now - 6.9 * 864e5, now), "week");
  assert.equal(G.age(now - 7.1 * 864e5, now), "");
  assert.equal(G.age(null, now), "");
  const early = new Date(2026, 10, 25, 0, 30).getTime();
  assert.equal(G.age(new Date(2026, 10, 24, 23, 50).getTime(), early), "hour", "the hour wins over the calendar day");
});

test("TagMap: colour words in Vietnamese / English, accents and separators ignored", () => {
  assert.equal(M.colorOf("Đỏ"), "red");
  assert.equal(M.colorOf("do"), "red");
  assert.equal(M.colorOf("RED"), "red");
  assert.equal(M.colorOf("xanh-lá"), "green");
  assert.equal(M.colorOf("xanh lá"), "green");
  assert.equal(M.colorOf("xanh"), null, "green or blue: ambiguous");
  assert.equal(M.colorOf("xanh dương"), "blue");
  assert.equal(M.colorOf("tím"), "purple");
  assert.equal(M.colorOf("pink"), null);
  assert.equal(M.colorOf(""), null);
});

test("TagMap: query splits tag: words from the name filter", () => {
  const q = s => { const r = M.query(s); return { colors: r.colors && [...r.colors].sort(), rest: r.rest }; };
  assert.deepEqual(plain(q("*.md")), { colors: null, rest: "*.md" });
  assert.deepEqual(plain(q("tag:đỏ")), { colors: ["red"], rest: "" });
  assert.deepEqual(plain(q("tag:red;*.md")), { colors: ["red"], rest: "*.md" });
  assert.deepEqual(plain(q("readme TAG:Blue tag:tim")), { colors: ["blue", "purple"], rest: "readme" });
  assert.deepEqual(plain(q("tag:")), { colors: ["*"], rest: "" }, "no colour = any tag");
  assert.deepEqual(plain(q("tag:pink")), { colors: [], rest: "" }, "unknown colour lets nothing through");
  assert.deepEqual(plain(q("mytag:red")), { colors: null, rest: "mytag:red" }, "only a whole word");
  const any = M.query("tag:").colors, red = M.query("tag:do").colors;
  assert.equal(M.hits(any, "green"), true);
  assert.equal(M.hits(any, null), false);
  assert.equal(M.hits(red, "red"), true);
  assert.equal(M.hits(red, "blue"), false);
});

test("TagMap: put / move / drop keep the path map in step", () => {
  let m = M.put({}, ["p/a.txt", "p/src", "p/src/x.js"], "red");
  m = M.put(m, ["p/src/y.js"], "blue");
  assert.deepEqual(plain(m), { "p/a.txt": "red", "p/src": "red", "p/src/x.js": "red", "p/src/y.js": "blue" });
  assert.deepEqual(plain(M.put(m, ["p/a.txt"], null)), { "p/src": "red", "p/src/x.js": "red", "p/src/y.js": "blue" }, "null untags");
  const moved = M.move(m, "p/src", "p/lib/src");
  assert.deepEqual(Object.keys(moved).sort(), ["p/a.txt", "p/lib/src", "p/lib/src/x.js", "p/lib/src/y.js"]);
  assert.equal(M.move(m, "p/sr", "p/q"), m, "a name prefix that is not a folder moves nothing");
  assert.equal(M.move(m, "p/none", "p/x"), m);
  const { map, gone } = M.drop(m, ["p/src"]);
  assert.deepEqual(plain(map), { "p/a.txt": "red" });
  assert.deepEqual(plain(gone.map(g => g[0]).sort()), ["p/src", "p/src/x.js", "p/src/y.js"]);
  assert.equal(M.drop(m, ["q"]).map, m);
});

test("TagMap: clean stored data and the entry cap", () => {
  assert.deepEqual(plain(M.clean({ "a": "red", "b": "pink", "": "red", "c": 3 })), { a: "red" });
  assert.deepEqual(plain(M.clean(null)), {});
  const big = Object.fromEntries(Array.from({ length: M.MAX }, (_, i) => ["p/" + i, "red"]));
  assert.equal(M.put(big, ["p/new"], "blue"), null, "over the cap");
  assert.ok(M.put(big, ["p/1"], "blue"), "recolouring is not a new entry");
  assert.equal(Object.keys(M.put(big, ["p/new", "p/1"], null)).length, M.MAX - 1);
});
