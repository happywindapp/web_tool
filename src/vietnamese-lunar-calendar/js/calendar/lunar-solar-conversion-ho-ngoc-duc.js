// Solar ↔ Vietnamese lunar date (Hồ Ngọc Đức's algorithm, UTC+7); jd = Julian day number of the civil date.
const LunarCal = (() => {
  const TZ = 7, INT = Math.floor, PI = Math.PI, dr = PI / 180;
  const MIN_YEAR = 1800, MAX_YEAR = 2199;

  function jdFromDate(d, m, y) {
    const a = INT((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    const jd = d + INT((153 * mm + 2) / 5) + 365 * yy + INT(yy / 4) - INT(yy / 100) + INT(yy / 400) - 32045;
    return jd < 2299161 ? d + INT((153 * mm + 2) / 5) + 365 * yy + INT(yy / 4) - 32083 : jd;
  }

  function jdToDate(jd) {
    let b = 0, c;
    if (jd > 2299160) { const a = jd + 32044; b = INT((4 * a + 3) / 146097); c = a - INT((b * 146097) / 4); } else c = jd + 32082;
    const d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
    return { d: e - INT((153 * m + 2) / 5) + 1, m: m + 3 - 12 * INT(m / 10), y: b * 100 + d - 4800 + INT(m / 10) };
  }

  function newMoon(k) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T;
    let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let c1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    c1 = c1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr) - 0.0004 * Math.sin(dr * 3 * Mpr);
    c1 = c1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr));
    c1 = c1 + 0.0004 * Math.sin(dr * (2 * F + M)) - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    c1 = c1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltaT = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return jd1 + c1 - deltaT;
  }

  // Low-precision longitude kept as-is: published Vietnamese calendars place leap months with exactly this formula.
  function sunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525, T2 = T * T;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    const L = (L0 + DL) * dr;
    return L - PI * 2 * INT(L / (PI * 2));
  }

  const sunSector = jd => INT(sunLongitude(jd - 0.5 - TZ / 24) / PI * 6);
  const newMoonDay = k => INT(newMoon(k) + 0.5 + TZ / 24);
  const kOf = jd => INT((jd - 2415021.076998695) / 29.530588853);

  const m11Cache = new Map();
  function lunarMonth11(y) {
    if (m11Cache.has(y)) return m11Cache.get(y);
    const k = INT((jdFromDate(31, 12, y) - 2415021) / 29.530588853);
    let nm = newMoonDay(k);
    if (sunSector(nm) >= 9) nm = newMoonDay(k - 1);
    m11Cache.set(y, nm);
    return nm;
  }

  function leapMonthOffset(a11) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1, arc = sunSector(newMoonDay(k + i));
    do { last = arc; i++; arc = sunSector(newMoonDay(k + i)); } while (arc !== last && i < 14);
    return i - 1;
  }

  // → { d, m, y, leap, monthStart, monthLen }
  function fromJd(jd) {
    let k = kOf(jd) + 1;
    while (newMoonDay(k) > jd) k--;
    while (newMoonDay(k + 1) <= jd) k++;
    const monthStart = newMoonDay(k), next = newMoonDay(k + 1);
    const y = jdToDate(jd).y;
    let a11 = lunarMonth11(y), b11 = a11, year;
    if (a11 >= monthStart) { year = y; a11 = lunarMonth11(y - 1); } else { year = y + 1; b11 = lunarMonth11(y + 1); }
    const diff = INT((monthStart - a11) / 29);
    let month = diff + 11, leap = false;
    if (b11 - a11 > 365) {
      const leapDiff = leapMonthOffset(a11);
      if (diff >= leapDiff) { month = diff + 10; leap = diff === leapDiff; }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) year -= 1;
    return { d: jd - monthStart + 1, m: month, y: year, leap, monthStart, monthLen: next - monthStart };
  }

  // Leap month after month 11 of solar year y-1 … before month 11 of y (offset counts from month 11).
  const leapBetween = y => { const a11 = lunarMonth11(y); return lunarMonth11(y + 1) - a11 > 365 ? (leapMonthOffset(a11) + 10) % 12 || 12 : 0; };

  // Leap month number of a lunar year, 0 when the year has none (leap 11/12 belong to the year they follow).
  function leapMonthOf(y) {
    const early = leapBetween(y - 1), late = leapBetween(y);
    if (early && early <= 10) return early;
    return late >= 11 ? late : 0;
  }

  // → jd, or null when the lunar date does not exist (leap month absent, day 30 in a 29-day month).
  function toJd(d, m, y, leap) {
    let a11, b11;
    if (m < 11) { a11 = lunarMonth11(y - 1); b11 = lunarMonth11(y); } else { a11 = lunarMonth11(y); b11 = lunarMonth11(y + 1); }
    const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let off = (m - 11 + 12) % 12;
    if (b11 - a11 > 365) {
      const leapOff = leapMonthOffset(a11);
      if (leap && m !== ((leapOff + 10) % 12 || 12)) return null;
      if (leap || off >= leapOff) off += 1;
    } else if (leap) return null;
    const start = newMoonDay(k + off);
    if (d < 1 || d > newMoonDay(k + off + 1) - start) return null;
    return start + d - 1;
  }

  const validSolar = (d, m, y) => { const r = jdToDate(jdFromDate(d, m, y)); return r.d === d && r.m === m && r.y === y; };
  const weekday = jd => (jd + 1) % 7;

  return { TZ, MIN_YEAR, MAX_YEAR, jdFromDate, jdToDate, fromJd, toJd, leapMonthOf, validSolar, weekday };
})();
