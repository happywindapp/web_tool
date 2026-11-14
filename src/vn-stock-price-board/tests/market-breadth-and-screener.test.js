// Mkt (pure): breadth, top lists, sector performance, screener, treemap. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(["quote-price-model.js", "market-breadth-sectors-and-screener.js"].map(f => fs.readFileSync(path.join(__dirname, "../js/model", f), "utf8")).join("\n;\n")
  + "\n;globalThis.M = { QuoteModel, Mkt };", ctx);
const { Mkt } = ctx.M;
const plain = v => JSON.parse(JSON.stringify(v));
const Q = (sym, last, extra = {}) => ({ sym, ex: "HOSE", ref: 10, ceil: 10.7, floor: 9.3, last, chg: last ? +(last - 10).toFixed(2) : 0, pct: last ? (last - 10) * 10 : 0,
  totVol: 1000, avg: last || 10, fBuy: 100, fSell: 0, ...extra });

test("breadth counts ceiling / up / unchanged / down / floor / no trade and sums value", () => {
  const b = Mkt.breadth([Q("A", 10.7), Q("B", 10.2), Q("C", 10), Q("D", 9.8), Q("E", 9.3), Q("F", 0)]);
  assert.deepEqual(plain({ ...b, value: 0 }), { ceil: 1, up: 1, same: 1, down: 1, floor: 1, none: 1, value: 0 });
  assert.equal(Mkt.value(Q("X", 10)), 1000 * 10 * 10 * 1000);
  assert.equal(Mkt.foreignNet(Q("X", 10)), 100 * 10 * 10 * 1000);
});

test("top and sector performance (cap-weighted)", () => {
  const qs = [Q("A", 10.5), Q("B", 9.5), Q("C", 11), Q("D", 0)];
  assert.deepEqual(plain(Mkt.top(qs, q => q.pct, 2).map(q => q.sym)), ["C", "A"]);
  assert.deepEqual(plain(Mkt.top(qs, q => q.pct, 1, true).map(q => q.sym)), ["B"]);
  const perf = Mkt.sectorPerf(qs, s => ({ A: "1", B: "1", C: "2" })[s], s => ({ A: 3, B: 1 })[s]);
  assert.equal(perf[0].code, "2");
  assert.ok(Math.abs(perf[1].pct - (3 * 5 + 1 * -5) / 4) < 1e-9);
  assert.equal(perf[1].up, 1); assert.equal(perf[1].down, 1);
});

test("screen: ranges inclusive, blank = no limit, missing ratio fails its criterion", () => {
  const rows = [Mkt.row(Q("A", 10.5), { mcap: 5e12, pe: 8, pb: 1.2, roe: 0.18, dy: 0.06 }, "0500"), Mkt.row(Q("B", 9.5), { mcap: 2e12, pe: 25, pb: 3, roe: 0.1 }, "0500"),
    Mkt.row(Q("C", 10), {}, "1300")];
  assert.equal(rows[0].mcap, 5000); assert.equal(rows[0].roe, 18); assert.equal(rows[0].dy, 6);
  const syms = c => plain(Mkt.screen(rows, c).map(r => r.sym));
  assert.deepEqual(syms({}), ["A", "B", "C"]);
  assert.deepEqual(syms({ peMax: "10" }), ["A"]);
  assert.deepEqual(syms({ peMin: 8, peMax: 25, pbMax: "" }), ["A", "B"]);
  assert.deepEqual(syms({ dyMin: 5 }), ["A"]);
  assert.deepEqual(syms({ pctMax: -5 }), ["B"]);
  assert.deepEqual(syms({ sector: "1300" }), ["C"]);
  assert.deepEqual(syms({ ex: "HNX" }), []);
  for (const p of Object.values(Mkt.PRESETS)) assert.ok(Array.isArray(Mkt.screen(rows, p.c)));
});

test("treemap: fills the rectangle, areas proportional, no overlap", () => {
  const items = [{ key: "a", w: 6 }, { key: "b", w: 6 }, { key: "c", w: 4 }, { key: "d", w: 3 }, { key: "e", w: 2 }, { key: "f", w: 2 }, { key: "g", w: 1 }, { key: "z", w: 0 }];
  const r = Mkt.treemap(items, 0, 0, 600, 400), total = 24;
  assert.equal(r.length, 7);
  const area = r.reduce((s, x) => s + x.w * x.h, 0);
  assert.ok(Math.abs(area - 600 * 400) < 1e-6);
  for (const x of r) {
    assert.ok(Math.abs(x.w * x.h - items.find(i => i.key === x.key).w / total * 240000) < 1e-6, x.key);
    assert.ok(x.x >= -1e-9 && x.y >= -1e-9 && x.x + x.w <= 600 + 1e-6 && x.y + x.h <= 400 + 1e-6, x.key);
  }
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const a = r[i], b = r[j], ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    assert.ok(ox <= 1e-6 || oy <= 1e-6, `${a.key} overlaps ${b.key}`);
  }
  assert.deepEqual(plain(Mkt.treemap([], 0, 0, 10, 10)), []);
});
