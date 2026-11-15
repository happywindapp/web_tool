// CoinSignals + ScreenerRules + SignalAlertRule (pure). Run: node --test src/crypto-market-board/tests/coin-signals-screener-and-signal-alerts.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const stock = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "technical-outlook-scoring.js"].map(f => path.join(__dirname, "../../vn-stock-price-board/js/model", f));
const mine = ["coin-technical-signals.js", "coin-screener-rules.js", "signal-alert-rules.js"].map(f => path.join(__dirname, "../js/model", f));
const ctx = vm.createContext({});
vm.runInContext(stock.concat(mine).map(f => fs.readFileSync(f, "utf8")).join("\n;\n") + "\n;globalThis.M = { TA, CoinSignals, ScreenerRules, SignalAlertRule };", ctx);
const { TA, CoinSignals, ScreenerRules, SignalAlertRule } = ctx.M;
const plain = x => JSON.parse(JSON.stringify(x));

const mk = (closes, vols = []) => closes.map((c, i) => ({ time: 1.6e9 + i * 86400, open: c, high: c * 1.005, low: c * 0.995, close: c, volume: vols[i] ?? 1000 }));
const flat = (n, v = 100) => Array.from({ length: n }, () => v);
const keys = (bars, look) => plain(CoinSignals.events(bars, look)).map(e => e.key);

test("events: nothing on a flat series, short series returns []", () => {
  assert.deepEqual(plain(CoinSignals.events(mk(flat(250)), 10)), []);
  assert.deepEqual(plain(CoinSignals.events(mk(flat(20)), 10)), []);
});

test("volSpike / breakout20 / breakdown20 on the last bar", () => {
  const up = mk([...flat(60), 110], [...flat(60, 1000), 2500]);
  assert.ok(keys(up, 0).includes("breakout20") && keys(up, 0).includes("volSpike") && !keys(up, 0).includes("breakdown20"));
  assert.equal(plain(CoinSignals.events(up, 0, ["volSpike"]))[0].barsAgo, 0);
  assert.ok(keys(mk([...flat(60), 90]), 0).includes("breakdown20"));
  assert.ok(!keys(mk([...flat(60), 100.2]), 0).includes("breakout20"));
});

test("barsAgo counts back from the last bar and respects lookback", () => {
  const bars = mk([...flat(60), 110, 110, 110]);
  const e = plain(CoinSignals.events(bars, 5)).find(x => x.key === "breakout20");
  assert.equal(e.barsAgo, 2);
  assert.ok(!keys(bars, 1).includes("breakout20"));
});

test("golden cross after a long decline then a strong rally; death cross on the mirror", () => {
  const c = [...Array.from({ length: 220 }, (_, i) => 200 - i * 0.5), ...Array.from({ length: 120 }, (_, i) => 90 + i * 2)];
  const g = plain(CoinSignals.events(mk(c), 120));
  assert.ok(g.some(e => e.key === "goldenCross" && e.barsAgo > 0), "golden cross found");
  assert.ok(g.some(e => e.key === "crossUp200"));
  const d = plain(CoinSignals.events(mk(c.map(v => 300 - v)), 120));
  assert.ok(d.some(e => e.key === "deathCross" || e.key === "crossDown200"));
});

test("RSI exit oversold / overbought and MACD cross are reported at the bar where they happen", () => {
  const w = i => Math.sin(i) * 3, down = Array.from({ length: 60 }, (_, i) => 200 - i * 2 + w(i)), c = [...down, ...Array.from({ length: 50 }, (_, i) => 80 + i * 2 + w(i + 60))];
  const bars = mk(c), r = TA.rsi(c, 14), ev = plain(CoinSignals.events(bars, 60));
  const o = ev.find(e => e.key === "rsiExitOversold"), i = c.length - 1 - o.barsAgo;
  assert.ok(r[i - 1] < 30 && r[i] >= 30);
  const m = ev.find(e => e.key === "macdUp"), mi = c.length - 1 - m.barsAgo, md = TA.macd(c);
  assert.ok(md.line[mi - 1] <= md.signal[mi - 1] && md.line[mi] > md.signal[mi]);
  const top = mk([...Array.from({ length: 60 }, (_, i) => 100 + i * 2 + w(i)), ...Array.from({ length: 40 }, (_, i) => 218 - i * 2 + w(i + 60))]);
  assert.ok(keys(top, 60).includes("rsiExitOverbought") && keys(top, 60).includes("macdDown"));
});

