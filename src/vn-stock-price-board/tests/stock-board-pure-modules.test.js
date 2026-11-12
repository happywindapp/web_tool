// Pure modules of the price board (no DOM, no network). Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const files = ["watchlist-symbol-parser.js", "quote-price-model.js", "board-columns-and-format.js", "intraday-chart-svg.js"];
const ctx = vm.createContext({});
vm.runInContext(files.map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { WatchParse, QuoteModel, Fmt, BoardCols, ChartSvg };", ctx);
const { WatchParse, QuoteModel, Fmt, BoardCols, ChartSvg } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));

// Shape of a VPS getliststockdata row (values made up).
const RAW = { sym: "ABC", marketId: "STO", sType: "S", c: 58.3, f: 50.7, r: 54.5, lastPrice: 54.2, lastVolume: 30, lot: 133730,
  g1: "54.2|6850|d", g2: "54.1|9960|d", g3: "ATO|120|e", g4: "54.4|110|d", g5: "54.5|1270|e", g6: "58.3|3420|c",
  openPrice: "54.8", highPrice: "54.8", lowPrice: "54.1", avePrice: "54.38", fBVol: "29610", fSVolume: "64034", fRoom: "105138158.30" };

test("WatchParse: splits, upper-cases, de-duplicates and reports non-tickers", () => {
  assert.deepEqual(plain(WatchParse.parse("VNM, fpt; HPG xyz 12 VN-30 vnm")), { symbols: ["VNM", "FPT", "HPG", "XYZ"], bad: ["12", "VN-30"] });
  assert.deepEqual(plain(WatchParse.clean(["VNM", "VNM", "<b>", 5, "CACB2207"])), ["VNM", "CACB2207"]);
  assert.deepEqual(plain(WatchParse.clean("VNM")), []);
});

test("QuoteModel.quote: signed change from ref, order book levels, exchange", () => {
  const q = QuoteModel.quote(RAW);
  assert.equal(q.ex, "HOSE");
  assert.equal(q.chg, -0.3);
  assert.ok(Math.abs(q.pct + 0.5505) < 1e-3);
  assert.deepEqual(plain(q.bids[0]), { p: 54.2, v: 6850 });
  assert.deepEqual(plain(q.bids[2]), { p: "ATO", v: 120 });
  assert.equal(q.totVol, 133730);
  assert.equal(q.cw, null);
  const noTrade = QuoteModel.quote({ ...RAW, lastPrice: 0 });
  assert.equal(noTrade.chg, 0);
  assert.equal(Fmt.chg(noTrade, noTrade.chg), "");
});

test("QuoteModel.tone: ceiling / floor / ref / up / down with float-safe compare", () => {
  const q = QuoteModel.quote(RAW);
  assert.equal(QuoteModel.tone(58.3, q), "ceil");
  assert.equal(QuoteModel.tone(50.7, q), "floor");
  assert.equal(QuoteModel.tone(54.5, q), "ref");
  assert.equal(QuoteModel.tone(0.1 + 54.4, q), "ref");
  assert.equal(QuoteModel.tone(54.6, q), "up");
  assert.equal(QuoteModel.tone(54.2, q), "down");
  assert.equal(QuoteModel.tone("ATC", q), "ref");
  assert.equal(QuoteModel.tone(0, q), "");
});

test("QuoteModel.index: change recomputed from previous close (feed sends it unsigned)", () => {
  const x = QuoteModel.index({ mc: "10", cIndex: 1734.75, oIndex: 1746.9, vol: 653554240, ot: "12.15|0.70%|15138346.941|102|203|65", time: "15:05:05" });
  assert.equal(x.name, "VNINDEX");
  assert.equal(x.chg, -12.15);
  assert.ok(Math.abs(x.pct + 0.6955) < 1e-3);
  assert.deepEqual([x.up, x.down, x.same, x.valueMil], [102, 203, 65, 15138346.941]);
});

