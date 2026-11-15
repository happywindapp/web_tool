// "Thử mẫu…" / ?demo=<key>: typical dates, a leap month and a solar-term changeover.
const DEMOS = (() => {
  const LIST = [
    ["tet", "Tết Nguyên Đán 2027", "lunar 1/1/2027"],
    ["mid-autumn", "Trung Thu 2026", "lunar 15/8/2026"],
    ["leap", "Tháng nhuận (6 nhuận 2025)", "lunar 1/6n/2025"],
    ["solar", "Đổi dương → âm (12/11/2026)", "12/11/2026"],
    ["term", "Ngày giao tiết Lập đông 2026", "2026-11-07"],
  ];
  const find = k => LIST.find(x => x[0] === k);
  return { keys: LIST.map(x => x[0]), name: k => find(k)?.[1] ?? k, text: k => find(k)?.[2] ?? null };
})();
