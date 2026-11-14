// Valuation, Health and VSvg (pure). Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["valuation-fair-price-and-ratio-band.js", "financial-health-scores.js", "valuation-charts-svg.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { Valuation, Health, VSvg };", ctx);
const { Valuation: V, Health: H, VSvg } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

// Annual rows in VNDirect shape for a made-up non-financial company (VND).
const B = 1e9;
const YEAR = (y, v) => Object.entries(v).map(([code, n]) => ({ itemCode: +code, fiscalDate: `${y}-12-31`, numericValue: n }));
const ROWS = [
  ...YEAR(2025, { 11000: 500 * B, 11100: 100 * B, 13100: 300 * B, 13110: 50 * B, 13340: 40 * B, 13000: 400 * B, 14000: 600 * B, 14200: 200 * B, 14400: 1000 * B,
    21001: 1200 * B, 23100: 360 * B, 23800: 150 * B, 23000: 120 * B, 23001: 1200, 22509: -10 * B, 32000: 160 * B, 32100: -40 * B, 33600: -60 * B }),
  ...YEAR(2024, { 11000: 450 * B, 13100: 320 * B, 13340: 60 * B, 14400: 950 * B, 21001: 1000 * B, 23100: 280 * B, 23000: 100 * B, 23001: 1000, 32000: 90 * B, 32100: -30 * B }),
  ...YEAR(2023, { 23000: 90 * B, 32000: 100 * B, 32100: -20 * B }), ...YEAR(2022, { 23000: 80 * B }), ...YEAR(2020, { 23000: 60 * B }),
];

test("Valuation.band: stats and percentile of today's value", () => {
  const pts = Array.from({ length: 40 }, (_, i) => ({ date: `2025-01-${String(i % 28 + 1).padStart(2, "0")}`, value: 10 + i % 10 }));
  const b = V.band(pts);
  near(b.mean, 14.5); assert.equal(b.min, 10); assert.equal(b.max, 19); assert.equal(b.median, 14.5);
  assert.equal(b.current, 19); assert.equal(b.percentile, 100);
  assert.equal(V.band(pts.slice(0, 5)), null);
});

test("Valuation.fairValues: Graham, multiples, DCF and average upside", () => {
  const f = V.fairValues({ price: 20, eps: 2000, bvps: 15000, peMedian: 12, pbMedian: 1.5, dcf: null });
  near(f.methods[0].value, Math.sqrt(22.5 * 2000 * 15000) / 1000);
  near(f.methods[1].value, 24); near(f.methods[2].value, 22.5);
  assert.equal(f.methods[3].value, null);
  near(f.methods[1].upside, 20);
  near(f.average, (f.methods[0].value + 24 + 22.5) / 3);
  assert.equal(V.fairValues({ price: 20, eps: -5, bvps: 0, peMedian: 10, pbMedian: 1 }).average, null);
});

test("Valuation.dcf: 2-stage math, net debt, guards", () => {
  const v = V.dcf({ fcf0: 100 * B, g: 0, wacc: 10, tg: 0, netDebt: 0, shares: 100e6 });
  near(v, 100 * B / 0.1 / 100e6 / 1000, 1e-6);
  assert.ok(V.dcf({ fcf0: 100 * B, g: 10, wacc: 12, tg: 3, netDebt: 500 * B, shares: 100e6 }) < V.dcf({ fcf0: 100 * B, g: 10, wacc: 12, tg: 3, netDebt: 0, shares: 100e6 }));
  assert.equal(V.dcf({ fcf0: -1, g: 5, wacc: 12, tg: 3, shares: 1 }), null);
  assert.equal(V.dcf({ fcf0: 1, g: 5, wacc: 3, tg: 3, shares: 1 }), null);
  near(V.cagr(100, 121, 2), 10);
});

test("Valuation.perf: periods measured from the bar on/before the start date, YTD from last year's close", () => {
  const day = 86400, end = Date.UTC(2026, 10, 13) / 1000, bars = [];
  for (let t = end - 400 * day, p = 100; t <= end; t += day, p += 0.1) bars.push({ time: t, close: +p.toFixed(2) });
  const r = V.perf(bars), last = bars[bars.length - 1].close;
  near(r["1W"], (last / bars[bars.length - 8].close - 1) * 100);
  const dec31 = bars.filter(b => b.time < Date.UTC(2026, 0, 1) / 1000).pop();
  near(r.YTD, (last / dec31.close - 1) * 100);
  assert.equal(r["3Y"], null);
});

