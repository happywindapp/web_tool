// Unit tests for the SIM phong thủy tab's DOM-free modules; the 0834329924 case is cross-checked with simkinhdich.com and simthanglong.vn (11/2026).
// Run: node --test src/vietnamese-lunar-calendar/tests/sim-feng-shui-pure-modules.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const FILES = ["js/calendar/lunar-solar-conversion-ho-ngoc-duc.js", "js/calendar/can-chi-solar-terms-nap-am.js", "js/horoscope/birth-chart-pillars-and-feng-shui.js",
  "js/i18n/sim-feng-shui-texts-vi-en.js", "js/sim/sim-number-digits-pairs-and-folk-patterns.js", "js/sim/plum-blossom-hexagram-casting.js",
  "js/sim/bazi-day-master-strength-useful-element.js", "js/sim/sim-feng-shui-scoring.js"];
const code = FILES.map(f => fs.readFileSync(path.join(root, f), "utf8")).join("\n;\n") + "\n;globalThis.M = { CanChi, BirthChart, SimText, SimNumber, SimHexagram, BaziUseful, SimScore };";
const ctx = vm.createContext({ I18n: { add() {} } });
vm.runInContext(code, ctx);
const { CanChi, BirthChart, SimText, SimNumber, SimHexagram, BaziUseful, SimScore } = ctx.M;
const plain = x => JSON.parse(JSON.stringify(x));

test("64 hexagrams: every thượng/hạ pair exactly once, King Wen numbers 1..64", () => {
  const keys = new Set(SimText.HEX.map(h => h.up * 10 + h.low));
  assert.equal(keys.size, 64);
  assert.equal(SimText.HEX[57].name, "Thuần Đoài");
  assert.equal(SimText.HEX[10].name, "Địa Thiên Thái");
  for (const h of SimText.HEX) {
    const [u, l] = [SimText.TRIGRAM[h.up].name, SimText.TRIGRAM[h.low].name];
    if (h.up === h.low) assert.match(h.name, new RegExp("^Thuần " + u + "$"), h.name);
    else assert.ok(!h.name.startsWith("Thuần"), `${h.name} ${u}/${l}`);
  }
});

test("parse: separators, +84, wrong length, letters", () => {
  assert.equal(SimNumber.parse("0834.329.924").text, "0834329924");
  assert.equal(SimNumber.parse("+84 834 329 924").text, "0834329924");
  assert.equal(SimNumber.parse("84834329924").text, "0834329924");
  assert.ok(SimNumber.parse("091234567").error);
  assert.ok(SimNumber.parse("09O1234567").error);
  assert.ok(SimNumber.parse("  ").error);
  assert.equal(SimNumber.carrier("0834329924"), "Vinaphone");
  assert.equal(SimNumber.carrier("0987654321"), "Viettel");
  assert.equal(SimNumber.carrier("0101234567"), "");
});

test("0834329924: quẻ Thuần Đoài, hào động 2, hỗ Gia Nhân, biến Tùy, Thể Dụng tỷ hòa (as simkinhdich)", () => {
  const h = SimHexagram.cast(SimNumber.parse("0834329924").digits);
  assert.deepEqual([h.sumUp, h.sumLow, h.total, h.moving], [18, 26, 44, 2]);
  assert.equal(h.main.name, "Thuần Đoài"); assert.equal(h.main.no, 58);
  assert.equal(h.mutual.name, "Phong Hỏa Gia Nhân");
  assert.equal(h.changed.name, "Trạch Lôi Tùy");
  assert.equal(h.rel.key, "Thể Dụng tỷ hòa");
});

test("quẻ: trigram 0 → Khôn, hào động 6 flips the top line", () => {
  const h = SimHexagram.cast([0, 8, 0, 0, 0, 8, 0, 0, 0, 0]);
  assert.equal(h.main.name, "Thuần Khôn");
  assert.equal(h.moving, 4);
  const t = SimHexagram.cast([0, 9, 0, 0, 0, 0, 0, 0, 0, 9]);
  assert.equal(t.moving, 6); assert.equal(t.main.name, "Thuần Càn"); assert.equal(t.changed.name, "Trạch Thiên Quải");
});

