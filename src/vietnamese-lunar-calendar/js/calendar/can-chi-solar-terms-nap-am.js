// Can chi (stems/branches) of year/month/day/hour, nạp âm, ngũ hành and the 24 tiết khí with their start moment.
const CanChi = (() => {
  const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
  const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  const ELEMENTS = ["Kim", "Thủy", "Mộc", "Hỏa", "Thổ"];
  const CAN_EL = [2, 2, 3, 3, 4, 4, 0, 0, 1, 1];
  const CHI_EL = [1, 4, 2, 2, 4, 3, 3, 4, 0, 0, 4, 1];
  const NAP_AM = ["Hải Trung Kim", "Lư Trung Hỏa", "Đại Lâm Mộc", "Lộ Bàng Thổ", "Kiếm Phong Kim", "Sơn Đầu Hỏa", "Giản Hạ Thủy", "Thành Đầu Thổ",
    "Bạch Lạp Kim", "Dương Liễu Mộc", "Tuyền Trung Thủy", "Ốc Thượng Thổ", "Tích Lịch Hỏa", "Tùng Bách Mộc", "Trường Lưu Thủy", "Sa Trung Kim",
    "Sơn Hạ Hỏa", "Bình Địa Mộc", "Bích Thượng Thổ", "Kim Bạch Kim", "Phú Đăng Hỏa", "Thiên Hà Thủy", "Đại Trạch Thổ", "Thoa Xuyến Kim",
    "Tang Đố Mộc", "Đại Khê Thủy", "Sa Trung Thổ", "Thiên Thượng Hỏa", "Thạch Lựu Mộc", "Đại Hải Thủy"];
  const NAP_AM_EL = NAP_AM.map(n => ELEMENTS.indexOf(n.split(" ").pop()));
  const TERMS = ["Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng", "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
    "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết", "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập"];
  const dr = Math.PI / 180, mod = (a, n) => ((a % n) + n) % n;

  const pair = (can, chi) => ({ can, chi, idx: mod(6 * can - 5 * chi, 60) });
  const year = y => pair(mod(y + 6, 10), mod(y + 8, 12));
  // Leap month shares the can chi of the month it repeats.
  const month = (m, y) => pair(mod(y * 12 + m + 3, 10), mod(m + 1, 12));
  const day = jd => pair(mod(jd + 9, 10), mod(jd + 1, 12));
  const hour = (jd, h) => pair(mod((day(jd).can % 5) * 2 + h, 10), h);
  const name = p => CAN[p.can] + " " + CHI[p.chi];
  const napAm = p => ({ name: NAP_AM[p.idx >> 1], el: NAP_AM_EL[p.idx >> 1] });

  // a sinh b: Kim→Thủy→Mộc→Hỏa→Thổ→Kim; a khắc b: Kim→Mộc→Thổ→Thủy→Hỏa→Kim.
  const generates = (a, b) => (a + 1) % 5 === b;
  const overcomes = (a, b) => (a + 2) % 5 === b;

  // Apparent solar longitude in degrees (Meeus, with nutation + aberration), jd in TT ≈ UT.
  function sunDegrees(jd) {
    const T = (jd - 2451545.0) / 36525, T2 = T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr) + (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) + 0.000289 * Math.sin(3 * M * dr);
    const omega = 125.04 - 1934.136 * T;
    return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(omega * dr), 360);
  }

  // Moment (jd, UT) the sun reaches `deg`, Newton steps from a nearby guess.
  function momentOf(deg, guess) {
    let t = guess;
    for (let i = 0; i < 6; i++) t += (mod(deg - sunDegrees(t) + 180, 360) - 180) / 0.98564736;
    return t;
  }

  // Term in force at the start of civil day jd (UTC+7; the changeover day stays in the old term, as trực counts it) → start/end as local fractional jd; next = term beginning later today.
  function solarTerm(jd) {
    const tz = LunarCal.TZ / 24, dayStart = jd - 0.5 - tz;
    const idx = Math.floor(sunDegrees(dayStart) / 15), nextIdx = mod(idx + 1, 24);
    const start = momentOf(idx * 15, dayStart - 7) + tz, end = momentOf(nextIdx * 15, dayStart + 8) + tz;
    return { idx, name: TERMS[idx], start, end, next: end < jd + 0.5 ? { idx: nextIdx, name: TERMS[nextIdx] } : null };
  }

  // Branch of the solar ("tiết") month: Lập xuân (315°) opens Dần.
  const termMonthChi = termIdx => mod(Math.floor((termIdx * 15 + 45) / 30) + 2, 12);

  return { CAN, CHI, ELEMENTS, CAN_EL, CHI_EL, NAP_AM, TERMS, pair, year, month, day, hour, name, napAm, generates, overcomes, solarTerm, termMonthChi };
})();
