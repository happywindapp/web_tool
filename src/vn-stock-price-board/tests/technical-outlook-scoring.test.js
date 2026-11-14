// TechOutlook (pure): trend scoring, historical odds, pivots, long-term figures. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "technical-outlook-scoring.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.O = TechOutlook;", ctx);
const O = ctx.O;
const DAY = 86400, T0 = Date.UTC(2020, 0, 1) / 1000;
// Daily bars following f(i) with a small zig-zag so oscillators are defined.
const series = (n, f) => Array.from({ length: n }, (_, i) => {
  const c = f(i) * (1 + (i % 2 ? 0.004 : -0.004));
  return { time: T0 + i * DAY, open: c, high: c * 1.01, low: c * 0.99, close: c, volume: 1000 + (i % 5) * 100 };
});

test("uptrend scores positive, downtrend negative, labels follow buckets", () => {
  const up = O.frame(series(400, i => 10 * 1.003 ** i), "D", [1, 5]), down = O.frame(series(400, i => 50 * 0.997 ** i), "D", [1]);
  assert.ok(up.score > 30, `up score ${up.score}`);
  assert.ok(up.bucket >= 1);
  assert.ok(down.score < -30, `down score ${down.score}`);
  assert.ok(down.bucket <= -1);
  assert.equal(O.LABELS[up.bucket], up.label);
  assert.ok(up.signals.every(s => s.vote >= -1 && s.vote <= 1 && s.w > 0));
  assert.equal(O.frame(series(20, () => 10), "D"), null);
});

test("historical odds: same-bucket samples, percentages within range", () => {
  const up = O.frame(series(400, i => 10 * 1.003 ** i), "D", [1, 5]);
  for (const h of [1, 5]) {
    const o = up.odds[h];
    assert.ok(o.n > 50, `n=${o.n}`);
    assert.ok(o.up >= 0 && o.up <= 100);
    assert.ok(o.p25 <= o.median && o.median <= o.p75);
  }
  assert.ok(up.odds[5].median > 0);
});

test("pivots and long-term figures", () => {
  const p = O.pivots({ high: 12, low: 8, close: 10 });
  assert.equal(p.p, 10); assert.equal(p.r1, 12); assert.equal(p.s1, 8); assert.equal(p.r2, 14); assert.equal(p.s2, 6);
  const bars = series(6 * 365, i => 10 * Math.pow(2, i / (5 * 365)));
  const L = O.longTerm(bars);
  assert.ok(Math.abs(L.cagr5 - (Math.pow(2, 1 / 5) - 1) * 100) < 1.5, `cagr5 ${L.cagr5}`);
  assert.ok(L.ret1y > 0 && L.aboveMa250 === true && L.fromAth <= 0);
  assert.ok(L.vol > 0 && L.band1y[0] < L.last && L.band1y[1] > L.last);
  assert.ok(L.mdd5 <= 0);
});