test("tứ trụ 22/03/2004 22:15 nam: tàng can weights match simkinhdich, Canh Kim nhược ⇒ dụng Thổ, hỷ Kim", () => {
  const c = BirthChart.compute({ male: true, d: 22, m: 3, y: 2004, hour: 22, minute: 15 });
  assert.deepEqual(["year", "month", "day", "hour"].map(k => CanChi.name(c.pillars[k])), ["Giáp Thân", "Đinh Mão", "Canh Tý", "Đinh Hợi"]);
  const b = BaziUseful.analyze(c.pillars);
  assert.deepEqual(plain(b.strengths), [1.6, 2, 2.3, 2, 0.1]);
  assert.equal(b.strong, false);
  assert.deepEqual([b.useful, b.favor, b.avoid], [4, 0, 3]);
});

// simkinhdich.com result pages (11/2026): bát tự year switches at Lập xuân, month by solar term; tàng can weights 1 · 0.7/0.3 · 0.6/0.3/0.1.
const SKD = [
  ["15/08/1990 07:30 (tháng Thân sau Lập thu)", [15, 8, 1990, 7, 30], ["Canh Ngọ", "Giáp Thân", "Nhâm Tý", "Giáp Thìn"], [1.6, 2.4, 2.3, 0.7, 1]],
  ["20/01/1985 14:15 (trước Tết)", [20, 1, 1985, 14, 15], ["Giáp Tý", "Đinh Sửu", "Kỷ Mùi", "Tân Mùi"], [1.1, 1.3, 1.2, 1.6, 2.8]],
  ["25/01/1985 09:00 (sau Tết, trước Lập xuân)", [25, 1, 1985, 9, 0], ["Giáp Tý", "Đinh Sửu", "Giáp Tý", "Kỷ Tỵ"], [0.2, 2.3, 2, 1.6, 1.9]],
  ["12/11/2000 12:00", [12, 11, 2000, 12, 0], ["Canh Thìn", "Đinh Hợi", "Giáp Tuất", "Canh Ngọ"], [2.3, 0.8, 1.6, 1.8, 1.5]],
  ["05/06/1975 03:00", [5, 6, 1975, 3, 0], ["Ất Mão", "Tân Tỵ", "Nhâm Ngọ", "Nhâm Dần"], [1.1, 2, 2.6, 1.6, 0.7]],
  ["10/08/2023 10:00", [10, 8, 2023, 10, 0], ["Quý Mão", "Canh Thân", "Canh Tý", "Tân Tỵ"], [3.7, 2.3, 1, 0.6, 0.4]],
];
for (const [label, [d, m, y, hour, minute], names, strengths] of SKD) test("bát tự pillars + element strengths match simkinhdich: " + label, () => {
  const chart = BirthChart.compute({ male: true, d, m, y, hour, minute }), p = BaziUseful.solarPillars(chart, { hour, minute });
  assert.deepEqual(["year", "month", "day", "hour"].map(k => CanChi.name(p[k])), names);
  assert.deepEqual(plain(BaziUseful.analyze(p).strengths), strengths);
});

test("quẻ chủ, hào động, hành SIM match simkinhdich for 4 more numbers", () => {
  for (const [sim, name, moving, el] of [["0912345678", "Sơn Thủy Mông", 3, 3], ["0938116868", "Thuần Tốn", 2, 4], ["0362573979", "Địa Hỏa Minh Di", 3, 0], ["0988888999", "Thiên Hỏa Đồng Nhân", 4, 2]]) {
    const n = SimNumber.parse(sim), h = SimHexagram.cast(n.digits);
    assert.deepEqual([h.main.name, h.moving, SimNumber.elementOf(SimNumber.sum(n.digits))], [name, moving, el], sim);
  }
});

test("strong day master picks the scarcest of drain / wealth / officer", () => {
  const P = (can, chi) => CanChi.pair(can, chi);
  const b = BaziUseful.analyze({ year: P(6, 8), month: P(7, 9), day: P(6, 8), hour: P(4, 10) });
  assert.equal(b.strong, true);
  assert.equal(b.role[0], "cừu thần"); assert.equal(b.role[4], "kỵ thần");
  assert.ok(["dụng thần", "hỷ thần", "nhàn thần"].includes(b.role[2]));
});