test("QuoteModel.phase: Vietnam clock regardless of viewer time zone", () => {
  const at = (hhmm, day = "2026-11-12") => QuoteModel.phase(new Date(`${day}T${hhmm}:00+07:00`));
  assert.deepEqual(["08:59", "09:05", "10:00", "12:00", "13:30", "14:35", "14:50", "15:10"].map(t => at(t)),
    ["pre", "ato", "open", "break", "open", "atc", "plo", "closed"]);
  assert.equal(at("10:00", "2026-11-14"), "closed");
  assert.equal(QuoteModel.isLive("open"), true);
  assert.equal(QuoteModel.isLive("break"), false);
  assert.equal(QuoteModel.vnDate(new Date("2026-11-12T20:00:00Z")), "20261113");
});

test("QuoteModel trades: sides summed, unknown side kept apart", () => {
  const t = [{ lastPrice: 54.2, lastVol: 10, side: "B", time: "09:15:00" }, { lastPrice: 54.1, lastVol: 5, side: "S", time: "09:16:01" }, { lastPrice: 54.1, lastVol: 7, side: "X", time: "14:45:00" }].map(QuoteModel.trade);
  assert.deepEqual(plain(QuoteModel.tradeSides(t)), { B: 10, S: 5, "": 7 });
});

test("Fmt + BoardCols: units, option columns, compact mode, CSV row cells", () => {
  const q = QuoteModel.quote(RAW);
  assert.equal(Fmt.vol(6850, "x10"), "6,850");
  assert.equal(Fmt.vol(6850, "share"), "68,500");
  assert.equal(Fmt.big(105138158.3), "105.14M");
  const all = BoardCols.visible({ hl: true, fr: true }).length, bare = BoardCols.visible({}).length, compact = BoardCols.visible({ compact: true }).length;
  assert.equal(all - bare, 6);
  assert.equal(bare - compact, 10);
  const cells = BoardCols.rowCells(q, { unit: "x10" }), keys = BoardCols.visible({}).map(c => c.k);
  assert.deepEqual(plain(cells[keys.indexOf("sym")]), { t: "ABC", c: "down" });
  assert.deepEqual(plain(cells[keys.indexOf("pct")]), { t: "-0.55%", c: "down" });
  assert.deepEqual(plain(cells[keys.indexOf("a3p")]), { t: "58.30", c: "ceil" });
  assert.equal(cells[keys.indexOf("b3p")].t, "ATO");
});

test("BoardCols.sortQuotes: numeric with stable symbol tie-break, no key keeps feed order", () => {
  const list = [{ sym: "C", pct: 1 }, { sym: "A", pct: 2 }, { sym: "B", pct: 1 }];
  assert.deepEqual(plain(BoardCols.sortQuotes(list, "pct", -1).map(q => q.sym)), ["A", "B", "C"]);
  assert.deepEqual(plain(BoardCols.sortQuotes(list, "sym", 1).map(q => q.sym)), ["A", "B", "C"]);
  assert.equal(BoardCols.sortQuotes(list, "", 0), list);
});

test("ChartSvg: minute bars and SVG output without NaN", () => {
  const trades = [{ time: "09:15:00", price: 54, vol: 10 }, { time: "09:15:40", price: 54.2, vol: 5 }, { time: "13:01:00", price: 53.9, vol: 2 }];
  assert.deepEqual(plain(ChartSvg.minuteBars(trades)), [{ m: 555, price: 54.2, vol: 15 }, { m: 781, price: 53.9, vol: 2 }]);
  const svg = ChartSvg.intraday(trades, { ref: 54.5 });
  assert.match(svg, /<path d="M/);
  assert.match(svg, /class="pl down"/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
  assert.doesNotMatch(ChartSvg.intraday([], { ref: 10 }), /NaN/);
  assert.doesNotMatch(ChartSvg.spark([], 1000), /NaN/);
});
