// Indicator guide: every catalog indicator has every section, and its illustration renders cleanly. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["model/technical-indicators-trend-and-bands.js", "model/technical-indicators-oscillators.js", "model/indicator-catalog.js", "model/chart-events-detector.js",
  "model/indicator-illustration-svg.js", "ui/indicator-guide-content.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { Indicators, IndIllus, IND_GUIDE, IND_GUIDE_SECTIONS };", ctx);
const { Indicators, IndIllus, IND_GUIDE, IND_GUIDE_SECTIONS } = ctx.M;
const ids = Object.keys(Indicators.DEFS);

test("guide covers every catalog indicator with every section filled", () => {
  assert.deepEqual(Object.keys(IND_GUIDE).sort(), [...ids].sort());
  for (const id of ids) for (const [k] of IND_GUIDE_SECTIONS) {
    const v = IND_GUIDE[id][k], list = Array.isArray(v) ? v : [v];
    assert.ok(list.length && list.every(s => typeof s === "string" && s.trim().length > 20), `${id}.${k}`);
  }
  for (const id of ids) assert.ok(IND_GUIDE[id].ex.length >= 2 && IND_GUIDE[id].combo.length >= 2, `${id}: ≥ 2 examples and combinations`);
});

test("illustration renders every indicator without NaN / undefined", () => {
  for (const id of ids) {
    const s = IndIllus.svg(id);
    assert.match(s, /^<svg [^>]*viewBox="0 0 560 \d+"/, id);
    assert.ok(!/NaN|undefined|Infinity/.test(s), `${id} has bad numbers`);
    assert.ok(/<path d="M/.test(s) || /<circle/.test(s), `${id} draws its line`);
  }
  assert.equal(IndIllus.svg("nope"), "");
});

test("illustration marks the signals the guide talks about", () => {
  const marks = id => (IndIllus.svg(id, { label: k => `[${k}]` }).match(/\[(\w+)\]/g) || []).join(" ");
  for (const id of ["sma", "ema", "wma"]) assert.match(marks(id), /maCrossUp/, id);
  assert.match(marks("sma"), /maCrossDown/);
  assert.match(marks("macd"), /macdUp/); assert.match(marks("macd"), /macdDown/);
  assert.match(marks("rsi"), /rsiHigh/); assert.match(marks("rsi"), /rsiLow/);
  assert.match(marks("bb"), /bb(Up|Down)/);
  assert.match(marks("adx"), /swing(High|Low)/);
});

test("sample series is deterministic and intraday bars split into sessions", () => {
  assert.equal(JSON.stringify(IndIllus.sample()), JSON.stringify(IndIllus.sample()));
  const days = new Set(IndIllus.sample(true).map(b => Math.floor(b.time / 86400)));
  assert.equal(days.size, 4);
});
