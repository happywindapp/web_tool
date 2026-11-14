// ChartEvents (pure): swing points, range extremes, MA / MACD / RSI crosses, volume spikes. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "indicator-catalog.js", "chart-events-detector.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { ChartEvents, Indicators };", ctx);
const { ChartEvents: E, Indicators } = ctx.M;
// Rise 0→80, fall 80→160, rise again: one clear peak (~bar 80) and one clear trough (~bar 160); volume spike on bar 120.
const bars = Array.from({ length: 240 }, (_, i) => {
  const c = i <= 80 ? 20 + i * 0.25 : i <= 160 ? 40 - (i - 80) * 0.25 : 20 + (i - 160) * 0.25;
  return { time: 1e9 + i * 86400, open: c, high: c + 0.3, low: c - 0.3, close: c, volume: i === 120 ? 9000 : 1000 };
});

test("detects peak, trough, range extremes and a volume spike", () => {
  const ev = E.detect(bars, []), kinds = k => ev.filter(x => x.kind === k);
  const peak = kinds("swingHigh").find(x => Math.abs(x.i - 80) <= 1), trough = kinds("swingLow").find(x => Math.abs(x.i - 160) <= 1);
  assert.ok(peak && trough, "peak / trough found");
  assert.equal(peak.pos, "above"); assert.equal(trough.pos, "below");
  assert.equal(kinds("rangeHigh")[0].i, 80);
  assert.ok(kinds("volSpike").some(x => x.i === 120 && x.v > 2.5));
  assert.ok(ev.every((x, i) => i === 0 || ev[i - 1].time <= x.time), "sorted by time");
  assert.ok(ev.length <= E.MAX);
});

test("MA cross up / down and MACD + RSI events come from the computed indicators", () => {
  const inds = Indicators.compute([{ id: "sma", p: { n: 10 } }, { id: "sma", p: { n: 30 } }, { id: "macd", p: { f: 12, s: 26, g: 9 } }, { id: "rsi", p: { n: 14 } }], bars);
  const ev = E.detect(bars, inds), has = k => ev.some(x => x.kind === k);
  assert.ok(has("maCrossDown") && has("maCrossUp"));
  const down = ev.find(x => x.kind === "maCrossDown");
  assert.equal(down.fast, "SMA 10"); assert.equal(down.slow, "SMA 30");
  assert.ok(down.i > 80 && down.i < 120);
  assert.ok(has("macdDown") && has("macdUp"));
  assert.ok(has("rsiHigh") || has("rsiLow"));
  assert.ok(E.detect(bars, inds, 200).every(x => x.i >= 200), "from limits the range");
  assert.equal(E.detect(bars.slice(0, 5), []).length, 0);
});