test("snapshot: fields, volume ratio, distance to 52-week high; null when too short", () => {
  assert.equal(CoinSignals.snapshot(mk(flat(10))), null);
  const s = CoinSignals.snapshot(mk([...flat(250, 100), 120], [...flat(250, 1000), 3000]));
  assert.equal(s.price, 120);
  assert.ok(Math.abs(s.volRatio - 3) < 1e-9);
  assert.ok(Math.abs(s.vsMa200 - (120 / s.ma200 - 1) * 100) < 1e-9 && s.vsMa200 > 0);
  assert.ok(s.fromHi52 < 0 && s.fromHi52 > -2.5);
  assert.ok(s.macdAbove === true || s.macdAbove === false);
});

test("closed(): drops the forming bar only", () => {
  const bars = mk(flat(40)), t = bars[39].time;
  assert.equal(CoinSignals.closed(bars, "1d", 0, (t + 3600) * 1000).length, 39);
  assert.equal(CoinSignals.closed(bars, "1d", 0, (t + 86400) * 1000).length, 40);
  assert.equal(CoinSignals.closed(bars, "1d", 7200, (t + 86400 - 7200) * 1000).length, 40);
  assert.deepEqual(CoinSignals.closed([], "1h"), []);
});

test("every event key has a name + explanation", () => {
  for (const k of CoinSignals.KEYS) assert.ok(CoinSignals.META[k][0] && CoinSignals.META[k][1], k);
  assert.equal(CoinSignals.KEYS.length, 11);
});

const item = (o = {}) => ({ snap: { rsi: 50, score: 10, price: 110, ma50: 105, ma200: 100, volRatio: 1, ...o.snap }, events: o.events || [], row: { sym: "X", pct: 1, pct7d: 5, athPct: -30, mcap: 5e9, last: 110, ...o.row } });

test("ScreenerRules.match: ranges, MA side, ATH, market cap, volume, signals within N bars", () => {
  const P = k => ScreenerRules.preset(k);
  assert.ok(ScreenerRules.match(item(), ScreenerRules.EMPTY));
  assert.ok(!ScreenerRules.match(item(), { rsiMin: 60 }));
  assert.ok(ScreenerRules.match(item({ snap: { rsi: 30 } }), P("oversoldUp")));
  assert.ok(!ScreenerRules.match(item({ snap: { rsi: 30, price: 90 } }), P("oversoldUp")));
  assert.ok(!ScreenerRules.match(item({ snap: { rsi: 40 } }), P("oversoldUp")));
  assert.ok(ScreenerRules.match(item({ snap: { rsi: 80 } }), P("overbought")));
  assert.ok(!ScreenerRules.match(item({ snap: { ma200: null } }), { ma200: "above" }));
  assert.ok(ScreenerRules.match(item(), { ma50: "above", athMax: 40, mcapMin: 1000, p7Min: 5, p7Max: 5 }));
  assert.ok(!ScreenerRules.match(item(), { athMax: 20 }));
  assert.ok(!ScreenerRules.match(item(), { mcapMin: 6000 }));
  const ev = [{ key: "goldenCross", barsAgo: 4 }];
  assert.ok(ScreenerRules.match(item({ events: ev }), P("golden")));
  assert.ok(!ScreenerRules.match(item({ events: [{ key: "goldenCross", barsAgo: 11 }] }), P("golden")));
  assert.ok(!ScreenerRules.match(item({ events: [{ key: "macdUp", barsAgo: 1 }] }), P("golden")));
  assert.ok(!ScreenerRules.match(item({ events: [{ key: "breakout20", barsAgo: 0 }], snap: { volRatio: 1.2 } }), P("breakout")));
  assert.ok(ScreenerRules.match(item({ events: [{ key: "breakout20", barsAgo: 0 }], snap: { volRatio: 1.6 } }), P("breakout")));
  assert.ok(ScreenerRules.match(item({ events: [{ key: "crossDown200", barsAgo: 2 }] }), P("bearish")));
  assert.equal(ScreenerRules.match({ snap: null, events: [], row: {} }, {}), false);
});

test("ScreenerRules.clean: drops junk, keeps valid; every preset is valid", () => {
  const c = ScreenerRules.clean({ rsiMin: "abc", ma50: "x", sig: ["macdUp", "nope"], within: 999, hax: 1 });
  assert.equal(c.rsiMin, ""); assert.equal(c.ma50, ""); assert.deepEqual(plain(c.sig), ["macdUp"]); assert.equal(c.within, 60); assert.ok(!("hax" in c));
  assert.deepEqual(plain(ScreenerRules.clean(null)), plain(ScreenerRules.EMPTY));
  for (const k of Object.keys(ScreenerRules.PRESETS)) assert.deepEqual(plain(ScreenerRules.clean(ScreenerRules.preset(k))), plain(ScreenerRules.preset(k)), k);
});

