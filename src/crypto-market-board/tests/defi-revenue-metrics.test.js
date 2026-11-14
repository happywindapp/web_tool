// DefiMetrics (pure). Run: node --test src/crypto-market-board/tests/defi-revenue-metrics.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/defi-revenue-metrics.js"), "utf8") + "\n;globalThis.M = DefiMetrics;", ctx);
const M = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} !~ ${b}`);
const F = (id, name, extra) => ({ id, name, slug: name.toLowerCase(), category: "Lending", chains: ["Ethereum"], parent: null, d1: 0, p1: 0, d7: 0, d30: 0, y1: 0, ...extra });

test("annual prefers total1y, else 30d scaled; ratio is null for non-positive input", () => {
  assert.equal(M.annual(1000, 50), 1000);
  near(M.annual(0, 30), 365);
  assert.equal(M.annual(0, 0), 0);
  assert.equal(M.ratio(100, 10), 10);
  assert.equal(M.ratio(null, 10), null);
  assert.equal(M.ratio(100, 0), null);
  near(M.pctOf(110, 100), 10);
  assert.equal(M.pctOf(5, 0), null);
});

test("revenueRows joins fees + revenue + mcap, groups children of one parent, computes P/F P/S and share", () => {
  const fees = [F("1", "Aave V2", { parent: "parent#aave", d30: 30, y1: 365 }), F("2", "Aave V3", { parent: "parent#aave", d30: 90, y1: 1095 }), F("3", "Solo", { d30: 10, y1: 0 }), F("4", "Dead")];
  const rev = [F("1", "Aave V2", { d30: 3, y1: 36 }), F("2", "Aave V3", { d30: 9, y1: 110 }), F("3", "Solo", { d30: 5 })];
  const prot = [{ id: "1", name: "Aave V2", slug: "aave v2", mcap: 1460, symbol: "AAVE", parentProtocol: "parent#aave" }, { id: "2", name: "Aave V3", slug: "aave-v3", mcap: null, parentProtocol: "parent#aave" },
    { id: "9", name: "Solo", slug: "solo", mcap: 100, symbol: "SOLO" }];
  const rows = M.revenueRows(fees, rev, prot);
  assert.equal(rows.length, 2);
  const a = rows.find(r => r.key === "parent#aave"), s = rows.find(r => r.name === "Solo");
  assert.equal(a.name, "Aave");
  assert.equal(a.kids, 2);
  assert.equal(a.symbol, "AAVE");
  assert.equal(a.f30, 120);
  assert.equal(a.fAnn, 1460);
  assert.equal(a.rAnn, 146);
  near(a.pf, 1); near(a.ps, 10);
  near(a.share, 10);
  assert.equal(s.mcap, 100);
  near(s.rAnn, 5 * 365 / 30);
  near(s.ps, 100 / (5 * 365 / 30));
  assert.equal(s.share, 50);
});

test("P/S is null without market cap or revenue", () => {
  const rows = M.revenueRows([F("1", "A", { d30: 10 }), F("2", "B", { d30: 10 })], [F("2", "B", { d30: 0 })], [{ id: "2", name: "B", slug: "b", mcap: 50 }]);
  assert.equal(rows.find(r => r.name === "A").ps, null);
  assert.equal(rows.find(r => r.name === "B").ps, null);
  assert.ok(rows.find(r => r.name === "B").pf > 0);
});

test("protocolGroups drops CEX by default, merges parents, weights change by TVL", () => {
  const P = (id, tvl, c1, c7, extra) => ({ id, name: "P" + id, slug: "p" + id, symbol: "", category: "Dexs", chains: ["A"], tvl, change_1d: c1, change_7d: c7, mcap: null, ...extra });
  const list = [P("1", 100, 10, 0, { parent: "parent#x" }), P("2", 100, -10, 0, { parent: "parent#x" }), P("3", 500, 0, 0, { category: "CEX" }), P("4", 50, null, null, { mcap: 25, symbol: "Z" })];
  const g = M.protocolGroups(list);
  assert.equal(g.length, 2);
  const x = g.find(r => r.key === "parent#x");
  assert.equal(x.tvl, 200);
  near(x.c1, (200 / (100 / 1.1 + 100 / 0.9) - 1) * 100);
  assert.equal(M.protocolGroups(list, { cex: true }).length, 3);
  assert.equal(g.find(r => r.name === "P4").mcapTvl, 0.5);
});

test("categoryRows aggregates TVL with weighted 7d change; chainRows share", () => {
  const cats = M.categoryRows([{ category: "Dexs", tvl: 100, p7: 100 }, { category: "Dexs", tvl: 100, p7: 50 }, { category: "Lending", tvl: 500, p7: 500 }]);
  assert.equal(cats[0].category, "Lending");
  near(cats[1].c7, (200 / 150 - 1) * 100);
  const ch = M.chainRows([{ name: "A", tvl: 75 }, { name: "B", tvl: 25 }, { name: "C", tvl: 0 }]);
  assert.equal(ch.length, 2);
  assert.equal(ch[0].share, 75);
});

test("dexRows shares + change, stable totals, sorting with nulls last, series change", () => {
  const d = M.dexRows([F("1", "A", { d1: 75, p1: 50, d7: 300 }), F("2", "B", { d1: 25, p1: 0, d7: 70 })]);
  assert.equal(d.find(r => r.name === "A").share, 75);
  assert.equal(d.find(r => r.name === "A").c1, 50);
  assert.equal(d.find(r => r.name === "B").c1, null);
  const t = M.stableTotals([{ cur: 110, d1: 100, d7: 100, d30: 200 }, { cur: 90, d1: 0, d7: 0, d30: 0 }]);
  near(t.c7, (200 / 190 - 1) * 100); near(t.c30, (200 / 290 - 1) * 100);
  const sr = M.stableRows([{ cur: 105, d1: 100, d7: 0, d30: 0 }])[0];
  near(sr.c1, 5); assert.equal(sr.c7, null);
  assert.deepEqual(plain(M.sortRows([{ v: 1 }, { v: null }, { v: 3 }], "v").map(r => r.v)), [3, 1, null]);
  assert.deepEqual(plain(M.sortRows([{ v: 1 }, { v: null }, { v: 3 }], "v", 1).map(r => r.v)), [1, 3, null]);
  assert.deepEqual(plain(M.sortRows([{ n: "b" }, { n: "a" }], "n", 1).map(r => r.n)), ["a", "b"]);
  const day = 86400, s = [{ time: 0, value: 100 }, { time: 7 * day, value: 110 }, { time: 14 * day, value: 121 }];
  near(M.seriesChange(s, 7), 10);
  assert.equal(M.seriesChange(s, 30), null);
});

test("symbol and market cap fall back to parent siblings, then to the caller-supplied lookup", () => {
  const prot = [{ id: "7", name: "Hyper Bridge", slug: "hb", symbol: "HYPE", mcap: null, parentProtocol: "parent#hyper" }];
  const fees = [F("7", "Hyper Bridge", { parent: "parent#hyper", d30: 100, y1: 1200 }), F("8", "Hyper Perps", { parent: "parent#hyper", d30: 50 })];
  const rev = [F("8", "Hyper Perps", { d30: 20 })];
  const r = M.revenueRows(fees, rev, prot, sym => sym === "HYPE" ? 3000 : null)[0];
  assert.equal(r.name, "Hyper");
  assert.equal(r.symbol, "HYPE");
  assert.equal(r.mcap, 3000);
  assert.equal(M.revenueRows(fees, rev, prot)[0].ps, null);
});
