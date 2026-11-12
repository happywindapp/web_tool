// Bản mệnh từ ngày giờ sinh: tứ trụ can chi, mệnh nạp âm, cung mệnh bát trạch (hướng tốt/xấu), màu, số, tuổi hợp/xung.
const BirthChart = (() => {
  const mod = (a, n) => ((a % n) + n) % n;
  const KUA = { 1: ["Khảm", 1, "Đông"], 2: ["Khôn", 4, "Tây"], 3: ["Chấn", 2, "Đông"], 4: ["Tốn", 2, "Đông"], 6: ["Càn", 0, "Tây"], 7: ["Đoài", 0, "Tây"], 8: ["Cấn", 4, "Tây"], 9: ["Ly", 3, "Đông"] };
  const DIR_KINDS = [["Sinh Khí", 1], ["Thiên Y", 1], ["Diên Niên", 1], ["Phục Vị", 1], ["Họa Hại", 0], ["Lục Sát", 0], ["Ngũ Quỷ", 0], ["Tuyệt Mệnh", 0]];
  const DIRS = { 1: ["Đông Nam", "Đông", "Nam", "Bắc", "Tây", "Tây Bắc", "Đông Bắc", "Tây Nam"],
    2: ["Đông Bắc", "Tây", "Tây Bắc", "Tây Nam", "Đông", "Nam", "Đông Nam", "Bắc"],
    3: ["Nam", "Bắc", "Đông Nam", "Đông", "Tây Nam", "Đông Bắc", "Tây Bắc", "Tây"],
    4: ["Bắc", "Nam", "Đông", "Đông Nam", "Tây Bắc", "Tây", "Tây Nam", "Đông Bắc"],
    6: ["Tây", "Đông Bắc", "Tây Nam", "Tây Bắc", "Đông Nam", "Bắc", "Đông", "Nam"],
    7: ["Tây Bắc", "Tây Nam", "Đông Bắc", "Tây", "Bắc", "Đông Nam", "Nam", "Đông"],
    8: ["Tây Nam", "Tây Bắc", "Tây", "Đông Bắc", "Nam", "Đông", "Bắc", "Đông Nam"],
    9: ["Đông", "Đông Nam", "Bắc", "Nam", "Đông Bắc", "Tây Nam", "Tây", "Tây Bắc"] };
  const COLORS = ["Trắng, xám, ghi, bạc", "Đen, xanh nước biển", "Xanh lá cây", "Đỏ, hồng, cam, tím", "Vàng, nâu đất"];
  const NUMBERS = [[4, 9], [1, 6], [3, 8], [2, 7], [5, 0]];
  const TAM_HOP = [[8, 0, 4], [2, 6, 10], [11, 3, 7], [5, 9, 1]];
  const LUC_HOP = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const LUC_HAI = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];

  // Kua: male counts down, female up, over the 9-year cycle; 5 → Khôn (nam) / Cấn (nữ).
  function kua(lunarYear, male) {
    const k = male ? mod(1999 - lunarYear, 9) + 1 : mod(lunarYear - 1984 + 7, 9) + 1;
    return k === 5 ? (male ? 2 : 8) : k;
  }

  // input: { name, male, d, m, y, hour?, minute? } (solar) → full chart, or { error }.
  function compute(input) {
    const jd = LunarCal.jdFromDate(input.d, input.m, input.y), hasHour = Number.isInteger(input.hour);
    const t = hasHour ? input.hour + (input.minute || 0) / 60 : null;
    // Late Rat hour (23–24h) moves only the day pillar and hour stem to the next day; year/month stay on the civil date.
    const late = hasHour && t >= 23, dayJd = late ? jd + 1 : jd, lunar = LunarCal.fromJd(jd);
    const yp = CanChi.year(lunar.y), na = CanChi.napAm(yp), el = na.el, k = kua(lunar.y, input.male);
    const hourChi = hasHour ? Math.floor((t + 1) / 2) % 12 : null;
    const gen = mod(el + 4, 5), beat = mod(el + 3, 5);
    return {
      jd, lunar, late, male: input.male,
      pillars: { year: yp, month: CanChi.month(lunar.m, lunar.y), day: CanChi.day(dayJd), hour: hasHour ? CanChi.hour(dayJd, hourChi) : null },
      napAm: na.name, el, elName: CanChi.ELEMENTS[el],
      kua: { n: k, name: KUA[k][0], el: CanChi.ELEMENTS[KUA[k][1]], group: KUA[k][2], dirs: DIR_KINDS.map(([kind, good], i) => ({ kind, good: !!good, dir: DIRS[k][i] })) },
      colors: { good: [COLORS[el], COLORS[gen]], bad: COLORS[beat] }, numbers: [...NUMBERS[el], ...NUMBERS[gen]],
      compat: compat(yp.chi),
    };
  }

  function compat(chi) {
    const tam = TAM_HOP.find(g => g.includes(chi)).filter(c => c !== chi);
    return { tamHop: tam, lucHop: LUC_HOP[chi], xung: mod(chi + 6, 12), hai: LUC_HAI[chi] };
  }

  return { compute, compat, COLORS };
})();
