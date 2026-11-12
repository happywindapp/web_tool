// Unit tests for the Tử vi tab's DOM-free modules; Cửu Diệu 2027 values cross-checked with lichngaytot.com sao hạn pages.
// Run: node --test src/vietnamese-lunar-calendar/tests/horoscope-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["js/calendar/lunar-solar-conversion-ho-ngoc-duc.js", "js/calendar/can-chi-solar-terms-nap-am.js", "js/horoscope/birth-chart-pillars-and-feng-shui.js",
  "js/horoscope/pythagorean-numerology-name-and-birth.js", "js/horoscope/yearly-fortune-stars-and-age-taboos.js", "js/horoscope/horoscope-interpretation-texts.js"];
const code = FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.M = { CanChi, BirthChart, Numerology, YearFortune, HoroText };";
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const { CanChi, BirthChart, Numerology, YearFortune, HoroText } = ctx.M;

const chart = (d, m, y, male, hour, minute) => BirthChart.compute({ d, m, y, male, hour, minute });

test("Cửu Diệu 2027 matches lichngaytot for Canh Ngọ 1990 and Ất Sửu 1985 (nam / nữ)", () => {
  assert.equal(YearFortune.forYear(chart(15, 8, 1990, true), 2027).star.name, "Thổ Tú");
  assert.equal(YearFortune.forYear(chart(15, 8, 1990, false), 2027).star.name, "Vân Hớn");
  assert.equal(YearFortune.forYear(chart(1, 6, 1985, true), 2027).star.name, "Kế Đô");
  assert.equal(YearFortune.forYear(chart(1, 6, 1985, false), 2027).star.name, "Thái Dương");
});

test("cung mệnh (kua) by lunar year and gender", () => {
  const k = (y, male) => BirthChart.compute({ d: 1, m: 6, y, male }).kua.name;
  assert.equal(k(1984, true), "Đoài"); assert.equal(k(1984, false), "Cấn");
  assert.equal(k(1990, true), "Khảm"); assert.equal(k(1990, false), "Cấn");
  assert.equal(k(1985, true), "Càn"); assert.equal(k(1985, false), "Ly");
  assert.equal(k(2000, true), "Ly"); assert.equal(k(1995, true), "Khôn");
});

test("born before Tết uses the previous lunar year; late Rat hour moves the day pillar", () => {
  const c = chart(20, 1, 1985, false, 14, 15);
  assert.equal(c.lunar.y, 1984);
  assert.equal(CanChi.name(c.pillars.year), "Giáp Tý");
  assert.equal(c.napAm, "Hải Trung Kim");
  const late = chart(12, 11, 2000, true, 23, 40), next = chart(13, 11, 2000, true, 0, 30);
  assert.ok(late.late);
  assert.equal(CanChi.name(late.pillars.day), CanChi.name(next.pillars.day));
  assert.equal(CanChi.name(late.pillars.hour), CanChi.name(next.pillars.hour));
  assert.equal(chart(1, 1, 2001, false).pillars.hour, null);
  const eve = chart(9, 2, 2024, true, 23, 30);
  assert.equal(CanChi.name(eve.pillars.year), "Quý Mão");
  assert.equal(eve.napAm, "Kim Bạch Kim");
  assert.equal(CanChi.name(eve.pillars.day), CanChi.name(chart(10, 2, 2024, true).pillars.day));
});

test("yearly taboos: Kim Lâu, Hoang Ốc, Tam Tai, Thái Tuế", () => {
  const c = chart(15, 8, 1990, true);
  const y2026 = YearFortune.forYear(c, 2026);
  assert.equal(y2026.age, 37);
  assert.equal(y2026.kimLau, "Kim Lâu Thân");
  assert.equal(y2026.hoangOc.name, "Tứ Tấn Tài");
  assert.equal(y2026.thaiTue.key, "Năm tuổi (trực Thái Tuế)");
  assert.equal(YearFortune.forYear(c, 2028).tamTai, true);
  assert.equal(YearFortune.forYear(c, 2027).tamTai, false);
  assert.equal(YearFortune.forYear(c, 2032).thaiTue.key, "Xung Thái Tuế");
  assert.equal(YearFortune.forYear(c, 1989).unborn, true);
  for (let y = 1991; y < 2100; y++) {
    const f = YearFortune.forYear(c, y);
    assert.ok(HoroText.STAR[f.star.name] && HoroText.VERDICT[f.verdict] && HoroText.FACTOR[f.rel.key], `texts for ${y}`);
  }
});

test("numerology: life path keeps master numbers, name split into vowels/consonants", () => {
  const n = Numerology.compute("Nguyễn Văn An", { d: 15, m: 8, y: 1990 });
  assert.equal(n.lifePath, 33);
  assert.equal(n.name.plain, "NGUYEN VAN AN");
  assert.equal(JSON.stringify([n.name.expression, n.name.soul, n.name.personality]), "[3,1,11]");
  assert.equal(n.personalYear(2026), 6);
  assert.equal(JSON.stringify(n.pinnacles.map(p => [p.from, p.to]).flat()), "[0,30,31,39,40,48,49,null]");
  assert.equal(Numerology.plain("Đỗ Thị Thùy"), "DO THI THUY");
  assert.equal(Numerology.compute("", { d: 1, m: 1, y: 2001 }).name, null);
});

test("12 coming months start at the given month and flag hợp / xung", () => {
  const c = chart(15, 8, 1990, true), list = YearFortune.months(c, 2461357, null);
  assert.equal(list.length, 12);
  assert.equal(list[0].m + "/" + list[0].y, "10/2026");
  assert.equal(list.find(m => m.pair.chi === 0).kind, "Xung tuổi");
  const leapRun = YearFortune.months(c, 2461871, null);
  assert.ok(leapRun.some(m => m.leap && m.m === 5 && m.y === 2028));
  for (let i = 1; i < 12; i++) assert.ok(leapRun[i].start - leapRun[i - 1].start <= 30);
});
