// PlanSim + PlanBacktest (pure): T+2 exits, VN fees, no look-ahead, run summary. Run: node --test src/vn-stock-price-board/tests/trade-plan-backtest-replay.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "indicator-catalog.js", "chart-line-crosses-detector.js", "technical-outlook-scoring.js",
  "chart-ranges-and-resample.js", "trade-plan-recommendation.js", "plan-backtest-trade-simulator.js", "trade-plan-backtest-replay.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { PlanSim, PlanBacktest };", ctx);
const { PlanSim, PlanBacktest } = ctx.M;

const bar = (i, o, h, l, c) => ({ time: 1.6e9 + i * 86400, open: o, high: h, low: l, close: c, volume: 1e5 });
const VN = { buy: 0.0015, sell: 0.0025, settle: 2, shift: 0 }, R = { entry: 3, hold: 5, win: 5 };
const wave = n => Array.from({ length: n }, (_, i) => { const c = 30 + i * 0.02 + Math.sin(i / 7) * 2; return bar(i, c - 0.2, c + 0.6, c - 0.6, c); });

test("PlanSim: T+2 — a stop touched on T+1 cannot fill, the first exit is on T+2", () => {
  const d = [bar(0, 10, 10, 10, 10), bar(1, 10, 10, 9.8, 10), bar(2, 10, 10, 8.5, 9), bar(3, 9.5, 9.6, 9.4, 9.5), bar(4, 9.5, 9.6, 9.4, 9.5), bar(5, 9.5, 9.6, 9.4, 9.5), bar(6, 9.5, 9.6, 9.4, 9.5), bar(7, 9.5, 9.6, 9.4, 9.5)];
  const s = PlanSim.simulateBuy(d, { i: 0, lo: 9.8, hi: 10, stop: 9, target: 12 }, R, VN);
  assert.equal(s.from, 1); assert.equal(s.to, 6); assert.equal(s.reason, "time");
  const s0 = PlanSim.simulateBuy(d, { i: 0, lo: 9.8, hi: 10, stop: 9, target: 12 }, R, { ...VN, settle: 0 });
  assert.equal(s0.reason, "stop"); assert.equal(s0.to, 2);
});

test("PlanSim: flat price loses only buy fee + sell fee and tax", () => {
  const d = Array.from({ length: 12 }, (_, i) => bar(i, 10, 10, 10, 10));
  const s = PlanSim.simulateBuy(d, { i: 0, lo: 9.5, hi: 10, stop: 9, target: 11 }, R, VN);
  assert.ok(Math.abs(s.ret - (0.9975 / 1.0015 - 1)) < 1e-12);
});

test("PlanBacktest.decisionAt: no look-ahead — bars after i never change the plan", () => {
  const d = wave(700), i = 600, a = PlanBacktest.decisionAt(d, i, "HOSE");
  const b = PlanBacktest.decisionAt(d.map((x, k) => k > i ? { ...x, close: x.close * 3, high: x.high * 3 } : x), i, "HOSE");
  assert.ok(a && a.plans.short && a.plans.medium);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test("PlanBacktest.run: three horizons, consistent counts, progress, cancel → null", async () => {
  const d = wave(900), seen = [];
  const res = await PlanBacktest.run(d, "HOSE", { pause: async () => {}, onProgress: f => seen.push(f) });
  assert.equal(res.results.map(r => r.id).join(), "short,medium,long");
  for (const r of res.results) assert.ok(r.calls > 0 && r.neutral + r.buyAll <= r.calls && r.entered <= r.buyCalls && r.buyCalls <= r.buyAll && r.wins <= r.entered);
  assert.ok(seen.length > 0 && seen[seen.length - 1] <= 1);
  assert.equal(await PlanBacktest.run(d, "HOSE", { pause: async () => {}, cancelled: () => true }), null);
});