test("ScreenerRules.sort: numeric both ways, text, empty values last, stable", () => {
  const a = item({ row: { sym: "A" }, snap: { rsi: 30 } }), b = item({ row: { sym: "B" }, snap: { rsi: 70 } }), n = item({ row: { sym: "C" }, snap: { rsi: null } });
  assert.deepEqual(ScreenerRules.sort([n, a, b], "rsi", "desc").map(x => x.row.sym), ["B", "A", "C"]);
  assert.deepEqual(ScreenerRules.sort([n, b, a], "rsi", "asc").map(x => x.row.sym), ["A", "B", "C"]);
  assert.deepEqual(ScreenerRules.sort([b, a], "coin", "asc").map(x => x.row.sym), ["A", "B"]);
  assert.deepEqual(ScreenerRules.sort([a, b], "nope", "asc").map(x => x.row.sym), ["A", "B"]);
});

const alert = (o = {}) => ({ id: "a1", sym: "BTC", signal: "volSpike", interval: "1h", horizon: "", fired: 0, bar: 0, ...o });

test("SignalAlertRule.valid / needs", () => {
  assert.ok(SignalAlertRule.valid(alert()));
  assert.ok(SignalAlertRule.valid(alert({ signal: "buyZone", interval: "", horizon: "long" })));
  assert.ok(!SignalAlertRule.valid(alert({ signal: "nope" })) && !SignalAlertRule.valid(alert({ interval: "5m" })) && !SignalAlertRule.valid(alert({ signal: "sellZone", horizon: "x" })) && !SignalAlertRule.valid(null));
  const n = SignalAlertRule.needs([alert(), alert({ id: "a2", interval: "4h" }), alert({ id: "a3", signal: "buyZone", horizon: "short" }), alert({ id: "a4", fired: 1, sym: "ETH" })]);
  assert.deepEqual([...n.bars.keys()], ["BTC|1h", "BTC|4h"]); assert.deepEqual([...n.zones], ["BTC"]);
});

test("SignalAlertRule.evaluate: candle hit on the last closed bar, never twice for the same bar", () => {
  const bars = mk([...flat(60), 100], [...flat(60, 1000), 3000]), t = bars[60].time;
  const ctx2 = { bars: new Map([["BTC|1h", bars]]), advice: new Map(), price: new Map() };
  const hits = SignalAlertRule.evaluate([alert()], ctx2);
  assert.equal(hits.length, 1); assert.equal(hits[0].bar, t);
  assert.equal(SignalAlertRule.evaluate([alert({ bar: t })], ctx2).length, 0);
  assert.equal(SignalAlertRule.evaluate([alert({ fired: 5 })], ctx2).length, 0);
  assert.equal(SignalAlertRule.evaluate([alert({ signal: "macdUp" })], ctx2).length, 0);
  assert.equal(SignalAlertRule.evaluate([alert()], { ...ctx2, bars: new Map() }).length, 0);
  assert.equal(SignalAlertRule.evaluate([alert()], { ...ctx2, bars: new Map([["BTC|1h", bars.slice(0, 20)]]) }).length, 0);
});

test("SignalAlertRule.evaluate: zone alerts fire when the price is inside the horizon's zone", () => {
  const adv = { horizons: [{ id: "short", buy: { lo: 90, hi: 95 }, sell: { lo: 110, hi: 120 } }, { id: "long", buy: { lo: 50, hi: 60 }, sell: { lo: 200, hi: 220 } }] };
  const run = (a, p) => SignalAlertRule.evaluate([a], { bars: new Map(), advice: new Map([["BTC", adv]]), price: new Map([["BTC", p]]) });
  const buy = alert({ signal: "buyZone", interval: "", horizon: "short" }), sell = alert({ signal: "sellZone", interval: "", horizon: "long" });
  assert.equal(run(buy, 92).length, 1); assert.equal(run(buy, 96).length, 0); assert.equal(run(buy, 90).length, 1);
  assert.equal(run(sell, 210).length, 1); assert.equal(run(sell, 115).length, 0);
  assert.equal(run(buy, 0).length, 0); assert.equal(run(buy, undefined).length, 0);
  assert.equal(SignalAlertRule.evaluate([buy], { bars: new Map(), advice: new Map(), price: new Map([["BTC", 92]]) }).length, 0);
  assert.ok(SignalAlertRule.bearish(sell) && !SignalAlertRule.bearish(buy) && SignalAlertRule.bearish(alert({ signal: "macdDown" })));
});
