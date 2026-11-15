// Personal day for a profile born 11/01/1986 01:30 (tuổi Ất Sửu): lục hợp Tý is good, Mùi day clashes, birthdays are detected, personal day number 1–9.
// Run: node --test src/vietnamese-lunar-calendar/tests/personal-day-evaluation.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["js/calendar/lunar-solar-conversion-ho-ngoc-duc.js", "js/calendar/can-chi-solar-terms-nap-am.js", "js/calendar/auspicious-days-hours-almanac.js",
  "js/horoscope/birth-chart-pillars-and-feng-shui.js", "js/horoscope/pythagorean-numerology-name-and-birth.js", "js/sim/bazi-day-master-strength-useful-element.js",
  "js/i18n/personal-day-advice-vi-en.js", "js/calendar/personal-day-evaluation.js"];
const ctx = vm.createContext({ I18n: { add() {} }, T: s => s });
vm.runInContext(FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.M = { LunarCal, CanChi, PersonalDay };", ctx);
const { LunarCal, CanChi, PersonalDay } = ctx.M;

const pf = PersonalDay.profile({ d: 11, m: 1, y: 1986, hour: 1, minute: 30, male: true });
const firstWithChi = (chi, from) => { for (let jd = from; ; jd++) if (CanChi.day(jd).chi === chi) return jd; };
const start = LunarCal.jdFromDate(1, 11, 2026);

test("profile: Ất Sửu year pillar, a useful element is chosen", () => {
  const yp = pf.chart.pillars.year;
  assert.equal(CanChi.CAN[yp.can] + " " + CanChi.CHI[yp.chi], "Ất Sửu");
  assert.ok(pf.bazi.useful >= 0 && pf.bazi.useful <= 4);
});

test("Tý day is lục hợp (good reason), Mùi day clashes (bad reason, lower score)", () => {
  const ty = PersonalDay.day(pf, firstWithChi(0, start)), mui = PersonalDay.day(pf, firstWithChi(7, start));
  assert.ok(ty.reasons.some(r => r.key === "lucHop" && r.good));
  assert.ok(mui.reasons.some(r => (r.key === "clash" || r.key === "xung") && !r.good));
  assert.ok(ty.score > mui.score);
  assert.ok(mui.hours.every(h => h.chi !== 7), "no hour that opposes the birth year");
});

test("birthdays: solar 11/01, lunar birthday from the birth chart; personal day number 1–9", () => {
  assert.equal(PersonalDay.day(pf, LunarCal.jdFromDate(11, 1, 2027)).birthday, "solar");
  const l = pf.lunar, lunarBd = LunarCal.toJd(l.d, l.m, 2027, false);
  assert.equal(PersonalDay.day(pf, lunarBd).birthday, "lunar");
  for (let jd = start; jd < start + 40; jd++) { const n = PersonalDay.day(pf, jd).num; assert.ok(n >= 1 && n <= 9, String(n)); }
});
