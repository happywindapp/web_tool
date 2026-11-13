// FinTable (pure): model choice per company form, period pivot, labels, units. Run: node --test src/vn-stock-price-board/tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/model/financial-statement-table.js"), "utf8") + "\n;globalThis.F = FinTable;", ctx);
const F = ctx.F;
const plain = v => JSON.parse(JSON.stringify(v));

// Shapes of VNDirect financial_models rows (bank: statutory 102 + WEB summary 112).
const MODELS = [
  { modelType: 112.0, modelTypeName: "INCOME", note: "", itemCode: 1.0, itemVnName: "Tóm tắt", displayOrder: 1, displayLevel: 1 },
  { modelType: 102.0, modelTypeName: "INCOME", note: "TT49/2014/TT-NHNN", itemCode: 31000.0, itemVnName: "Thu nhập lãi thuần", itemEnName: "Net interest income", displayOrder: 20, displayLevel: 1 },
  { modelType: 102.0, modelTypeName: "INCOME", note: "TT49/2014/TT-NHNN", itemCode: 31100.0, itemVnName: "Thu nhập lãi", itemEnName: "Interest income", displayOrder: 10, displayLevel: 2 },
  { modelType: 102.0, modelTypeName: "INCOME", note: "TT49/2014/TT-NHNN", itemCode: 39001.0, itemVnName: "EPS", itemEnName: "EPS", displayOrder: 30, displayLevel: 1 },
  { modelType: 102.0, modelTypeName: "INCOME", note: "TT49/2014/TT-NHNN", itemCode: 39999.0, itemVnName: "Không có số liệu", displayOrder: 40, displayLevel: 1 },
  { modelType: 101.0, modelTypeName: "BALANCESHEET", note: "TT49/2014/TT-NHNN", itemCode: 10000.0, itemVnName: "Tổng tài sản", displayOrder: 1, displayLevel: 1 },
];

test("pickModel: statutory model (with TT note) wins, items sorted by displayOrder", () => {
  const m = F.pickModel(MODELS, "is");
  assert.equal(m.modelType, 102);
  assert.deepEqual(plain(m.items.map(i => i.code)), [31100, 31000, 39001, 39999]);
  assert.equal(m.items[0].level, 2);
  assert.equal(F.pickModel(MODELS, "bs").modelType, 101);
  assert.equal(F.pickModel(MODELS, "cf"), null);
});

test("build: newest periods first, empty lines dropped, missing cells null", () => {
  const rows = [
    { itemCode: 31000, fiscalDate: "2026-06-30", numericValue: 15e12 }, { itemCode: 31000, fiscalDate: "2026-03-31", numericValue: 12e12 },
    { itemCode: 31100, fiscalDate: "2026-06-30", numericValue: 30e12 }, { itemCode: 39001, fiscalDate: "2026-06-30", numericValue: 2150 },
    { itemCode: 39001, fiscalDate: "2026-03-31", numericValue: 1980 }, { itemCode: 31000, fiscalDate: "bad", numericValue: 1 },
  ];
  const t = F.build(F.pickModel(MODELS, "is"), rows);
  assert.deepEqual(plain(t.periods), ["2026-06-30", "2026-03-31"]);
  assert.deepEqual(plain(t.lines.map(l => l.code)), [31100, 31000, 39001]);
  assert.deepEqual(plain(t.lines[0].values), [30e12, null]);
  assert.equal(F.fmt(15e12, t.lines[1]), "15,000");
  assert.equal(F.fmt(1.234e9, t.lines[1]), "1.23");
  assert.equal(F.fmt(2150, t.lines[2]), "2,150");
  assert.equal(F.fmt(null, t.lines[0]), "");
  assert.equal(F.growth(t.lines[1].values, 0), 25);
  assert.equal(F.growth(t.lines[0].values, 0), null);
});

test("labels and fetch window", () => {
  assert.equal(F.label("2026-06-30", "quarter"), "Q2/2026");
  assert.equal(F.label("2025-12-31", "quarter"), "Q4/2025");
  assert.equal(F.label("2025-12-31", "year"), "2025");
  assert.equal(F.since("quarter", new Date("2026-11-13T00:00:00Z")), "2023-01-01");
  assert.equal(F.since("year", new Date("2026-11-13T00:00:00Z")), "2017-01-01");
});
