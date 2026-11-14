// Run: node --test src/crypto-market-board/tests/bitcoin-cycle-indicators.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/bitcoin-cycle-indicators.js"), "utf8") + "\n;globalThis.M = BtcCycle;", ctx);
const M = ctx.M, DAY = 86400;
const plain = v => JSON.parse(JSON.stringify(v));
const T0 = Date.UTC(2020, 0, 1) / 1000;

test("grid: drops zeros, forward-fills gaps, daily steps", () => {
  const g = M.grid([{ t: T0, v: 0 }, { t: T0 + DAY, v: 5 }, { t: T0 + 4 * DAY, v: 8 }]);
  assert.deepEqual(plain(g.values), [5, 5, 5, 8]);
  assert.equal(g.times[3] - g.times[0], 3 * DAY);
});

test("align: interpolates, null before start, holds after end", () => {
  const out = M.align([T0 - DAY, T0, T0 + DAY, T0 + 3 * DAY], [{ t: T0, v: 10 }, { t: T0 + 2 * DAY, v: 20 }]);
  assert.deepEqual(plain(out), [null, 10, 15, 20]);
});

test("sma: window average, null until full and across nulls", () => {
  assert.deepEqual(plain(M.sma([1, 2, 3, 4, 5], 3)), [null, null, 2, 3, 4]);
  assert.deepEqual(plain(M.sma([null, 2, 4, 6], 2)), [null, null, 3, 5]);
});

test("crossUps: only upward crossings", () => {
  assert.deepEqual(plain(M.crossUps([1, 2, 3, 2, 3], [2, 2, 2, 2.5, 2.5])), [2, 4]);
});

test("ratio and scale are null-safe", () => {
  assert.deepEqual(plain(M.ratio([4, null, 6], [2, 1, 0])), [2, null, null]);
  assert.deepEqual(plain(M.scale([1, null], 2)), [2, null]);
});

test("rainbow: recovers a power law and classifies extreme prices", () => {
  const times = Array.from({ length: 800 }, (_, i) => Date.UTC(2011, 0, 1) / 1000 + i * DAY);
  const price = t => Math.pow(10, -17 + 5.8 * Math.log10(M.daysSinceGenesis(t)));
  const noisy = times.map((t, i) => price(t) * (1 + 0.3 * Math.sin(i / 7)));
  const rb = M.rainbow(times, noisy);
  assert.ok(Math.abs(rb.b - 5.8) < 0.3);
  assert.ok(rb.std > 0 && rb.w > 0);
  const t = times[400];
  assert.equal(rb.band(t, rb.fair(t)), 4);
  assert.equal(rb.band(t, rb.fair(t) * 1e6), 8);
  assert.equal(rb.band(t, rb.fair(t) / 1e6), 0);
  assert.ok(rb.edge(0, t) < rb.edge(9, t));
});

test("halvingCycles: ratio is 1 on halving day, x is seconds since halving", () => {
  const start = Date.UTC(2020, 4, 1) / 1000;
  const times = Array.from({ length: 30 }, (_, i) => start + i * DAY), prices = times.map((_, i) => 100 + i);
  const all = M.halvingCycles(times, prices), c = all.find(x => x.label === "2020-05-11");
  assert.equal(c.points[0].time, 0);
  assert.equal(c.points[0].value, 1);
  assert.equal(c.points[1].time, DAY);
  assert.equal(all.find(x => x.label === "2012-11-28").points.length, 0);
});

test("drawdown: percent below running all-time high", () => {
  assert.deepEqual(plain(M.drawdown([10, 20, 10, 5, 30])), [0, 0, -50, -75, 0]);
});

test("hashRibbon: capitulation while 30d < 60d, recovery on cross-up", () => {
  const falling = Array.from({ length: 100 }, (_, i) => 200 - i);
  assert.equal(M.hashRibbon(falling).capitulation, true);
  const v = [...Array.from({ length: 80 }, (_, i) => 100 - i * 0.5), ...Array.from({ length: 80 }, (_, i) => 60 + i * 2)], r2 = M.hashRibbon(v);
  assert.equal(r2.capitulation, false);
  assert.ok(r2.recovery.length >= 1);
});

test("stockToFlow: supply over trailing 365d issuance, model formula", () => {
  const supply = Array.from({ length: 400 }, (_, i) => 1000 + i);
  const r = M.stockToFlow(supply);
  assert.equal(r.s2f[399], 1399 / 365);
  assert.ok(Math.abs(r.model[399] - Math.exp(-1.84) * Math.pow(r.s2f[399], 3.36)) < 1e-6);
  assert.equal(r.s2f[10], null);
});

test("halvingInfo: blocks left, epoch progress and eta", () => {
  const h = M.halvingInfo(840000 + 105000, 0);
  assert.equal(h.blocksLeft, 105000);
  assert.equal(h.progress, 50);
  assert.equal(h.etaMs, 105000 * 600000);
});

test("interp and zoneOf: clamp, linear between points, zone boundaries", () => {
  const pts = [[0, 0], [10, 100]];
  assert.equal(M.interp(-5, pts), 0);
  assert.equal(M.interp(5, pts), 50);
  assert.equal(M.interp(99, pts), 100);
  assert.deepEqual([0, 19.9, 20, 59, 60, 80, 100].map(M.zoneOf), [0, 0, 1, 2, 3, 4, 4]);
});

test("thermometer: cheap inputs read as bottom, hot as top, unknowns skipped", () => {
  const cold = M.thermometer({ mayer: 0.55, ratio200w: 0.9, pi: 0.2, puell: 0.35, band: 0, fg: 8, capitulation: true });
  assert.equal(cold.zone, 0);
  assert.equal(cold.rows.length, 7);
  const hot = M.thermometer({ mayer: 3.2, ratio200w: 7, pi: 1.1, puell: 7, band: 8, fg: 95, capitulation: false });
  assert.ok(hot.score > 80 && hot.zone === 4);
  assert.equal(M.thermometer({ mayer: 1.2, fg: null }).rows.length, 1);
  assert.equal(M.thermometer({}).score, null);
});

test("analyze: end-to-end on a synthetic multi-year series", () => {
  const n = 1600, t0 = Date.UTC(2021, 0, 1) / 1000;
  const price = Array.from({ length: n }, (_, i) => ({ t: t0 + i * DAY, v: 10000 + 5000 * Math.sin(i / 90) + i * 10 }));
  const rev = price.map(p => ({ t: p.t, v: p.v * 900 })), supply = price.map((p, i) => ({ t: p.t, v: 19e6 + i * 450 }));
  const hash = price.map((p, i) => ({ t: p.t, v: 1e20 + i * 1e17 }));
  const a = M.analyze({ price, rev, supply, hash, fg: 40 });
  assert.equal(a.times.length, n);
  assert.ok(a.now.mayer > 0 && a.now.ratio200w > 0 && a.now.puell > 0);
  assert.equal(a.now.capitulation, false);
  assert.ok(a.thermo.rows.length >= 6);
  assert.equal(a.drawdown.length, n);
  assert.ok(a.now.band >= 0 && a.now.band <= 8);
});
