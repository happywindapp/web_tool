// Technical chart pure modules: indicator math, ranges / resampling, indicator catalog. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["chart-ranges-and-resample.js", "technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "indicator-catalog.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { ChartRange, TA, Indicators };", ctx);
const { ChartRange, TA, Indicators } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const DAY = 86400, MON = Date.UTC(2026, 10, 2) / 1000;
// 60 daily bars (weekdays only) with a gentle zig-zag uptrend.
const bars = [];
for (let d = 0; bars.length < 60; d++) {
  const t = MON + d * DAY, wd = new Date(t * 1000).getUTCDay();
  if (wd === 0 || wd === 6) continue;
  const c = 50 + bars.length * 0.3 + (bars.length % 3 ? 0.5 : -0.5);
  bars.push({ time: t, open: c - 0.2, high: c + 0.6, low: c - 0.7, close: c, volume: 1000 + bars.length * 10 });
}
const close = bars.map(b => b.close), high = bars.map(b => b.high), low = bars.map(b => b.low);

test("TA moving averages: SMA / EMA / WMA / RMA basics and gap handling", () => {
  assert.deepEqual(plain(TA.sma([1, 2, 3, 4, 5], 3)), [null, null, 2, 3, 4]);
  assert.deepEqual(plain(TA.sma([null, 1, 2, 3], 2)), [null, null, 1.5, 2.5]);
  const e = TA.ema([1, 2, 3, 4, 5], 3);
  assert.deepEqual(plain(e.slice(0, 2)), [null, null]);
  near(e[2], 2); near(e[3], 3); near(e[4], 4);
  near(TA.wma([1, 2, 3], 3)[2], (1 + 4 + 9) / 6);
  near(TA.rma([2, 2, 2, 2], 2)[3], 2);
});

test("TA bands / channels / Ichimoku / SAR / VWAP have the right shape", () => {
  const bb = TA.bollinger(close, 20, 2);
  assert.equal(bb.mid[18], null);
  near(bb.mid[19], close.slice(0, 20).reduce((a, b) => a + b) / 20);
  assert.ok(bb.upper[30] > bb.mid[30] && bb.lower[30] < bb.mid[30]);
  const dc = TA.donchian(high, low, 10);
  near(dc.upper[20], Math.max(...high.slice(11, 21)));
  const ich = TA.ichimoku(high, low, close);
  assert.equal(ich.spanB.filter(v => v != null).length, 60 - 51 - 26 > 0 ? 60 - 51 - 26 : 0);
  assert.equal(ich.chikou[59], null);
  near(ich.chikou[0], close[26]);
  assert.ok(TA.psar(high, low).slice(1).every(Number.isFinite));
  const v = TA.vwap([{ time: 0, high: 2, low: 0, close: 1, volume: 10 }, { time: 60, high: 4, low: 2, close: 3, volume: 30 }, { time: DAY, high: 9, low: 9, close: 9, volume: 5 }]);
  near(v[1], (1 * 10 + 3 * 30) / 40); near(v[2], 9);
});

test("TA oscillators: RSI, MACD, Stoch, ATR, ADX, CCI, %R, MFI, OBV, ROC", () => {
  const up = Array.from({ length: 30 }, (_, i) => 10 + i);
  assert.equal(TA.rsi(up, 14)[29], 100);
  const r = TA.rsi(close, 14);
  assert.equal(r[13], null);
  assert.ok(r[40] > 50 && r[40] < 100);
  const m = TA.macd(close);
  near(m.hist[50], m.line[50] - m.signal[50]);
  assert.equal(m.signal[32], null);
  const s = TA.stoch(high, low, close);
  assert.ok(s.k.slice(20).every(x => x >= 0 && x <= 100));
  near(TA.atr([2, 2, 2], [0, 0, 0], [1, 1, 1], 2)[1], 2);
  const a = TA.adx(high, low, close);
  assert.ok(a.adx[59] >= 0 && a.adx[59] <= 100 && a.plus[59] > a.minus[59]);
  assert.ok(Number.isFinite(TA.cci(high, low, close)[40]));
  assert.ok(TA.williamsR(high, low, close).slice(13).every(x => x <= 0 && x >= -100));
  assert.ok(TA.mfi(high, low, close, bars.map(b => b.volume))[30] > 0);
  assert.deepEqual(plain(TA.obv([1, 2, 2, 1], [5, 6, 7, 8])), [0, 6, 6, -2]);
  near(TA.roc([10, 11, 12], 2)[2], 20);
});