test("evaluate 0834329924 + nam 22/03/2004: 6 âm/4 dương bù can Giáp, SIM Thổ khắc mệnh Thủy = 0, dụng thần Thổ, có số 9 vượng khí vận 9", () => {
  const n = SimNumber.parse("0834329924"), chart = BirthChart.compute({ male: true, d: 22, m: 3, y: 2004, hour: 22, minute: 15 });
  const r = SimScore.evaluate({ ...n, chart, pillars: BaziUseful.solarPillars(chart, { hour: 22, minute: 15 }), year: 2026 });
  const pts = Object.fromEntries(r.criteria.map(c => [c.id, c.pts]));
  assert.equal(r.el, 4); assert.equal(r.nut, 4);
  assert.deepEqual(plain(pts), { yinyang: 2, natal: 0, useful: 2, main: 1.5, mutual: 0.75, tidung: 0.5, nine: 1, folk: 0.41 });
  assert.equal(r.max, 10); assert.equal(r.score, 8.2); assert.equal(r.verdict, "Rất tốt");
  assert.deepEqual(plain(r.pairs.map(p => p.pair)),["83", "34", "43", "32", "29", "99", "92", "24"]);
  assert.equal(r.goodPairs, 3);
});

test("Hung main hexagram caps the score at 4.9 (0912345678 = Sơn Thủy Mông, simkinhdich 3/10 Đại hung)", () => {
  const chart = BirthChart.compute({ male: true, d: 15, m: 8, y: 1990, hour: 7, minute: 30 });
  const r = SimScore.evaluate({ ...SimNumber.parse("0912345678"), chart, pillars: BaziUseful.solarPillars(chart, { hour: 7, minute: 30 }), year: 2026 });
  assert.equal(r.hex.main.rating, "Hung");
  assert.ok(r.raw > 4.9); assert.equal(r.capped, true); assert.equal(r.score, 4.9); assert.equal(r.verdict, "Chưa hợp");
});

test("evaluate without birth skips owner criteria and rescales to 10", () => {
  const r = SimScore.evaluate({ ...SimNumber.parse("0912345678"), chart: null, pillars: null, year: 2026 });
  assert.equal(r.max, 7);
  assert.equal(r.criteria.find(c => c.id === "natal").pts, null);
  assert.ok(r.score >= 0 && r.score <= 10);
});

test("folk tail patterns", () => {
  const tags = t => SimNumber.folk(t).tags.map(x => x.key);
  assert.ok(tags("0912345678").includes("Sảnh tiến {n} số"));
  assert.ok(tags("0988886868").includes("Số lặp {a}"));
  assert.ok(tags("0988886868").includes("Lộc phát (68)"));
  assert.ok(tags("0909999999").includes("Lục quý {d}"));
  assert.ok(tags("0362573979").includes("Thần tài lớn (79)"));
  assert.equal(SimNumber.folk("0912345349").ending, "bad");
  assert.ok(tags("0912341990").includes("Đuôi năm sinh {y}"));
  assert.ok(tags("0912123123").includes("Taxi {a}.{a}"));
  assert.ok(tags("0912346996").includes("Số gánh {a}"));
});

test("nine star period: 2004–2023 vận 8, 2024–2043 vận 9, 2044 vận 1", () => {
  assert.equal(SimScore.period(2010), 8); assert.equal(SimScore.period(2026), 9); assert.equal(SimScore.period(2044), 1);
  const key = (sim, y) => SimScore.nineStar(SimNumber.parse(sim).digits, y).key;
  assert.equal(key("0834329924", 2026), "Vượng khí");
  assert.equal(key("0812345678", 2026), "Sinh khí");
  assert.equal(key("0838383838", 2026), "Thoái khí");
  assert.equal(key("0734343434", 2026), "Không có số vượng/sinh khí");
  assert.equal(key("0838383838", 2010), "Vượng khí");
});

test("âm dương 6:4 is full only when the majority balances the year stem", () => {
  const sixEven = SimNumber.parse("0246813579").digits.map((d, i) => i === 9 ? 2 : d);
  const c = (can) => ({ chart: { el: 0, pillars: { year: CanChi.pair(can, can % 12) } } });
  const k = can => SimScore.evaluate({ digits: sixEven, text: sixEven.join(""), ...c(can), pillars: null, year: 2026 }).criteria[0].pts;
  assert.equal(k(0), 2);
  assert.equal(k(1), 1.5);
});
