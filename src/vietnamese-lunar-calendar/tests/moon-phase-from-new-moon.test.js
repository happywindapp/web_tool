// Moon phase per day: mùng 1 is always the new moon (sóc), rằm the full moon, mùng 8 near first quarter.
// Run: node --test src/vietnamese-lunar-calendar/tests/moon-phase-from-new-moon.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["js/calendar/lunar-solar-conversion-ho-ngoc-duc.js", "js/calendar/moon-phase-from-new-moon.js"];
const ctx = vm.createContext({});
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.M = { LunarCal, MoonPhase };", ctx);
const { LunarCal, MoonPhase } = ctx.M;

test("2025–2026: every mùng 1 is 🌑, every rằm is 🌕, mùng 7–8 is a waxing half or crescent", () => {
  for (let jd = LunarCal.jdFromDate(1, 1, 2025); jd <= LunarCal.jdFromDate(31, 12, 2026); jd++) {
    const l = LunarCal.fromJd(jd), p = MoonPhase.of(jd), at = `${l.d}/${l.m}/${l.y} age ${p.age.toFixed(2)}`;
    if (l.d === 1) assert.equal(p.icon, "🌑", at);
    if (l.d === 15) assert.equal(p.icon, "🌕", at);
    if (l.d === 8) assert.ok(["🌓", "🌒", "🌔"].includes(p.icon), at);
    assert.ok(p.age >= 0 && p.age < 29.9, at);
  }
});
