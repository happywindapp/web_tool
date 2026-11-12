// Cung hoàng đạo theo ngày sinh dương, cân bằng ngũ hành trong tứ trụ, biểu đồ ngày sinh + mũi tên thần số học.
const NatalExtra = (() => {
  // First day (m, d) of each sign, Bạch Dương (Aries) first.
  const ZODIAC_START = [[3, 21], [4, 20], [5, 21], [6, 21], [7, 23], [8, 23], [9, 23], [10, 23], [11, 22], [12, 22], [1, 20], [2, 19]];
  const ARROWS = ["123", "456", "789", "147", "258", "369", "159", "357"];

  // 0 = Bạch Dương … 11 = Song Ngư; the latest start on or before the date wins, early January falls back to Ma Kết.
  function zodiac(d, m) {
    const v = m * 100 + d;
    let best = 9, bestStart = -1;
    ZODIAC_START.forEach(([sm, sd], i) => { const s = sm * 100 + sd; if (s <= v && s > bestStart) { bestStart = s; best = i; } });
    return best;
  }

  // Counts of Kim, Thủy, Mộc, Hỏa, Thổ over the stems and branches of the pillars present.
  function elementBalance(pillars) {
    const counts = [0, 0, 0, 0, 0];
    for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
      if (!p) continue;
      counts[CanChi.CAN_EL[p.can]]++;
      counts[CanChi.CHI_EL[p.chi]]++;
    }
    const max = Math.max(...counts);
    return { counts, strong: counts.map((c, i) => c === max ? i : -1).filter(i => i >= 0), missing: counts.map((c, i) => c ? -1 : i).filter(i => i >= 0) };
  }

  // Pythagorean birth grid: how often each digit 1–9 appears in d/m/y; arrows full (all 3 present) or empty (all 3 absent).
  function birthGrid(b) {
    const counts = Array(10).fill(0);
    for (const ch of `${b.d}${b.m}${b.y}`) counts[+ch]++;
    const arrows = ARROWS.map(key => {
      const n = key.split("").map(c => counts[+c]);
      return { key, full: n.every(x => x > 0), empty: n.every(x => x === 0) };
    }).filter(a => a.full || a.empty);
    return { counts, arrows, missing: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !counts[n]) };
  }

  return { zodiac, elementBalance, birthGrid };
})();
