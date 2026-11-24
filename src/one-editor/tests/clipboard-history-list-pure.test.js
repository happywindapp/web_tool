// Run: node --test src/one-editor/tests/clipboard-history-list-pure.test.js — clipboard history list (ClipList.add / order / pin / remove / clearUnpinned / preview / clean).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/core/clipboard-history-list-pure.js"), "utf8") + "\nglobalThis.ClipList = ClipList;", ctx);
const { ClipList: C } = ctx;
const texts = items => items.map(x => x.text).join("|");

test("add: newest first, empty / whitespace / too big skipped", () => {
  let r = C.add([], "a", "tab1", 1);
  r = C.add(r.items, "b", "tab2", 2);
  assert.equal(texts(r.items), "b|a");
  assert.equal(C.add(r.items, "  \n ", "", 3).skipped, "empty");
  assert.equal(C.add(r.items, "x".repeat(C.MAX_CHARS + 1), "", 3).skipped, "big");
  assert.equal(C.add(r.items, 42, "", 3).skipped, "empty");
});

test("a repeat moves to the top and keeps its id and pin", () => {
  let items = C.add([], "a", "", 1).items;
  items = C.pin(items, items[0].id, true);
  const id = items[0].id;
  items = C.add(items, "b", "", 2).items;
  items = C.add(items, "a", "other", 3).items;
  assert.equal(texts(items), "a|b");
  assert.equal(items[0].id, id);
  assert.equal(items[0].pin, true);
  assert.equal(items[0].src, "other");
});

test("caps: 50 unpinned + 50 pinned, oldest dropped", () => {
  let items = [];
  for (let i = 0; i < 60; i++) items = C.add(items, "t" + i, "", i).items;
  assert.equal(items.length, 50);
  assert.equal(items.at(-1).text, "t10");
  items = C.pin(items, items[0].id, true);
  for (let i = 60; i < 70; i++) items = C.add(items, "t" + i, "", i).items;
  assert.equal(items.filter(x => x.pin).length, 1);
  assert.equal(items.filter(x => !x.pin).length, 50);
});

test("order: pinned first then newest; remove; clearUnpinned", () => {
  let items = ["a", "b", "c"].reduce((l, t, i) => C.add(l, t, "", i).items, []);
  items = C.pin(items, items.find(x => x.text === "a").id, true);
  assert.equal(texts(C.order(items)), "a|c|b");
  assert.equal(texts(C.remove(items, items.find(x => x.text === "c").id)), "b|a");
  assert.equal(texts(C.clearUnpinned(items)), "a");
});

test("preview: 2 lines, long lines cut, more lines marked", () => {
  assert.equal(C.preview("one\ntwo\nthree"), "one\ntwo …");
  assert.equal(C.preview("x".repeat(130), 2, 120), "x".repeat(120) + "…");
  assert.equal(C.preview("solo"), "solo");
});

test("clean: junk dropped, fields bounded, pinned store forces pin", () => {
  const raw = [{ id: "k", text: "ok", t: 5, src: "s", pin: false }, { text: "", t: 1 }, null, { text: "no time" }, { text: "y", t: 2, src: 7, id: 3 }, "str"];
  const out = C.clean(raw, true);
  assert.equal(texts(out), "ok|y");
  assert.ok(out.every(x => x.pin));
  assert.equal(out[1].src, "");
  assert.equal(typeof out[1].id, "string");
  assert.equal(C.clean({ not: "array" }).length, 0);
});
