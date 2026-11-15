// ChartCrosses (pure) + ChartCrossUI wording coverage. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = ["model/technical-indicators-trend-and-bands.js", "model/technical-indicators-oscillators.js", "model/indicator-catalog.js", "model/chart-line-crosses-detector.js", "ui/chart-cross-points.js"];
const ctx = vm.createContext({});
vm.runInContext(src.map(f => fs.readFileSync(path.join(__dirname, "../js", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { ChartCrosses, ChartCrossUI, Indicators };", ctx);
const { ChartCrosses: X, ChartCrossUI: UI, Indicators } = ctx.M;
// Rise, fall, rise again with a little wobble so oscillators leave their zones.
const bars = Array.from({ length: 300 }, (_, i) => {
  const c = (i <= 100 ? 20 + i * 0.3 : i <= 200 ? 50 - (i - 100) * 0.3 : 20 + (i - 200) * 0.3) + Math.sin(i * 1.3) * 0.6;
  return { time: 1e9 + i * 86400, open: c - 0.2, high: c + 0.5, low: c - 0.5, close: c, volume: 1000 + (i % 7) * 100 };
});
const ids = ["sma", "sma", "ichi", "psar", "rsi", "macd", "stoch", "adx", "cci", "wr", "mfi", "roc"];
const inds = Indicators.compute(ids.map((id, k) => ({ id, p: id === "sma" ? { n: k ? 50 : 10 } : Indicators.params(id) })), bars);

test("finds MA, price, MACD, +DI/−DI and oscillator-zone crosses, sorted, on finite values", () => {
  const out = X.detect(bars, inds), kinds = new Set(out.map(x => x.kind));
  for (const k of ["maUp", "maDown", "pxUp", "pxDown", "sigUp", "sigDown", "zeroUp", "zeroDown", "diUp", "diDown", "obIn", "obOut", "osIn", "osOut"]) assert.ok(kinds.has(k), k);
  assert.ok(out.every((x, i) => !i || out[i - 1].time <= x.time), "sorted");
  assert.ok(out.every(x => Number.isFinite(x.price) && inds[x.ind].lines[x.line]), "dot on a real line at a finite price");
  const ma = out.find(x => x.kind === "maUp");
  assert.equal(ma.a, "SMA 10"); assert.equal(ma.b, "SMA 50"); assert.equal(ma.ind, 1);
});

test("respects the first visible bar and stoch crosses only inside the zones", () => {
  const from = 150, out = X.detect(bars, inds, from);
  assert.ok(out.every(x => x.i >= from));
  const K = inds[6].lines[0].values, D = inds[6].lines[1].values;
  for (const x of out.filter(x => x.kind === "stUp")) assert.ok(Math.min(K[x.i - 1], D[x.i - 1]) <= 20);
  for (const x of out.filter(x => x.kind === "stDown")) assert.ok(Math.max(K[x.i - 1], D[x.i - 1]) >= 80);
});

test("every cross kind has a title and an explanation", () => {
  const out = X.detect(bars, inds);
  for (const k of new Set(out.map(x => x.kind))) { assert.ok(UI.TITLE[k], `title ${k}`); assert.ok(UI.TEXT[k], `text ${k}`); }
  assert.deepEqual(Object.keys(UI.TITLE).sort(), Object.keys(UI.TEXT).sort());
});
