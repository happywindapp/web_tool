// ReturnCorr (pure): alignment, Pearson, beta, volatility. Run: node --test src/crypto-market-board/tests/return-correlation-math.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/return-correlation-math.js"), "utf8") + "\n;globalThis.M = { ReturnCorr };", ctx);
const { ReturnCorr: R } = ctx.M;

const DAY = 86400, T0 = 1.7e9 - (1.7e9 % DAY);
const bars = (closes, skip = [], from = 0) => closes.map((close, i) => ({ time: T0 + (from + i) * DAY, close })).filter((_, i) => !skip.includes(i));
const walk = (n, f) => Array.from({ length: n }, (_, i) => f(i));
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test("pearson: known values", () => {
  close(R.pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1);
  close(R.pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1);
  close(R.pearson([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]), 0.8);
});

test("pearson: constant series or too few points → null, never NaN", () => {
  assert.equal(R.pearson([1, 1, 1, 1], [1, 2, 3, 4]), null);
  assert.equal(R.pearson([1, 2], [1, 2]), null);
  assert.equal(R.pearson([], []), null);
});

test("beta and volatility known values", () => {
  close(R.beta([2, 4, 6, 8], [1, 2, 3, 4]), 2);
  assert.equal(R.beta([1, 2, 3], [5, 5, 5]), null);
  close(R.volatility([0.01, -0.01, 0.01, -0.01]), Math.sqrt((4 * 0.0001 / 3) * 365));
  assert.equal(R.volatility([0.01]), null);
});

test("align: log returns of common days only", () => {
  const a = bars([100, 110, 121, 133.1]), b = bars([50, 55, 60.5, 66.55]);
  const { n, returns } = R.align({ A: a, B: b });
  assert.equal(n, 3);
  close(returns.A[0], Math.log(1.1)); close(returns.B[2], Math.log(1.1));
});

test("align: a day missing in one series drops that day and the returns across the gap", () => {
  const a = bars(walk(10, i => 100 + i)), b = bars(walk(10, i => 200 + i * 2), [4]);
  const { n, returns } = R.align({ A: a, B: b });
  assert.equal(returns.A.length, returns.B.length);
  assert.equal(n, 9 - 1 - 1);
});

test("align: different start dates use the overlap", () => {
  const a = bars(walk(20, i => 100 + i)), b = bars(walk(10, i => 50 + i), [], 10);
  assert.equal(R.align({ A: a, B: b }).n, 9);
});

test("analyze: identical and mirrored series, constant coin gives null stats", () => {
  const base = walk(40, i => 100 * Math.exp(Math.sin(i / 3) * 0.2 + i * 0.001));
  const inv = base.map(c => 10000 / c);
  const res = R.analyze({ BTC: bars(base), ETH: bars(base), INV: bars(inv), FLAT: bars(base.map(() => 5)) }, ["BTC", "ETH", "INV", "FLAT"]);
  close(res.matrix[0][1], 1); close(res.matrix[0][2], -1);
  assert.equal(res.matrix[0][3], null); assert.equal(res.matrix[3][3], null);
  close(res.stats.ETH.beta, 1); close(res.stats.INV.corr, -1);
  assert.equal(res.stats.FLAT.corr, null);
  assert.equal(res.stats.FLAT.vol, 0);
  assert.ok(res.matrix.flat().every(v => v === null || Number.isFinite(v)));
  close(res.avg, -1 / 3);
});

test("analyze: benchmark outside the shown set still feeds beta", () => {
  const base = walk(30, i => 100 + Math.sin(i) * 10), twice = walk(30, i => 100 * Math.exp(2 * Math.log(base[i] / 100)));
  const res = R.analyze({ BTC: bars(base), X: bars(twice) }, ["X"]);
  assert.deepEqual(res.syms, ["X"]);
  close(res.stats.X.beta, 2, 1e-6);
  assert.equal(res.avg, null);
});

test("level thresholds", () => {
  assert.equal(R.level(0.8), "high"); assert.equal(R.level(0.5), "mid"); assert.equal(R.level(0.1), "low"); assert.equal(R.level(null), null);
});
