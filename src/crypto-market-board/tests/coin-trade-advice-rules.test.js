// CoinAdvice (pure): action, buy / sell zones, stop, timing and notes per horizon. Run: node --test src/crypto-market-board/tests/coin-trade-advice-rules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const stock = ["technical-indicators-trend-and-bands.js", "technical-indicators-oscillators.js", "technical-outlook-scoring.js"].map(f => path.join(__dirname, "../../vn-stock-price-board/js/model", f));
const files = stock.concat([path.join(__dirname, "../js/model/coin-trade-advice-rules.js"), path.join(__dirname, "../js/i18n/en-crypto-trade-advice-strings.js")]);
const ctx = vm.createContext({});
vm.runInContext("const EN = {}; const I18n = { add: o => Object.assign(EN, o) };\n" + files.map(f => fs.readFileSync(f, "utf8")).join("\n;\n") + "\n;globalThis.M = { CoinAdvice, EN };", ctx);
const { CoinAdvice, EN } = ctx.M;

// Trend with a wave; step = seconds per candle, k = % per candle, w = wave size (0.01 = smooth trend → extreme RSI).
const series = (n, step, k, start = 100, w = 0.06) => Array.from({ length: n }, (_, i) => {
  const c = start * Math.pow(1 + k / 100, i) * (1 + Math.sin(i / 4) * w);
  return { time: 1.6e9 + i * step, open: c * 0.998, high: c * 1.01, low: c * 0.99, close: c, volume: 1000 + (i % 5) * 50 };
});
const coin = k => ({ h4: series(300, 14400, k / 6), d1: series(400, 86400, k), w1: series(120, 604800, k * 7) });
const keysOf = v => [...v.horizons.flatMap(h => [h.action, h.buy.basis, h.sell.basis, h.stop.basis, ...h.timing.map(t => t[0]), ...h.timing.map(t => t[1].tf).filter(Boolean)]), ...v.notes.map(n => n[1])];

test("uptrend: buy-side action, zones on the right side of price, stop below the buy zone", () => {
  const v = CoinAdvice.build(coin(0.3));
  assert.equal(v.horizons.length, 3);
  for (const h of v.horizons) {
    assert.ok(h.buy.lo <= h.buy.hi && h.buy.hi <= v.price + 1e-9, h.id);
    assert.ok(h.sell.hi >= h.sell.lo && h.sell.lo >= v.price - 1e-9, h.id);
    assert.ok(h.stop.v < h.buy.lo, h.id);
  }
  assert.ok(v.horizons.some(h => h.tone === "up"));
  assert.ok(v.notes.some(n => n[1].startsWith("Giá trên MA200")));
});

test("downtrend: sell-side action and MA200 warning", () => {
  const v = CoinAdvice.build(coin(-0.3));
  assert.ok(v.horizons.every(h => h.tone !== "up"));
  assert.ok(v.horizons.some(h => h.tone === "down"));
  assert.ok(v.notes.some(n => n[1].startsWith("Giá dưới MA200")));
});

test("notes: funding, fear & greed, BTC trend, liquidity, always DCA last", () => {
  const v = CoinAdvice.build(coin(0.1), { funding: 0.05, fng: 10, qvol: 1e6, btc: series(300, 86400, -0.4) });
  const k = v.notes.map(n => n[1]);
  assert.ok(k.some(x => x.startsWith("Funding {f}")));
  assert.ok(k.some(x => x.includes("sợ hãi tột độ")));
  assert.ok(k.some(x => x.startsWith("BTC đang trong xu hướng giảm")));
  assert.ok(k.some(x => x.startsWith("KL giao dịch 24h")));
  assert.ok(k.at(-1).startsWith("Chia vốn"));
  assert.ok(!CoinAdvice.build(coin(0.1), { isBtc: true, btc: series(300, 86400, -0.4) }).notes.some(n => n[1].startsWith("BTC")));
});

test("overheated / washed-out trend: RSI extremes override the action", () => {
  const smooth = k => ({ h4: series(300, 14400, k / 6, 100, 0.01), d1: series(400, 86400, k, 100, 0.01), w1: series(120, 604800, k * 7, 100, 0.01) });
  assert.ok(CoinAdvice.build(smooth(0.3)).horizons.some(h => h.action === "Không đuổi giá — chờ về vùng mua"));
  assert.ok(CoinAdvice.build(smooth(-0.3)).horizons.some(h => h.action === "Có thể hồi kỹ thuật — không bắt đáy lớn"));
});

test("too little history → null", () => {
  assert.equal(CoinAdvice.build({ h4: series(50, 14400, 0.1), d1: series(40, 86400, 0.1), w1: series(10, 604800, 0.1) }), null);
});

test("every produced text has English and all its placeholders filled", () => {
  for (const v of [CoinAdvice.build(coin(0.3)), CoinAdvice.build(coin(-0.3)), CoinAdvice.build(coin(0.02), { funding: -0.01, fng: 90, qvol: 1e6, btc: series(300, 86400, 0.4) })]) {
    for (const key of keysOf(v)) assert.ok(EN[key], `missing English: ${key}`);
    const pairs = [...v.horizons.flatMap(h => h.timing), ...v.notes.map(n => [n[1], n[2]])];
    for (const [key, p] of pairs) for (const [, name] of key.matchAll(/\{(\w+)\}/g)) assert.ok(p[name] != null, `${key}: {${name}}`);
  }
});