test("Health: byYear, Piotroski, Altman, DCF inputs", () => {
  const ys = H.byYear(ROWS);
  assert.deepEqual(plain(ys.map(y => y.year)), [2025, 2024, 2023, 2022, 2020]);
  assert.equal(H.isFinancial(ys), false);
  const p = H.piotroski(ys);
  const map = Object.fromEntries(p.checks.map(c => [c.key, c.pass]));
  assert.deepEqual(plain(map), { roa: true, cfo: true, droa: true, accrual: true, dlev: true, dcr: true, dil: true, dgm: true, dat: true });
  assert.equal(p.score, 9);
  const a = H.altman(ys, 900 * B);
  near(a.z, 1.2 * 200 / 1000 + 1.4 * 0.2 + 3.3 * 160 / 1000 + 0.6 * 900 / 400 + 1.2);
  assert.equal(a.zone, "safe");
  const d = H.dcfInputs(ys, 100e6);
  near(d.fcf0, (120 + 60 + 80) / 3 * B);
  near(d.g, V.cagr(80 * B, 120 * B, 3));
  near(d.netDebt, (50 + 40 - 100) * B);
  const bank = H.byYear([{ itemCode: 14400, fiscalDate: "2025-12-31", numericValue: 1 }, { itemCode: 14400, fiscalDate: "2024-12-31", numericValue: 1 }]);
  assert.equal(H.piotroski(bank), null);
  assert.equal(H.dcfInputs(bank, 1), null);
});

test("Health.snowflake: 5 axes 0–6, missing data left out", () => {
  const ys = H.byYear(ROWS);
  const dims = H.snowflake({ r: { PRICE_TO_EARNINGS: 10, PRICE_TO_BOOK: 1.2, ROAE_TR_AVG5Q: 0.2, ROAA_TR_AVG5Q: 0.1, DIVIDEND_YIELD: 0.05 },
    band: { pe: { median: 12 }, pb: { median: 1.5 } }, fair: { average: 25, upside: 25 }, price: 20, years: ys, est: { rev: 1400 * B, np: 150 * B },
    divs: [1500, 1500, 1000], pio: H.piotroski(ys), alt: H.altman(ys, 900 * B) });
  assert.deepEqual(plain(dims.map(d => d.key)), ["value", "future", "past", "health", "dividend"]);
  for (const d of dims) assert.ok(d.score >= 0 && d.score <= 6, d.key);
  assert.equal(dims[0].score, 6);
  assert.equal(dims[1].score, 6);
  const empty = H.snowflake({ years: [] });
  assert.ok(empty.every(d => d.score === null || d.score >= 0));
});

test("VSvg: radar / band / bars / flows render without NaN", () => {
  const out = [VSvg.radar([{ label: "A", score: 3 }, { label: "B", score: null }, { label: "C", score: 6 }, { label: "D", score: 0 }, { label: "E", score: 2 }]),
    VSvg.band([{ date: "2024-01-01", value: 10 }, { date: "2025-01-01", value: 12 }], { mean: 11, sd: 1, min: 10, max: 12 }),
    VSvg.bars(["Q1", "Q2"], [{ cls: "barA", values: [10, -5] }, { cls: "barB", values: [null, 3] }], { cls: "acc", values: [5, null] }),
    VSvg.flows([1, -2, null, 4])];
  for (const s of out) { assert.match(s, /^<svg/); assert.doesNotMatch(s, /NaN|Infinity|undefined/); }
  assert.equal(VSvg.bars([], []), "");
});

test("Health review fixes: missing data is not a pass", () => {
  const two = H.byYear([...YEAR(2025, { 11000: 5, 13100: 3, 14400: 10, 23000: 1, 21001: 8 }), ...YEAR(2024, { 14400: 9, 23000: 1 })]);
  const p = H.piotroski(two), m = Object.fromEntries(p.checks.map(c => [c.key, c.pass]));
  assert.equal(m.dgm, null); assert.equal(m.dcr, null); assert.equal(m.accrual, null); assert.equal(m.cfo, null);
  assert.ok(p.known < 9 && p.score <= p.known);
  const dims = H.snowflake({ r: {}, years: H.byYear(YEAR(2025, { 11000: 5, 13100: 3, 14000: 4, 14400: 10, 23800: -2, 23000: -1 })), divs: [0, 0, 0, 0], price: 0, fair: { average: 10 } });
  const c = Object.fromEntries(dims.flatMap(d => d.checks).map(x => [x.key, x.pass]));
  assert.equal(c.cover, false); assert.equal(c.stable, false); assert.equal(c.fair, null);
  assert.equal(V.band([...Array.from({ length: 25 }, () => ({ value: 10 })), { value: -3 }]).percentile, null);
});
