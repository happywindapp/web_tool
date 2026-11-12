// Free-text date → jd: "12/11/2026", "2026-11-12" (dương) or "âm 15/8/2026", "lunar 1/6n/2025" (âm, "n"/"nhuận"/"leap" = tháng nhuận).
const DateText = (() => {
  const LUNAR_PREFIX = /^(?:âm(?:\s*lịch)?|am(?:\s*lich)?|al|lunar|l)\s*:?\s*/i;
  const LEAP = /^(\d{1,2})\s*(?:n|nhuận|nhuan|leap|\+)$/i;

  const RANGE = { error: "Chỉ hỗ trợ năm {min}–{max}.", params: { min: LunarCal.MIN_YEAR, max: LunarCal.MAX_YEAR } };
  const inRange = jd => jd >= LunarCal.jdFromDate(1, 1, LunarCal.MIN_YEAR) && jd <= LunarCal.jdFromDate(31, 12, LunarCal.MAX_YEAR);

  // → { jd } or { error, params } (error is a Vietnamese i18n key).
  function parse(text) {
    let s = String(text || "").trim().replace(/\s+/g, " ");
    if (!s) return { error: "Chưa nhập ngày." };
    const lunar = LUNAR_PREFIX.test(s);
    s = s.replace(LUNAR_PREFIX, "");
    let d, m, y, leap = false, mm;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (iso) [y, m, d] = [+iso[1], iso[2], +iso[3]];
    else {
      const parts = s.split(/\s*[/.\-]\s*/);
      if (parts.length !== 3 || !/^\d{1,2}$/.test(parts[0]) || !/^\d{4}$/.test(parts[2])) return { error: "Không hiểu ngày “{text}”. Ví dụ: 12/11/2026 hoặc âm 15/8/2026.", params: { text } };
      [d, m, y] = [+parts[0], parts[1], +parts[2]];
    }
    if ((mm = LEAP.exec(String(m)))) { m = +mm[1]; leap = true; }
    else if (/^\d{1,2}$/.test(String(m))) m = +m;
    else return { error: "Không hiểu ngày “{text}”. Ví dụ: 12/11/2026 hoặc âm 15/8/2026.", params: { text } };
    if (leap && !lunar) return { error: "Tháng nhuận chỉ có ở âm lịch — thêm “âm” phía trước." };
    if (y < LunarCal.MIN_YEAR || y > LunarCal.MAX_YEAR) return RANGE;
    if (m < 1 || m > 12 || d < 1 || d > 31) return { error: "Ngày/tháng không hợp lệ: {d}/{m}/{y}.", params: { d, m, y } };
    if (!lunar) return LunarCal.validSolar(d, m, y) ? { jd: LunarCal.jdFromDate(d, m, y) } : { error: "Ngày dương {d}/{m}/{y} không tồn tại.", params: { d, m, y } };
    if (leap && LunarCal.leapMonthOf(y) !== m) {
      const lm = LunarCal.leapMonthOf(y);
      return lm ? { error: "Năm âm {y} nhuận tháng {lm}, không có tháng {m} nhuận.", params: { y, lm, m } } : { error: "Năm âm {y} không có tháng nhuận.", params: { y } };
    }
    const jd = LunarCal.toJd(d, m, y, leap);
    if (jd !== null) return inRange(jd) ? { jd, lunar: true } : RANGE;
    const n = LunarCal.fromJd(LunarCal.toJd(1, m, y, leap)).monthLen;
    return { error: "Ngày âm {d}/{m}/{y} không tồn tại (tháng này chỉ có {n} ngày).", params: { d, m, y, n } };
  }

  const iso = jd => { const s = LunarCal.jdToDate(jd); return `${s.y}-${String(s.m).padStart(2, "0")}-${String(s.d).padStart(2, "0")}`; };

  return { parse, iso };
})();
