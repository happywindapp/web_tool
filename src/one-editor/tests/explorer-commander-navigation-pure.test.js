// Run: node --test src/one-editor/tests/explorer-commander-navigation-pure.test.js — phase 11c pure parts: Group by / column filter buckets (FolderGroups.bucket / orderKeys / groupBy), history jumps + recent folders (FolderNav).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");
const ctx = vm.createContext({});
for (const f of ["js/core/explorer-group-and-column-filter-pure.js", "js/core/explorer-history-hotlist-pure.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
vm.runInContext("globalThis.FolderGroups = FolderGroups; globalThis.FolderNav = FolderNav;", ctx);
const { FolderGroups: G, FolderNav: N } = ctx;
const plain = v => JSON.parse(JSON.stringify(v));
const NOW = new Date(2026, 10, 20, 15, 0).getTime(), DAY = 864e5;

test("bucket: type = extension, folders apart, date / size buckets", () => {
  assert.equal(G.bucket("type", { name: "App.JS" }), "js");
  assert.equal(G.bucket("type", { name: "Makefile" }), "");
  assert.equal(G.bucket("type", { name: "src", dir: true }), "folder");
  assert.equal(G.bucket("date", { name: "a", mod: NOW - 3600e3 }, NOW), "today");
  assert.equal(G.bucket("date", { name: "a", mod: NOW - DAY }, NOW), "yesterday");
  assert.equal(G.bucket("date", { name: "a" }, NOW), "none", "date not read yet");
  assert.equal(G.bucket("date", { name: "d", dir: true, mod: NOW }, NOW), "folder");
  assert.equal(G.bucket("size", { name: "a", size: 0 }), "empty");
  assert.equal(G.bucket("size", { name: "a", size: 20000 }), "small");
  assert.equal(G.bucket("size", { name: "d", dir: true, size: 5 }), "folder");
  assert.equal(G.bucket("none", { name: "a.js" }), "");
});

test("orderKeys: folders first, types A–Z with no extension last, dates / sizes in Windows order", () => {
  assert.deepEqual(plain(G.orderKeys("type", ["md", "", "folder", "css", "js"])), ["folder", "css", "js", "md", ""]);
  assert.deepEqual(plain(G.orderKeys("date", ["older", "none", "today", "folder", "week"])), ["folder", "today", "week", "older", "none"]);
  assert.deepEqual(plain(G.orderKeys("size", ["large", "empty", "folder", "tiny"])), ["folder", "empty", "tiny", "large"]);
});

test("groupBy: groups in display order, items keep the sort order inside", () => {
  const items = [{ name: "b.md", mod: NOW - 40 * DAY }, { name: "src", dir: true }, { name: "a.md", mod: NOW }, { name: "x.js", mod: NOW - DAY }, { name: "c.md", mod: NOW }];
  const byType = G.groupBy(items, "type", x => x, NOW);
  assert.deepEqual(plain(byType.map(g => [g.key, g.items.map(i => i.name)])), [["folder", ["src"]], ["js", ["x.js"]], ["md", ["b.md", "a.md", "c.md"]]]);
  const byDate = G.groupBy(items, "date", x => x, NOW);
  assert.deepEqual(plain(byDate.map(g => [g.key, g.items.map(i => i.name)])), [["folder", ["src"]], ["today", ["a.md", "c.md"]], ["yesterday", ["x.js"]], ["older", ["b.md"]]]);
  assert.deepEqual(plain(G.groupBy([], "size", x => x)), []);
});

test("column filter: passes with bucket values, empty set lets all through", () => {
  const val = (it, col) => G.bucket({ type: "type", mod: "date", size: "size" }[col], it, NOW);
  const picks = { type: new Set(["md", "folder"]), size: new Set() };
  assert.equal(G.passes({ name: "a.md", size: 5 }, picks, val), true);
  assert.equal(G.passes({ name: "a.js", size: 5 }, picks, val), false);
  assert.equal(G.passes({ name: "src", dir: true }, picks, val), true);
  assert.equal(G.passes({ name: "a.md", mod: NOW - 40 * DAY }, { type: new Set(["md"]), mod: new Set(["today"]) }, val), false, "both columns must pass");
});

test("jump: back / forward several steps keeps the history walkable both ways", () => {
  const past = ["r", "r/a", "r/a/b", "r/c"], here = "r/c/d";
  const b1 = N.jump(past, [], here, -1);
  assert.deepEqual(plain(b1), { past: ["r", "r/a", "r/a/b"], next: ["r/c/d"], to: "r/c" });
  const b3 = N.jump(past, ["z"], here, -1, 3);
  assert.equal(b3.to, "r/a");
  assert.deepEqual(plain(b3.past), ["r"]);
  assert.deepEqual(plain(b3.next), ["z", "r/c/d", "r/c", "r/a/b"], "forward goes back to r/a/b first");
  const f = N.jump(b3.past, b3.next, b3.to, 1, 2);
  assert.deepEqual(plain(f), { past: ["r", "r/a", "r/a/b"], next: ["z", "r/c/d"], to: "r/c" });
  assert.equal(N.jump(past, [], here, -1, 5), null, "history too short");
  assert.equal(N.jump(past, [], here, -1, 0), null);
  assert.equal(N.jump([], [], here, 1), null);
});

test("remember / recent: newest first per root, capped, bad data ignored", () => {
  let e = N.remember(null, "proj/src");
  e = N.remember(e, "proj/docs");
  e = N.remember(e, "proj/src");
  assert.deepEqual(plain(N.recent(e, "proj")), ["proj/src", "proj/docs"]);
  e = N.remember(e, "2024/a");
  assert.deepEqual(plain(e.map(x => x[0])), ["2024", "proj"], "a numeric root name keeps its place");
  const many = Array.from({ length: 25 }, (_, i) => "p/" + i).reduce((acc, p) => N.remember(acc, p), []);
  assert.equal(N.recent(many, "p").length, 20);
  assert.equal(N.recent(many, "p")[0], "p/24");
  const roots = Array.from({ length: 22 }, (_, i) => "r" + i + "/x").reduce((acc, p) => N.remember(acc, p, 20, 20), []);
  assert.equal(roots.length, 20);
  assert.equal(roots[0][0], "r21");
  assert.deepEqual(plain(N.recent({ proj: ["x"] }, "proj")), [], "old object shape is ignored");
  assert.deepEqual(plain(N.recent([["proj", ["a", 5, "b"]], "junk"], "proj")), ["a", "b"]);
});