test("ChartRange: valid combos, auto-fix, warm-up window, VN time shift", () => {
  assert.equal(ChartRange.valid("1W", "5m"), true);
  assert.equal(ChartRange.valid("5Y", "5m"), false);
  assert.equal(ChartRange.valid("1W", "1M"), false);
  assert.equal(ChartRange.fix("10Y", "15m"), "1M");
  assert.equal(ChartRange.fix("1Y", "1D"), "1D");
  const w = ChartRange.windowOf("1Y", "1D", 1e9);
  assert.equal(w.res, "D");
  assert.equal(w.from, Math.floor(1e9 - (366 + 300) * DAY));
  assert.equal(ChartRange.windowOf("1W", "15m", 1e9).res, "15");
  assert.equal(ChartRange.shape([{ time: 100, open: 1, high: 1, low: 1, close: 1, volume: 1 }], "5m")[0].time, 100 + 7 * 3600);
});

test("ChartRange: weekly / monthly resampling and Heikin-Ashi", () => {
  const wk = ChartRange.shape(bars, "1W");
  assert.equal(wk.length, 12);
  assert.equal(wk[0].time, MON);
  assert.equal(wk[0].open, bars[0].open);
  assert.equal(wk[0].close, bars[4].close);
  assert.equal(wk[0].volume, bars.slice(0, 5).reduce((s, b) => s + b.volume, 0));
  assert.equal(wk[0].high, Math.max(...bars.slice(0, 5).map(b => b.high)));
  const mo = ChartRange.shape(bars, "1M");
  assert.deepEqual(plain(mo.map(b => new Date(b.time * 1000).toISOString().slice(0, 10))), ["2026-11-01", "2026-12-01", "2027-01-01"]);
  const ha = ChartRange.heikinAshi(bars);
  near(ha[0].close, (bars[0].open + bars[0].high + bars[0].low + bars[0].close) / 4);
  near(ha[1].open, (ha[0].open + ha[0].close) / 2);
});

test("Indicators: clean() drops unknown ids, clamps params; compute() aligned, no NaN", () => {
  const list = Indicators.clean([{ id: "sma", p: { n: 9999 } }, { id: "nope" }, { id: "macd", p: { f: "x" } }, null]);
  assert.deepEqual(plain(list), [{ id: "sma", p: { n: 500 } }, { id: "macd", p: { f: 12, s: 26, g: 9 } }]);
  assert.equal(Indicators.clean("bad").length, Indicators.DEFAULT.length);
  const all = Object.keys(Indicators.DEFS).reduce((l, id) => Indicators.add(l, id), []);
  assert.equal(all.length, Indicators.MAX);
  const every = Object.keys(Indicators.DEFS).map(id => ({ id, p: Indicators.params(id) }));
  for (const ind of Indicators.compute(every, bars)) for (const ln of ind.lines) {
    assert.equal(ln.values.length, bars.length, `${ind.id} ${ln.title}`);
    assert.ok(ln.values.every(v => v === null || Number.isFinite(v)), `${ind.id} ${ln.title} has NaN`);
  }
  const sma2 = Indicators.compute([{ id: "sma", p: { n: 5 } }, { id: "sma", p: { n: 10 } }], bars);
  assert.notEqual(sma2[0].lines[0].color, sma2[1].lines[0].color);
});
