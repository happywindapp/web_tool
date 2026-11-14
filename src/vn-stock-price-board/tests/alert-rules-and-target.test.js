// AlertRule (pure) + own-target board columns. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(["quote-price-model.js", "board-columns-and-format.js", "alert-rules-and-target-math.js"].map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { AlertRule, BoardCols };", ctx);
const { AlertRule: A, BoardCols } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));

test("hit: price ≥ / ≤ and day change up / down; no trade never fires", () => {
  const q = { last: 51, pct: 2.5 };
  assert.equal(A.hit({ sym: "X", type: "above", value: 51 }, q), true);
  assert.equal(A.hit({ sym: "X", type: "above", value: 51.1 }, q), false);
  assert.equal(A.hit({ sym: "X", type: "below", value: 51 }, q), true);
  assert.equal(A.hit({ sym: "X", type: "pctUp", value: 2 }, q), true);
  assert.equal(A.hit({ sym: "X", type: "pctDown", value: 2 }, q), false);
  assert.equal(A.hit({ sym: "X", type: "pctDown", value: -2 }, { last: 9, pct: -2 }), true);
  assert.equal(A.hit({ sym: "X", type: "below", value: 100 }, { last: 0, pct: 0 }), false);
  assert.equal(A.hit({ sym: "X", type: "nope", value: 1 }, q), false);
});

test("check: fires once per day, input list untouched", () => {
  const list = [{ id: "a", sym: "X", type: "above", value: 10, fired: "" }, { id: "b", sym: "Y", type: "below", value: 5, fired: "" }];
  const quotes = new Map([["X", { last: 11, pct: 1 }], ["Y", { last: 6, pct: 0 }]]);
  const r1 = A.check(list, quotes, "20261114");
  assert.deepEqual(plain(r1.hits.map(h => h.id)), ["a"]);
  assert.equal(list[0].fired, "");
  assert.equal(r1.list[0].fired, "20261114");
  assert.equal(A.check(r1.list, quotes, "20261114").hits.length, 0);
  assert.equal(A.check(r1.list, quotes, "20261115").hits.length, 1);
  assert.ok(Math.abs(A.upside(60, 50) - 20) < 1e-9);
  assert.equal(A.upside(null, 50), null);
});

test("board target columns appear only with the tg option and show distance to target", () => {
  const q = { sym: "X", ref: 50, last: 40, ceil: 53.5, floor: 46.5, bids: [], asks: [], target: 50 };
  assert.ok(!BoardCols.visible({}).some(c => c.k === "target"));
  const cols = BoardCols.visible({ tg: true }).map(c => c.k), cells = BoardCols.rowCells({ ...q, bids: Array(3).fill({ p: 0, v: 0 }), asks: Array(3).fill({ p: 0, v: 0 }) }, { tg: true });
  assert.deepEqual(plain(cells[cols.indexOf("target")]), { t: "50.00", c: "" });
  assert.deepEqual(plain(cells[cols.indexOf("toTarget")]), { t: "+25.0%", c: "up" });
});
