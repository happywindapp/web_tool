// Tứ trụ bát tự (Lập xuân / tiết khí) → lực ngũ hành (can 1 điểm, chi chia theo tàng can 1 · 0.7/0.3 · 0.6/0.3/0.1), nhật chủ vượng/nhược, dụng thần – hỷ – kỵ thần để chọn hành SIM bổ khuyết.
const BaziUseful = (() => {
  // Tàng can [can, weight] per chi, main stem first (Tý … Hợi).
  const HIDDEN = [[[9, 1]], [[5, .6], [9, .3], [7, .1]], [[0, .6], [2, .3], [4, .1]], [[1, 1]], [[4, .6], [1, .3], [9, .1]], [[2, .6], [4, .3], [6, .1]],
    [[3, .7], [5, .3]], [[5, .6], [3, .3], [1, .1]], [[6, .6], [8, .3], [4, .1]], [[7, 1]], [[4, .6], [7, .3], [3, .1]], [[8, .7], [0, .3]]];
  const ROLE_K = { "dụng thần": 1, "hỷ thần": 0.75, "nhàn thần": 0.4, "cừu thần": 0.2, "kỵ thần": 0 };
  const STRONG_AT = 0.45;

  const addChi = (s, chi, f = 1) => { for (const [c, w] of HIDDEN[chi]) s[CanChi.CAN_EL[c]] += w * f; };

  // Bát tự: năm đổi ở Lập xuân, tháng theo tiết khí lúc sinh (can tháng theo Ngũ Hổ Độn); ngày + giờ lấy từ BirthChart. t = { hour, minute } | null (≈ 12:00).
  function solarPillars(chart, t) {
    const at = chart.jd - 0.5 + (t ? t.hour + t.minute / 60 : 12) / 24, st = CanChi.solarTerm(chart.jd);
    const idx = at >= st.end ? (st.idx + 1) % 24 : st.idx, s = LunarCal.jdToDate(chart.jd);
    // Đông chí / Tiểu hàn / Đại hàn in Jan–Feb still belong to the previous bát tự year.
    const year = CanChi.year(s.y - (s.m <= 2 && idx >= 18 && idx <= 20 ? 1 : 0)), chi = CanChi.termMonthChi(idx);
    const month = CanChi.pair(((year.can % 5) * 2 + 2 + (chi + 10) % 12) % 10, chi);
    return { year, month, day: chart.pillars.day, hour: chart.pillars.hour };
  }

  function strengths(pillars) {
    const s = [0, 0, 0, 0, 0];
    for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
      if (!p) continue;
      s[CanChi.CAN_EL[p.can]] += 1;
      addChi(s, p.chi);
    }
    return s.map(x => Math.round(x * 10) / 10);
  }

  function analyze(pillars) {
    const s = strengths(pillars), E = CanChi.CAN_EL[pillars.day.can];
    const gen = (E + 4) % 5, drain = (E + 1) % 5, wealth = (E + 2) % 5, officer = (E + 3) % 5;
    // Lệnh tháng: the month branch counts twice when judging the day master's strength.
    const w = s.slice();
    addChi(w, pillars.month.chi);
    const total = w.reduce((a, b) => a + b, 0), ratio = (w[E] + w[gen]) / total, strong = ratio >= STRONG_AT;
    // Among the helpful elements the scarcer one is the dụng thần (what the SIM should supply).
    const scarce = (a, b) => s[a] - s[b] || a - b, role = [];
    if (strong) { const [u, h, n] = [drain, wealth, officer].sort(scarce); Object.assign(role, { [u]: "dụng thần", [h]: "hỷ thần", [n]: "nhàn thần", [gen]: "kỵ thần", [E]: "cừu thần" }); }
    else { const [u, h] = [E, gen].sort(scarce); Object.assign(role, { [u]: "dụng thần", [h]: "hỷ thần", [officer]: "kỵ thần", [wealth]: "cừu thần", [drain]: "nhàn thần" }); }
    return { pillars, strengths: s, dayEl: E, ratio, strong, role, useful: role.indexOf("dụng thần"), favor: role.indexOf("hỷ thần"), avoid: role.indexOf("kỵ thần") };
  }

  return { analyze, solarPillars, ROLE_K };
})();
