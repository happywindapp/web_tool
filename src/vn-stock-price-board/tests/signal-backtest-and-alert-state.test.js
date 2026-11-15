// SignalBacktest + technical-signal alerts (AlertRule signals, SignalState). Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "indicator-catalog.js", "chart-line-crosses-detector.js", "chart-ranges-and-resample.js",
  "technical-outlook-scoring.js", "trade-plan-recommendation.js", "signal-backtest-forward-returns.js", "technical-signal-alert-state.js", "alert-rules-and-target-math.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { SignalBacktest, SignalState, AlertRule };", ctx);
const { SignalBacktest: B, SignalState: S, AlertRule: A } = ctx.M;
const DAY = 86400, T0 = Date.UTC(2020, 0, 1) / 1000;
const bars = Array.from({ length: 900 }, (_, i) => {
  const c = 40 + Math.sin(i / 15) * 6 + i * 0.01;
  return { time: T0 + i * DAY, open: c - 0.2, high: c + 0.5, low: c - 0.5, close: c, volume: 1e5 };
});

test("backtest: forward returns per cross kind, win follows the signal's direction", () => {
  const r = B.run(bars);
  assert.ok(r && r.rows.length > 3);
  for (const x of r.rows) for (const h of B.H) {
    const s = x.h[h];
    if (!s) continue;
    assert.ok(s.n <= x.n && s.up >= 0 && s.up <= 100);
    if (x.tone === "up") assert.equal(s.win, s.up); else if (x.tone === "down") assert.equal(s.win, 100 - s.up); else assert.equal(s.win, null);
  }
  assert.ok(r.base[5].n > 500 && r.from >= bars[60].time);
  assert.equal(B.run(bars.slice(0, 200)), null);
});

test("signal state: yesterday vs live price, MA cross alert fires only on today's cross", () => {
  const done = S.completed(bars, "20220620"), cut = Date.UTC(2022, 5, 20) / 1000;
  assert.ok(done.length && done[done.length - 1].time < cut);
  const prev = done[done.length - 1].close, [ma0] = S.of(done, null, prev).ma(20);
  const up = S.of(done, null, ma0 * 1.2), down = S.of(done, null, ma0 * 0.8), q = p => ({ last: p, pct: 0 });
  const a = { sym: "AAA", type: prev <= ma0 ? "maUp" : "maDown", value: 20 };
  const s = a.type === "maUp" ? up : down, p = a.type === "maUp" ? ma0 * 1.2 : ma0 * 0.8;
  assert.equal(A.hit(a, q(p), s), true);
  assert.equal(A.hit(a, q(p), null), false);
  assert.equal(A.hit({ ...a, type: a.type === "maUp" ? "maDown" : "maUp" }, q(p), s), false);
});

test("alert rule: signal value ranges, plan zones, check() passes the state per ticker", () => {
  assert.equal(A.valid({ sym: "AAA", type: "maUp", value: 1 }), false);
  assert.equal(A.valid({ sym: "AAA", type: "maUp", value: 20.5 }), false);
  assert.equal(A.valid({ sym: "AAA", type: "rsiUp", value: 70 }), true);
  assert.equal(A.valid({ sym: "AAA", type: "macdUp", value: 0 }), true);
  const plan = { lo: 10, hi: 11, stop: 9 }, st = { plan };
  assert.equal(A.hit({ sym: "AAA", type: "planBuy", value: 0 }, { last: 10.5 }, st), true);
  assert.equal(A.hit({ sym: "AAA", type: "planStop", value: 0 }, { last: 8.9 }, st), true);
  assert.equal(A.hit({ sym: "AAA", type: "planStop", value: 0 }, { last: 9.5 }, st), false);
  const r = A.check([{ sym: "AAA", type: "planBuy", value: 0, fired: "" }, { sym: "AAA", type: "above", value: 10, fired: "" }], new Map([["AAA", { last: 10.5, pct: 1 }]]), "20260101", () => st);
  assert.equal(r.hits.length, 2);
  assert.equal(A.check(r.list, new Map([["AAA", { last: 10.5, pct: 1 }]]), "20260101", () => st).hits.length, 0);
});
