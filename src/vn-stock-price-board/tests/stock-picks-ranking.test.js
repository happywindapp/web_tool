// Picks (pure): buy / sell lists per horizon. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/stock-picks-ranking.js"), "utf8") + "\n;globalThis.P = Picks;", ctx);
const P = ctx.P;
const syms = list => list.map(x => x.sym).join();
const R = (sym, o) => ({ sym, price: 10, d: 0, rsi: 50, w: 0, above200: null, ret1y: 0, pe: 12, pb: 1.5, roe: 12, dy: 2, secPe: 12, value: 20, ...o });

test("short / medium / long buy lists follow the rules and rank by strength", () => {
  const rows = [R("UPS", { d: 60, rsi: 60, w: 20 }), R("HOT", { d: 70, rsi: 80 }), R("DIP", { d: -40, rsi: 28, w: 10 }), R("WK", { w: 55, d: 5, above200: true }),
    R("VAL", { roe: 22, pe: 7, secPe: 14, dy: 6, above200: true }), R("QLT", { roe: 18, pe: 13, secPe: 14 }), R("EXP", { roe: 25, pe: 30, secPe: 14 })];
  const r = P.rank(rows);
  assert.equal(syms(r.buyShort), "UPS,DIP");
  assert.ok(!r.buyShort.some(x => x.sym === "HOT"), "overbought is not a short-term buy");
  assert.equal(r.buyMedium[0].sym, "WK");
  assert.equal(syms(r.buyLong), "VAL,QLT");
  const reasons = r.buyLong[0].reasons.map(x => x.key);
  assert.ok(reasons.includes("cheap") && reasons.includes("roe") && reasons.includes("secPe"));
});

test("sell lists: weak trend, overbought, expensive / loss-making below MA200", () => {
  const rows = [R("DN", { d: -60, w: -10 }), R("OB", { d: 30, rsi: 80 }), R("WKD", { w: -50, d: -5, above200: false, pe: 40, secPe: 12 }),
    R("LOSS", { above200: false, pe: -3, roe: -5, ret1y: -30 }), R("FINE", { above200: false, pe: 10, roe: 15 })];
  const r = P.rank(rows);
  assert.equal(syms(r.sellShort), "DN,OB");
  assert.equal(r.sellMedium[0].sym, "WKD");
  assert.ok(r.sellMedium[0].reasons.some(x => x.key === "dear"));
  assert.equal(syms(r.sellLong), "LOSS,WKD");
});

test("liquidity floor, top N, sector P/E medians", () => {
  const many = Array.from({ length: 20 }, (_, i) => R("S" + String(i).padStart(2, "0"), { d: 20 + i, rsi: 55 }));
  assert.equal(P.rank(many).buyShort.length, P.TOP);
  assert.equal(P.rank([R("ILQ", { d: 60, value: 0.2 })]).buyShort.length, 0);
  const med = P.sectorPe([{ sector: "A", pe: 10 }, { sector: "A", pe: 20 }, { sector: "A", pe: 12 }, { sector: "A", pe: -4 }, { sector: "B", pe: 9 }]);
  assert.equal(med.get("A"), 12);
  assert.equal(med.has("B"), false);
});
