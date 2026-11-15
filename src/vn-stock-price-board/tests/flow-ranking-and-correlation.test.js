// FlowRank (foreign / proprietary net flows) + Correlation (watchlist daily returns). Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(["foreign-proprietary-flow-ranking.js", "watchlist-return-correlation.js"].map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { FlowRank, Correlation };", ctx);
const { FlowRank: F, Correlation: C } = ctx.M;

test("flow ranking: both finfo row shapes, sums over chosen dates, exchange filter, top lists", () => {
  const rows = [
    { tradingDate: "2026-11-13", code: "AAA", floor: "HOSE", netVal: 5e9, buyVal: 6e9, sellVal: 1e9 },
    { tradingDate: "2026-11-12", code: "AAA", floor: "HOSE", netVal: -2e9, buyVal: 1e9, sellVal: 3e9 },
    { tradingDate: "2026-11-13", code: "BBB", floor: "HNX", netVal: -4e9, buyVal: 0, sellVal: 4e9 },
    { date: "2026-11-11", code: "CCC", floor: "HOSE", netVal: 1e9, buyingVal: 1e9, sellingVal: 0 },
  ].map(F.norm);
  assert.deepEqual([...F.lastDates(rows, 2)], ["2026-11-13", "2026-11-12"]);
  assert.equal(rows[3].buy, 1e9);
  const r = F.rank(F.sum(rows, F.lastDates(rows, 2)));
  assert.equal(r.buy[0].code, "AAA"); assert.equal(r.buy[0].net, 3e9); assert.equal(r.sell[0].code, "BBB"); assert.equal(r.tot.net, -1e9);
  assert.equal(F.rank(F.sum(rows, ["2026-11-13"], "HNX")).buy.length, 0);
});

test("correlation: identical / opposite / unrelated series, pairs skip the benchmark", () => {
  const T0 = 1.7e9, mk = f => Array.from({ length: 60 }, (_, i) => ({ time: T0 + i * 86400, close: 100 * f(i) }));
  const a = mk(i => 1 + 0.02 * Math.sin(i)), b = mk(i => 1 + 0.02 * Math.sin(i)), c = mk(i => 1 / (1 + 0.02 * Math.sin(i))), d = mk(i => 1 + 0.01 * (i % 2));
  assert.ok(C.pearson(C.returns(a), C.returns(b)) > 0.999);
  assert.ok(C.pearson(C.returns(a), C.returns(c)) < -0.9);
  assert.equal(C.pearson(C.returns(a), C.returns(a.slice(0, 10))), null);
  const m = C.matrix([{ sym: "IDX", bars: a }, { sym: "B", bars: b }, { sym: "C", bars: c }, { sym: "D", bars: d }]);
  assert.equal(m.m[1][1], 1); assert.equal(m.m[1][2], m.m[2][1]);
  assert.equal(m.pairs.length, 3); assert.ok(m.pairs.every(p => p.a !== "IDX"));
  assert.ok(m.pairs[0].r >= m.pairs[2].r);
});
