// Unit tests for the DOM-free calendar modules; expected values cross-checked with lichngaytot.com day pages.
// Run: node --test src/vietnamese-lunar-calendar/tests/lunar-calendar-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["lunar-solar-conversion-ho-ngoc-duc.js", "can-chi-solar-terms-nap-am.js", "auspicious-days-hours-almanac.js", "vietnam-solar-lunar-holidays.js", "date-text-parser.js"];
const code = FILES.map(f => fs.readFileSync(path.join(root, "js/calendar", f), "utf8")).join("\n;\n") + "\n;globalThis.M = { LunarCal, CanChi, Almanac, Holidays, DateText };";
const ctx = vm.createContext({});
vm.runInContext(code, ctx);
const { LunarCal, CanChi, Almanac, Holidays, DateText } = ctx.M;

const jdOf = s => { const [d, m, y] = s.split("/").map(Number); return LunarCal.jdFromDate(d, m, y); };
const lunarText = jd => { const l = LunarCal.fromJd(jd); return `${l.d}/${l.m}${l.leap ? "n" : ""}/${l.y}`; };
const names = list => list.map(CanChi.name).sort().join(", ");
const hhmm = localJd => { const f = (localJd + 0.5) % 1, m = Math.round(f * 1440); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const minutesBetween = (a, b) => { const [h1, m1] = a.split(":").map(Number), [h2, m2] = b.split(":").map(Number); return Math.abs(h1 * 60 + m1 - h2 * 60 - m2); };

const REF = [
  { date: "12/11/2026", lunar: "4/10/2026", day: "Canh Dần", month: "Kỷ Hợi", year: "Bính Ngọ", term: "Lập đông", termStart: "16:52", god: "Thiên Lao", truc: "Bình", star: "Giác",
    hd: "Tý Sửu Thìn Tỵ Mùi Tuất", clashDay: "Giáp Ngọ, Giáp Tý, Mậu Thân, Nhâm Thân", clashMonth: "Tân Tỵ, Đinh Tỵ", hy: "Tây Bắc", tai: "Tây Nam", hac: "Bắc", ltp: "Đại An", km: "Thuần Dương", napAm: "Tùng Bách Mộc" },
  { date: "17/2/2026", lunar: "1/1/2026", day: "Nhâm Tuất", month: "Canh Dần", year: "Bính Ngọ", term: "Lập xuân", termStart: "3:02", god: "Tư Mệnh", truc: "Thành", star: "Thất",
    hd: "Dần Thìn Tỵ Thân Dậu Hợi", clashDay: "Bính Dần, Bính Thìn, Bính Thân, Bính Tuất, Giáp Thìn", clashMonth: "Giáp Ngọ, Giáp Tý, Mậu Thân, Nhâm Thân", hy: "Nam", tai: "Tây", hac: "Đông Nam", ltp: "Đại An", km: "Đường Phong", napAm: "Đại Hải Thủy" },
  { date: "25/7/2025", lunar: "1/6n/2025", day: "Ất Mùi", month: "Quý Mùi", year: "Ất Tỵ", term: "Đại thử", termStart: "20:29", god: "Nguyên Vũ", truc: "Kiến", star: "Cang",
    hd: "Dần Mão Tỵ Thân Tuất Hợi", clashDay: "Kỷ Sửu, Quý Sửu, Tân Dậu, Tân Mão", clashMonth: "Tân Sửu, Đinh Hợi, Đinh Tỵ, Ất Sửu", hy: "Tây Bắc", tai: "Đông Nam", hac: null, ltp: "Tuyệt Lộ", km: "Chu Tước", napAm: "Sa Trung Kim" },
];

for (const r of REF) test(`almanac matches reference day ${r.date}`, () => {
  const jd = jdOf(r.date), l = LunarCal.fromJd(jd), p = CanChi.day(jd), t = CanChi.solarTerm(jd);
  assert.equal(lunarText(jd), r.lunar);
  assert.equal(CanChi.name(p), r.day);
  assert.equal(CanChi.name(CanChi.month(l.m, l.y)), r.month);
  assert.equal(CanChi.name(CanChi.year(l.y)), r.year);
  assert.equal(t.name, r.term);
  assert.ok(minutesBetween(hhmm(t.start), r.termStart) <= 10, `term start ${hhmm(t.start)} vs ${r.termStart}`);
  assert.equal(Almanac.dayGod(l.m, p.chi).name, r.god);
  assert.equal(Almanac.truc(p.chi, t.idx).name, r.truc);
  assert.ok(Almanac.mansion(jd).name.startsWith(r.star + " "));
  assert.equal([...Array(12).keys()].filter(h => Almanac.hourGod(p.chi, h).good).map(h => CanChi.CHI[h]).join(" "), r.hd);
  assert.equal(names(Almanac.clashes(p)), r.clashDay.split(", ").sort().join(", "));
  assert.equal(names(Almanac.clashes(CanChi.month(l.m, l.y))), r.clashMonth.split(", ").sort().join(", "));
  const dir = Almanac.directions(p);
  assert.deepEqual([dir.hy, dir.tai, dir.hac], [r.hy, r.tai, r.hac]);
  assert.equal(Almanac.lyThuanPhong(l.m, l.d, 0).name, r.ltp);
  assert.equal(Almanac.khongMinh(l.m, l.d).name, r.km);
  assert.equal(CanChi.napAm(p).name, r.napAm);
});

test("Khổng Minh groups and trực around a term changeover match the reference", () => {
  const km = { "20/3/2026": "Thiên Môn", "23/3/2026": "Thiên Tặc", "25/3/2026": "Thiên Hầu", "26/3/2026": "Thiên Thương",
    "18/4/2026": "Bạch Hổ Đầu", "20/4/2026": "Bạch Hổ Túc", "22/4/2026": "Thanh Long Đầu", "24/4/2026": "Thanh Long Túc",
    "6/11/2026": "Bạch Hổ Túc", "7/11/2026": "Huyền Vũ", "8/11/2026": "Thanh Long Đầu" };
  for (const [d, name] of Object.entries(km)) { const l = LunarCal.fromJd(jdOf(d)); assert.equal(Almanac.khongMinh(l.m, l.d).name, name, d); }
  const truc = { "20/3/2026": "Mãn", "23/3/2026": "Chấp", "25/3/2026": "Nguy", "26/3/2026": "Thành", "18/4/2026": "Phá", "20/4/2026": "Thành",
    "22/4/2026": "Khai", "24/4/2026": "Kiến", "6/11/2026": "Khai", "7/11/2026": "Bế", "8/11/2026": "Bế" };
  for (const [d, name] of Object.entries(truc)) { const jd = jdOf(d); assert.equal(Almanac.truc(CanChi.day(jd).chi, CanChi.solarTerm(jd).idx).name, name, d); }
  assert.equal(CanChi.solarTerm(jdOf("7/11/2026")).next.name, "Lập đông");
  assert.equal(CanChi.solarTerm(jdOf("8/11/2026")).next, null);
});

test("solar ↔ lunar round-trips every day 1800–2199", () => {
  for (let jd = jdOf("1/1/1800"); jd <= jdOf("31/12/2199"); jd++) {
    const l = LunarCal.fromJd(jd);
    assert.ok(l.d >= 1 && l.d <= 30 && l.monthLen >= 29 && l.monthLen <= 30);
    if (LunarCal.toJd(l.d, l.m, l.y, l.leap) !== jd) assert.fail(`round-trip ${DateText.iso(jd)}`);
  }
});

test("leap months and Tết dates", () => {
  const leaps = { 2017: 6, 2020: 4, 2023: 2, 2025: 6, 2026: 0, 2028: 5, 2033: 11 };
  for (const [y, m] of Object.entries(leaps)) assert.equal(LunarCal.leapMonthOf(+y), m, y);
  const tet = { 2024: "2024-02-10", 2025: "2025-01-29", 2026: "2026-02-17", 2027: "2027-02-06", 1985: "1985-01-21" }; // VN Tết 1985 is a month before China's (UTC+7 vs UTC+8)
  for (const [y, iso] of Object.entries(tet)) assert.equal(DateText.iso(LunarCal.toJd(1, 1, +y, false)), iso, y);
});

test("date text parser: solar, lunar, leap and every error path", () => {
  assert.equal(DateText.iso(DateText.parse("12/11/2026").jd), "2026-11-12");
  assert.equal(DateText.iso(DateText.parse("2026-11-12").jd), "2026-11-12");
  assert.equal(DateText.iso(DateText.parse("âm 15/8/2026").jd), "2026-09-25");
  assert.equal(DateText.iso(DateText.parse("lunar 1/6n/2025").jd), "2025-07-25");
  assert.equal(DateText.iso(DateText.parse("Âm lịch: 1/6 nhuận/2025").jd), "2025-07-25");
  assert.equal(DateText.iso(DateText.parse("15/8/2026", { lunar: true }).jd), "2026-09-25");
  assert.equal(DateText.iso(DateText.parse("1/6n/2025", { lunar: true }).jd), "2025-07-25");
  assert.equal(DateText.iso(DateText.parse("âm 15/8/2026", { lunar: false }).jd), "2026-09-25");
  assert.ok(DateText.parse("30/12/2026", { lunar: true }).error);
  const err = s => DateText.parse(s).error;
  assert.match(err(""), /Chưa nhập/);
  assert.match(err("hello"), /Không hiểu/);
  assert.match(err("1/6n/2025"), /chỉ có ở âm lịch/);
  assert.match(err("1/1/1700"), /Chỉ hỗ trợ/);
  assert.match(err("lunar 1/12/2199"), /Chỉ hỗ trợ/);
  assert.match(err("31/02/2026"), /không tồn tại/);
  assert.match(err("lunar 15/7n/2026"), /không có tháng nhuận/);
  assert.match(err("lunar 1/5n/2025"), /nhuận tháng \{lm\}/);
  assert.equal(DateText.parse("lunar 30/12/2026").params.n, 29);
});

test("holidays: solar, lunar, leap month has none, Giao thừa on the last day of month 12", () => {
  const of = s => { const jd = jdOf(s), d = LunarCal.jdToDate(jd); return JSON.stringify(Holidays.of(d.d, d.m, LunarCal.fromJd(jd)).map(h => h.name)); };
  assert.equal(of("2/9/2026"), JSON.stringify(["Quốc khánh"]));
  assert.equal(of("25/9/2026"), JSON.stringify(["Tết Trung Thu"]));
  assert.equal(of("16/2/2026"), JSON.stringify(["Giao thừa"]));
  assert.equal(of("8/8/2025"), JSON.stringify([]));
});

test("holidays: 24/11 Văn hóa Việt Nam from 2026, 27/7 becomes a day off from 2027", () => {
  const at = s => { const jd = jdOf(s), d = LunarCal.jdToDate(jd); return Holidays.of(d.d, d.m, LunarCal.fromJd(jd), d.y).map(h => h.name + (h.off ? "*" : "")).join(); };
  assert.equal(at("24/11/2025"), "");
  assert.equal(at("24/11/2026"), "Ngày Văn hóa Việt Nam*");
  assert.equal(at("27/7/2026"), "Thương binh Liệt sĩ");
  assert.equal(at("27/7/2027"), "Thương binh Liệt sĩ*");
  assert.equal(at("2/9/1990"), "Quốc khánh*");
});
