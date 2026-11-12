// Vận hạn theo năm âm: sao Cửu Diệu, Tam Tai, Kim Lâu, Hoang Ốc, Thái Tuế, ngũ hành năm ↔ mệnh, điểm tổng; vận 12 tháng tới.
const YearFortune = (() => {
  const mod = (a, n) => ((a % n) + n) % n;
  const STARS = { "La Hầu": -2, "Thổ Tú": 0, "Thủy Diệu": 0, "Thái Bạch": -2, "Thái Dương": 2, "Vân Hớn": 0, "Kế Đô": -2, "Thái Âm": 2, "Mộc Đức": 2 };
  const MALE = ["La Hầu", "Thổ Tú", "Thủy Diệu", "Thái Bạch", "Thái Dương", "Vân Hớn", "Kế Đô", "Thái Âm", "Mộc Đức"];
  const FEMALE = ["Kế Đô", "Vân Hớn", "Mộc Đức", "Thái Âm", "Thổ Tú", "La Hầu", "Thái Dương", "Thái Bạch", "Thủy Diệu"];
  const TAM_TAI = [[[8, 0, 4], [2, 3, 4]], [[2, 6, 10], [8, 9, 10]], [[11, 3, 7], [5, 6, 7]], [[5, 9, 1], [11, 0, 1]]];
  const KIM_LAU = { 1: "Kim Lâu Thân", 3: "Kim Lâu Thê", 6: "Kim Lâu Tử", 8: "Kim Lâu Lục Súc" };
  const HOANG_OC = [["Nhất Cát", 1], ["Nhì Nghi", 1], ["Tam Địa Sát", 0], ["Tứ Tấn Tài", 1], ["Ngũ Thọ Tử", 0], ["Lục Hoang Ốc", 0]];
  const VERDICTS = [[3, "Tốt"], [1, "Khá"], [-1, "Trung bình"], [-99, "Cần thận trọng"]];

  // Relation of the year's nạp âm element to the person's: 2 = year feeds person … -2 = year overcomes person.
  function elementRelation(yearEl, el) {
    if (yearEl === el) return { key: "Năm cùng hành với mệnh", pts: 1 };
    if (CanChi.generates(yearEl, el)) return { key: "Năm sinh mệnh", pts: 2 };
    if (CanChi.generates(el, yearEl)) return { key: "Mệnh sinh năm (hao tổn)", pts: -1 };
    if (CanChi.overcomes(yearEl, el)) return { key: "Năm khắc mệnh", pts: -2 };
    return { key: "Mệnh khắc năm", pts: 0 };
  }

  function thaiTue(birthChi, yearChi) {
    const c = BirthChart.compat(birthChi);
    if (yearChi === birthChi) return { key: "Năm tuổi (trực Thái Tuế)", pts: -1 };
    if (yearChi === c.xung) return { key: "Xung Thái Tuế", pts: -2 };
    if (yearChi === c.hai) return { key: "Hại Thái Tuế", pts: -1 };
    if (yearChi === c.lucHop || c.tamHop.includes(yearChi)) return { key: "Hợp Thái Tuế", pts: 1 };
    return null;
  }

  // chart = BirthChart.compute(...) result; lunarYear = năm âm cần xem.
  function forYear(chart, lunarYear) {
    const age = lunarYear - chart.lunar.y + 1, yp = CanChi.year(lunarYear), birthChi = chart.pillars.year.chi;
    if (age < 1) return { lunarYear, age, unborn: true };
    const starName = (chart.male ? MALE : FEMALE)[mod(age - 10, 9)];
    const tamTai = TAM_TAI.find(([g]) => g.includes(birthChi))[1].includes(yp.chi);
    const kimLau = KIM_LAU[age % 9] || null;
    const [hoangOc, hoangGood] = HOANG_OC[mod(Math.floor(age / 10) - 1 + age % 10, 6)];
    const rel = elementRelation(CanChi.napAm(yp).el, chart.el), tt = thaiTue(birthChi, yp.chi);
    const score = STARS[starName] + rel.pts + (tt ? tt.pts : 0) - (tamTai ? 2 : 0) - (kimLau ? 1 : 0) - (hoangGood ? 0 : 1);
    return { lunarYear, age, pair: yp, napAm: CanChi.napAm(yp).name, star: { name: starName, pts: STARS[starName] }, tamTai, kimLau,
      hoangOc: { name: hoangOc, good: !!hoangGood }, rel, thaiTue: tt, score, verdict: VERDICTS.find(([min]) => score >= min)[1] };
  }

  // Next 12 lunar months (leap months included) from the month containing jd: month chi vs birth chi (hợp / xung / hại) + numerology personal month.
  function months(chart, fromJd, numerology) {
    const out = [], c = BirthChart.compat(chart.pillars.year.chi);
    let start = LunarCal.fromJd(fromJd).monthStart;
    for (let i = 0; i < 12; i++) {
      const l = LunarCal.fromJd(start), p = CanChi.month(l.m, l.y);
      const kind = p.chi === c.xung ? ["Xung tuổi", -1] : p.chi === c.hai ? ["Hại tuổi", -1] : p.chi === c.lucHop || c.tamHop.includes(p.chi) ? ["Hợp tuổi", 1] : ["Bình thường", 0];
      out.push({ m: l.m, y: l.y, leap: l.leap, pair: p, start, kind: kind[0], pts: kind[1], personalMonth: numerology ? Numerology.personalMonth(numerology, LunarCal.jdToDate(start)) : null });
      start += l.monthLen;
    }
    return out;
  }

  return { forYear, months };
})();
