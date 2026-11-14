// Pure modules of the crypto board (no DOM, no network). Run: node --test src/crypto-market-board/tests/crypto-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["crypto-number-format.js", "coin-symbol-parser.js", "crypto-alert-rules.js", "portfolio-and-trade-calculators.js", "board-columns-crypto.js", "watchlist-export-file-format.js", "market-overview-math.js", "coin-picks-ranking.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { Currency, Fmt, CoinParse, AlertRule, Pnl, Calc, BoardCols, WatchFile, MarketMath, CoinPicks };", ctx);
const { Currency, Fmt, CoinParse, AlertRule, Pnl, Calc, BoardCols, WatchFile, MarketMath, CoinPicks } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));

test("Fmt: adaptive price decimals, compact money, signed %", () => {
  assert.equal(Fmt.price(65842.551), "65,842.55");
  assert.equal(Fmt.price(1.23456), "1.2346");
  assert.equal(Fmt.price(0.0000123456), "0.00001235");
  assert.equal(Fmt.price(0.5), "0.5");
  assert.equal(Fmt.big(1.32e12), "1.32T");
  assert.equal(Fmt.pct(-4.5), "-4.50%");
  assert.equal(Fmt.pct(null), "");
  assert.equal(Fmt.money(1234.5), "$1,234.50");
});

test("Currency: VND only once a rate is known", () => {
  Currency.set("VND");
  assert.equal(Currency.active(), "USD");
  Currency.setRate(25000);
  assert.equal(Fmt.money(2), "50,000 ₫");
  assert.equal(Fmt.moneyBig(1e6), "25.00B ₫");
  Currency.set("USD");
});

test("CoinParse: tickers, quote suffixes stripped, bad tokens reported", () => {
  assert.deepEqual(plain(CoinParse.parse("btc, ETH/USDT; SOLUSDT $doge NOT-A-COIN 12345 btc")), { symbols: ["BTC", "ETH", "SOL", "DOGE"], bad: ["NOT-A-COIN", "12345"] });
  assert.deepEqual(plain(CoinParse.clean(["BTC", "BTC", "<b>", 5, "1000SATS"])), ["BTC", "1000SATS"]);
  assert.equal(CoinParse.norm("USDT"), "USDT");
});

test("AlertRule: fires once on price / 24h change", () => {
  const list = [{ id: "a1", sym: "BTC", type: "above", value: 60000, fired: 0 }, { id: "a2", sym: "ETH", type: "pctDown", value: 5, fired: 0 }];
  const rows = new Map([["BTC", { last: 61000, pct: 1 }], ["ETH", { last: 1800, pct: -6 }]]);
  const r = AlertRule.check(list, rows, 123);
  assert.equal(r.hits.length, 2);
  assert.equal(r.list[0].fired, 123);
  assert.equal(AlertRule.check(r.list, rows).hits.length, 0);
  assert.equal(AlertRule.valid({ type: "pctUp", value: 0 }), false);
});

test("Pnl: position and portfolio summary", () => {
  assert.deepEqual(plain(Pnl.position({ qty: 2, cost: 100 }, 150)), { value: 300, invested: 200, pnl: 100, pnlPct: 50 });
  const s = Pnl.summary([{ sym: "A", qty: 1, cost: 10, price: 30 }, { sym: "B", qty: 10, cost: null, price: 1 }]);
  assert.equal(s.value, 40); assert.equal(s.pnl, 20); assert.equal(s.alloc[0].sym, "A"); assert.equal(Math.round(s.alloc[0].share), 75);
});

test("Calc: DCA weekly, futures liquidation, risk size, convert", () => {
  const day = 86400, bars = Array.from({ length: 21 }, (_, i) => ({ time: 4 * day + i * day, close: 100 + i }));
  const d = Calc.dca(bars, { amount: 100, every: "week" });
  assert.equal(d.buys, 3); assert.equal(d.invested, 300); assert.ok(d.roi > 0);
  const f = Calc.futures({ side: "long", entry: 100, lev: 10, margin: 100, exit: 110, mmr: 0.5 });
  assert.equal(Math.round(f.liq * 100) / 100, 90.5); assert.equal(Math.round(f.pnl), 100); assert.equal(Math.round(f.roe), 100);
  assert.equal(Math.round(Calc.futures({ side: "short", entry: 100, lev: 5, margin: 10, mmr: 0 }).liq), 120);
  const s = Calc.size({ balance: 1000, riskPct: 1, entry: 100, stop: 95 });
  assert.equal(s.risk, 10); assert.equal(s.qty, 2); assert.equal(s.notional, 200);
  assert.equal(Calc.convert(2, 50, 25), 4); assert.equal(Calc.convert(2, 0, 25), null);
});

