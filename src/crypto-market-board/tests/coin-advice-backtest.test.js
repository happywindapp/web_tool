// CoinBacktest (pure): trade simulation, fees, no look-ahead, metrics. Run: node --test src/crypto-market-board/tests/coin-advice-backtest.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const stock = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "technical-outlook-scoring.js"].map(f => path.join(__dirname, "../../vn-stock-price-board/js/model", f));
const files = stock.concat(["coin-trade-advice-rules.js", "coin-advice-backtest.js"].map(f => path.join(__dirname, "../js/model", f)));
const ctx = vm.createContext({ setTimeout });
vm.runInContext(files.map(f => fs.readFileSync(f, "utf8")).join("\n;\n") + "\n;globalThis.M = { CoinBacktest };", ctx);
const { CoinBacktest } = ctx.M;
const FEE = CoinBacktest.FEE, DAY = 86400, T0 = 1.6e9;

const series = (n, step, k, w = 0.06) => Array.from({ length: n }, (_, i) => {
  const c = 100 * Math.pow(1 + k / 100, i) * (1 + Math.sin(i / 4) * w);
  return { time: T0 + i * step, open: c * 0.998, high: c * 1.01, low: c * 0.99, close: c, volume: 1000 };
});
const coin = k => ({ h4: series(3000, 14400, k / 6), d1: series(900, DAY, k), w1: series(130, 604800, k * 7) });
const bar = (open, high, low, close) => ({ time: 0, open, high, low, close });
const call = { i: 0, hi: 100, lo: 98, target: 110, stop: 95 }, rule = { entry: 3, hold: 4 };
const net = (entry, exit) => exit * (1 - FEE) / (entry * (1 + FEE)) - 1;

test("equityStats: compounding and max drawdown", () => {
  const s = CoinBacktest.equityStats([0.1, -0.1, 0.05]);
  assert.ok(Math.abs(s.compound - (1.1 * 0.9 * 1.05 - 1)) < 1e-12);
  assert.ok(Math.abs(s.maxDD - -0.1) < 1e-12);
  assert.equal(JSON.stringify(CoinBacktest.equityStats([])), JSON.stringify({ compound: 0, maxDD: 0 }));
});

test("buy trade: fill at min(open, zone high), exit at target, fees on both sides", () => {
  const d1 = [bar(0, 0, 0, 0), bar(101, 104, 99, 103), bar(103, 112, 102, 111)];
  const t = CoinBacktest.simulateBuy(d1, call, rule);
  assert.equal(t.entry, 100); assert.equal(t.exit, 110); assert.equal(t.reason, "target");
  assert.ok(Math.abs(t.ret - net(100, 110)) < 1e-12);
});

test("gap down into the zone fills at the open", () => {
  const t = CoinBacktest.simulateBuy([bar(0, 0, 0, 0), bar(97, 99, 96, 98), bar(98, 99, 97, 98), bar(98, 99, 97, 98), bar(98, 99, 97, 98), bar(98, 99, 97, 99)], call, rule);
  assert.equal(t.entry, 97); assert.equal(t.reason, "time"); assert.equal(t.exit, 99);
});

test("same bar touches stop and target → stop (conservative); gap below stop exits at the open", () => {
  const same = CoinBacktest.simulateBuy([bar(0, 0, 0, 0), bar(101, 104, 99, 103), bar(103, 115, 94, 100)], call, rule);
  assert.equal(same.reason, "stop"); assert.equal(same.exit, 95);
  const gap = CoinBacktest.simulateBuy([bar(0, 0, 0, 0), bar(101, 104, 99, 103), bar(90, 112, 89, 100)], call, rule);
  assert.equal(gap.reason, "stop"); assert.equal(gap.exit, 90);
});

test("entry bar only checks the stop, not the target", () => {
  const t = CoinBacktest.simulateBuy([bar(0, 0, 0, 0), bar(105, 120, 99, 118), bar(118, 119, 117, 118), bar(118, 119, 117, 118), bar(118, 119, 117, 118), bar(118, 119, 117, 118)], call, rule);
  assert.equal(t.reason, "target"); assert.equal(t.from + 1, t.to);
});

test("time exit with a flat price loses just the round-trip fee", () => {
  const flat = bar(100, 101, 99.5, 100), d1 = [bar(0, 0, 0, 0), flat, flat, flat, flat, flat];
  const t = CoinBacktest.simulateBuy(d1, call, rule);
  assert.equal(t.reason, "time"); assert.equal(t.days, 4);
  assert.ok(Math.abs(t.ret - net(100, 100)) < 1e-12 && t.ret < -0.0019 && t.ret > -0.0021);
});

test("no touch of the zone → not entered; window past the data → pending", () => {
  const up = bar(105, 108, 103, 106);
  assert.equal(CoinBacktest.simulateBuy([bar(0, 0, 0, 0), up, up, up, up], call, rule).entered, false);
  assert.equal(CoinBacktest.simulateBuy([bar(0, 0, 0, 0), up, up], call, rule).pending, true);
  assert.equal(CoinBacktest.simulateBuy([bar(0, 0, 0, 0), bar(101, 104, 99, 103), up], call, rule).pending, true);
});

test("no look-ahead: bars after the decision moment never change the advice", () => {
  const k = coin(0.3), i = 500, ref = JSON.stringify(CoinBacktest.decisionAt(k, i)), t = k.d1[i].time + DAY;
  const bend = bars => bars.map(b => ({ ...b, open: b.open * 3, high: b.high * 3, low: b.low * 0.2, close: b.close * 0.5 }));
  const cut = (bars, span) => bars.map(b => (b.time + span > t ? bend([b])[0] : b));
  const k2 = { h4: cut(k.h4, 14400), d1: k.d1.map((b, j) => (j > i ? bend([b])[0] : b)), w1: cut(k.w1, 604800) };
  assert.equal(JSON.stringify(CoinBacktest.decisionAt(k2, i)), ref);
  assert.notEqual(JSON.stringify(CoinBacktest.decisionAt(k2, i + 3)), JSON.stringify(CoinBacktest.decisionAt(k, i + 3)));
});

test("run: three horizons, consistent counts, progress + cancel", async () => {
  const k = coin(0.3), seen = [];
  const res = await CoinBacktest.run(k, { onProgress: f => seen.push(f), pause: async () => {} });
  assert.equal(res.results.map(r => r.id).join(), "short,medium,long");
  for (const r of res.results) {
    assert.ok(r.calls > 0 && r.entered <= r.buyCalls && r.wins <= r.entered && r.stops + r.targets <= r.entered, r.id);
    assert.ok(r.maxDD <= 0 && (r.worst === null || r.worst <= r.avg + 1e-12), r.id);
  }
  assert.ok(res.results[0].calls > res.results[2].calls);
  assert.ok(seen.every(f => f > 0 && f <= 1));
  assert.equal(await CoinBacktest.run(k, { cancelled: () => true, pause: async () => {} }), null);
});
