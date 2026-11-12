// Unit tests for NatalExtra (cung hoàng đạo boundaries, element balance, birth grid arrows).
// Run: node --test src/vietnamese-lunar-calendar/tests/natal-extra-zodiac-balance-grid.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["js/calendar/lunar-solar-conversion-ho-ngoc-duc.js", "js/calendar/can-chi-solar-terms-nap-am.js", "js/horoscope/western-zodiac-and-element-balance.js"];
const ctx = vm.createContext({});
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.M = { NatalExtra, CanChi };", ctx);
const { NatalExtra, CanChi } = ctx.M;

test("zodiac sign boundaries (0 = Bạch Dương … 11 = Song Ngư)", () => {
  const cases = [[21, 3, 0], [19, 4, 0], [20, 4, 1], [20, 6, 2], [21, 6, 3], [23, 7, 4], [22, 8, 4], [23, 9, 6], [21, 11, 7], [22, 12, 9], [5, 1, 9], [19, 1, 9], [20, 1, 10], [18, 2, 10], [19, 2, 11], [20, 3, 11], [31, 12, 9]];
  for (const [d, m, want] of cases) assert.equal(NatalExtra.zodiac(d, m), want, `${d}/${m}`);
});

test("element balance counts 8 characters with an hour, 6 without, and reports missing ones", () => {
  const P = (can, chi) => CanChi.pair(can, chi);
  const b = NatalExtra.elementBalance({ year: P(6, 6), month: P(5, 7), day: P(8, 0), hour: P(0, 4) });
  assert.equal(b.counts.reduce((a, x) => a + x, 0), 8);
  const noHour = NatalExtra.elementBalance({ year: P(6, 6), month: P(5, 7), day: P(8, 0), hour: null });
  assert.equal(noHour.counts.reduce((a, x) => a + x, 0), 6);
  assert.ok(noHour.missing.includes(2));
});

test("birth grid counts digits and finds full / empty arrows", () => {
  const g = NatalExtra.birthGrid({ d: 15, m: 8, y: 1990 });
  assert.equal(JSON.stringify(g.counts.slice(1)), "[2,0,0,0,1,0,0,1,2]");
  assert.equal(JSON.stringify(g.missing), "[2,3,4,6,7]");
  const keys = g.arrows.map(a => a.key + (a.full ? "+" : "-")).sort().join(" ");
  assert.equal(keys, "159+");
});