test("BoardCols: column sets, sort with empty values last, sparkline, countdown", () => {
  const cols = BoardCols.visible("watch", { pos: false, spark: false });
  assert.ok(!cols.some(c => c.k === "qty" || c.k === "spark"));
  const rows = [{ sym: "A", pct: 1 }, { sym: "B", pct: null }, { sym: "C", pct: 5 }];
  assert.deepEqual(BoardCols.sort(rows, cols, "pct", -1).map(r => r.sym), ["C", "A", "B"]);
  assert.match(BoardCols.spark([1, 2, 3], 2), /<polyline class="pl up"/);
  assert.equal(BoardCols.countdown(3 * 3600e3 + 5 * 60e3), "03:05");
});

test("WatchFile: JSON round trip keeps holdings / alerts of exported tickers; CSV takes first column", () => {
  const json = WatchFile.build({ watch: ["BTC", "ETH"], holdings: { BTC: { qty: 1 }, XRP: { qty: 5 } }, alerts: [{ sym: "ETH", type: "above", value: 3000, id: "x" }] });
  const r = WatchFile.parse(json);
  assert.deepEqual(plain(r.symbols), ["BTC", "ETH"]); assert.deepEqual(Object.keys(r.holdings), ["BTC"]); assert.equal(r.alerts.length, 1);
  assert.deepEqual(plain(WatchFile.parse("sym,qty\nBTC,1\nSOL,3").symbols), ["SYM", "BTC", "SOL"]);
  assert.throws(() => WatchFile.parse("  "));
});

test("MarketMath: stablecoins / wrapped left out, altcoin season, dominance", () => {
  assert.equal(MarketMath.isStable({ sym: "USDT" }), true);
  assert.equal(MarketMath.isWrapped({ sym: "WBTC", name: "Wrapped Bitcoin" }), true);
  assert.equal(MarketMath.isWrapped({ sym: "ETH", name: "Ethereum" }), false);
  const rows = [{ sym: "BTC", rank: 1, pct30d: 0 }, ...Array.from({ length: 20 }, (_, i) => ({ sym: "C" + i, rank: i + 2, pct30d: i < 16 ? 5 : -5, last: 2 }))];
  const a = MarketMath.altSeason(rows);
  assert.equal(a.score, 80); assert.equal(a.phase, "alt");
  const d = MarketMath.dominance({ btc: 58, eth: 10, usdt: 8 }, 2);
  assert.deepEqual(plain(d.map(x => x.k)), ["BTC", "ETH", ""]);
});

test("CoinPicks: horizon rules — trend buys, oversold bounce, good-price longs, overheated sells", () => {
  const base = { price: 1, rank: 10, d: 0, rsi: 50, w: 0, above200: true, mayer: 1, athPct: -20, ret1y: 0, fdvR: 1, turnover: 2 };
  const rows = [
    { ...base, sym: "UPT", d: 60, rsi: 62, w: 40 },
    { ...base, sym: "DIP", d: -20, rsi: 28, w: 20 },
    { ...base, sym: "CHEAP", athPct: -75, mayer: 0.85, w: 5 },
    { ...base, sym: "HOT", mayer: 2.4, athPct: -3, rsi: 80, ret1y: 300 },
    { ...base, sym: "DOWN", d: -50, w: -45, above200: false, mayer: 0.7, athPct: -90, fdvR: 4 },
  ];
  const r = CoinPicks.rank(rows), syms = k => r[k].map(x => x.sym);
  assert.deepEqual(plain(syms("buyShort")), ["UPT", "DIP"]);
  assert.ok(syms("buyMedium").includes("UPT") && !syms("buyMedium").includes("DOWN"));
  assert.deepEqual(plain(syms("buyLong")), ["CHEAP"]);
  assert.deepEqual(plain(syms("sellShort")), ["DOWN", "HOT"]);
  assert.deepEqual(plain(syms("sellMedium")), ["DOWN"]);
  assert.deepEqual(plain(syms("sellLong")), ["HOT", "DOWN"]);
  assert.ok(r.buyLong[0].reasons.some(x => x.key === "ath" && x.v === -75));
});
