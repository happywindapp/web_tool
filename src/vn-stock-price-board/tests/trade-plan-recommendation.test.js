// TradePlan (pure): tick rounding, timing actions, horizon levels, position size, liquidity. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "indicator-catalog.js", "chart-line-crosses-detector.js", "technical-outlook-scoring.js", "trade-plan-recommendation.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { TradePlan, TechOutlook };", ctx);
const { TradePlan: P, TechOutlook } = ctx.M;
const bars = Array.from({ length: 400 }, (_, i) => {
  const c = 30 + i * 0.05 + Math.sin(i / 6) * 1.5;
  return { time: 1e9 + i * 86400, open: c - 0.2, high: c + 0.6, low: c - 0.6, close: c, volume: 200000 };
});

test("rounds to the exchange price step", () => {
  assert.equal(P.tick(9.5, "HOSE"), 0.01); assert.equal(P.tick(25, "HOSE"), 0.05); assert.equal(P.tick(80, "HOSE"), 0.1); assert.equal(P.tick(9.5, "HNX"), 0.1);
  assert.equal(P.round(25.07, "HOSE", -1), 25.05); assert.equal(P.round(25.07, "HOSE", 1), 25.1); assert.equal(P.round(80.04, "UPCOM"), 80);
});

test("timing follows the weekly direction and daily timing", () => {
  const fr = (bucket, rsi = 55) => ({ bucket, rsi });
  assert.equal(P.timing(fr(1), fr(1)).action, "buy");
  assert.equal(P.timing(fr(1, 75), fr(2)).action, "hold");
  assert.equal(P.timing(fr(-1), fr(1)).action, "buyDip");
  assert.equal(P.timing(fr(1), fr(-1)).action, "sellRally");
  assert.equal(P.timing(fr(-2), fr(-2)).action, "sell");
  assert.equal(P.timing(fr(0), fr(0)).action, "watch");
  assert.ok(P.timing(fr(1), fr(-1)).conflict);
});

test("horizon levels: zone at or below price, target above, stop below, inside today's band", () => {
  const D = TechOutlook.frame(bars, "D", [1]), band = { floor: D.close * 0.93, ceil: D.close * 1.07 };
  const x = P.fromFrame(D, "HOSE", band);
  assert.ok(x.lo <= x.hi && x.hi <= D.close + 0.1, "zone under price");
  assert.ok(x.t1 > x.hi && x.stop < x.lo, "target above, stop below");
  assert.ok(x.stop >= band.floor - 0.05 && x.t1 <= band.ceil + 0.05, "clamped to floor / ceiling");
  assert.ok(x.rr > 0 && x.stopPct < 0 && x.upPct > 0);
  const L = TechOutlook.longTerm(bars), y = P.longTerm(L, L.last * 1.3, null, "HOSE");
  assert.ok(y.hi <= L.last * 1.3 * 0.85 + 0.1 && y.t1 > y.hi && y.stop < y.lo);
  assert.equal(P.longTerm(L, null, null, "HOSE").hi <= L.ma250 + 0.1, true, "falls back to MA250");
});

test("position size, liquidity and recent crosses", () => {
  assert.equal(P.position(-5, 30), 20); assert.equal(P.position(-10, 30), 10); assert.equal(P.position(-4, 60), 10); assert.equal(P.position(null, 30), null);
  assert.equal(Math.round(P.liquidity(bars.slice(-20).map(b => ({ ...b, close: 50, volume: 100000 })))), 5);
  const r = P.recent(bars);
  assert.ok(r.every((x, i) => x.ago >= 0 && x.ago < 10 && (!i || r[i - 1].ago <= x.ago)));
});
