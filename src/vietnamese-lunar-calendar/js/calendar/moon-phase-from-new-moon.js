// Tuần trăng của 1 ngày: tuổi trăng lúc 20h giờ VN (khi trăng hiện rõ) tính từ điểm sóc gần nhất → 8 pha 🌑…🌘.
const MoonPhase = (() => {
  const SYNODIC = 29.530588853;
  const ICON = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const NAME = ["Trăng non (sóc)", "Trăng lưỡi liềm đầu tháng", "Bán nguyệt đầu tháng (thượng huyền)", "Trăng khuyết đầu tháng",
    "Trăng tròn (vọng)", "Trăng khuyết cuối tháng", "Bán nguyệt cuối tháng (hạ huyền)", "Trăng lưỡi liềm cuối tháng"];
  const SHORT = ["Trăng non", "Trăng lưỡi liềm", "Thượng huyền", "Trăng gần tròn", "Trăng tròn", "Trăng khuyết", "Hạ huyền", "Trăng tàn"];

  // jd = civil day (integer JD = noon UT); → { idx 0..7, icon, name, short, age (days) }
  function of(jd) {
    const at = jd + (20 - 12 - LunarCal.TZ) / 24;
    let k = Math.floor((at - 2415021.076998695) / SYNODIC) + 1;
    while (LunarCal.newMoon(k) > at) k--;
    const age = at - LunarCal.newMoon(k), idx = Math.round(age / SYNODIC * 8) % 8;
    return { idx, icon: ICON[idx], name: NAME[idx], short: SHORT[idx], age };
  }

  return { of };
})();
