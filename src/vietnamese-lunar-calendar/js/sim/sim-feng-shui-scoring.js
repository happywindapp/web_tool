// Chấm điểm SIM phong thủy thang 10 qua 8 tiêu chí (nhóm Âm dương 2 · Ngũ hành 3 · Kinh Dịch 3 · Cửu tinh 1 · Dân gian 1); tiêu chí cần ngày sinh bỏ qua khi không có, điểm quy đổi theo phần còn lại.
const SimScore = (() => {
  const RATING_K = { "Đại cát": 1, "Cát": 0.75, "Bình": 0.5, "Hung": 0 };
  const r2 = x => Math.round(x * 100) / 100, HUNG_CAP = 4.9;

  // a, b: element indexes (CanChi.ELEMENTS); SIM is judged by what it does to the owner's mệnh.
  function natal(sim, menh) {
    if (sim === menh) return { key: "SIM và mệnh cùng hành (bình hòa)", k: 0.75 };
    if (CanChi.generates(sim, menh)) return { key: "SIM sinh mệnh (tốt nhất)", k: 1 };
    if (CanChi.overcomes(menh, sim)) return { key: "Mệnh khắc SIM (chế ngự được)", k: 0.5 };
    if (CanChi.generates(menh, sim)) return { key: "Mệnh sinh SIM (hao tổn)", k: 0.25 };
    return { key: "SIM khắc mệnh (xấu)", k: 0 };
  }

  // Huyền Không: 20-year periods, vận 1 = 1864–1883 (vận 9 = 2024–2043). Scored by which star digits the number contains.
  const period = year => ((Math.floor((year - 1864) / 20) % 9) + 9) % 9 + 1;
  function nineStar(digits, year) {
    const p = period(year), star = d => (p + d - 1) % 9 + 1, has = d => digits.includes(star(d));
    const live = [star(1), star(2)].filter(d => digits.includes(d));
    const [key, k] = has(0) ? ["Vượng khí", 1] : live.length ? ["Sinh khí", 0.6] : has(8) ? ["Thoái khí", 0.4] : ["Không có số vượng/sinh khí", 0];
    return { period: p, end: 1864 + 20 * Math.floor((year - 1864) / 20) + 19, prosper: star(0), rising: [star(1), star(2)], fading: star(8), key, k };
  }

  // 5:5 is best; 6:4 is just as good when the majority balances the owner's year stem (can dương needs more even = âm digits, can âm more odd).
  function yinYang(digits, yearCan) {
    const even = digits.filter(d => d % 2 === 0).length, odd = digits.length - even, diff = Math.abs(even - odd);
    const wantEven = yearCan === undefined ? null : yearCan % 2 === 0, balances = wantEven !== null && (even > odd) === wantEven;
    return { even, odd, wantEven, k: diff === 0 || (diff === 2 && balances) ? 1 : diff === 2 ? 0.75 : diff === 4 ? 0.5 : 0 };
  }

  // input: { digits, text, chart|null, pillars|null (bát tự), year } → { criteria[], total, max, score, verdict, … }
  function evaluate({ digits, text, chart, pillars, year }) {
    const sum = SimNumber.sum(digits), el = SimNumber.elementOf(sum), hex = SimHexagram.cast(digits);
    const pairs = SimNumber.pairs(digits), folk = SimNumber.folk(text), nut = SimNumber.nut(digits);
    const bazi = pillars ? BaziUseful.analyze(pillars) : null;
    const goodPairs = pairs.filter(p => p.star.good).length;
    const folkK = 0.4 * nut / 10 + 0.4 * (pairs.length ? goodPairs / pairs.length : 0.5) + (folk.ending === "good" ? 0.2 : folk.ending === "bad" ? 0 : 0.1);
    const yy = yinYang(digits, chart?.pillars.year.can), nat = chart && natal(el, chart.el), star = nineStar(digits, year);
    const criteria = [
      { id: "yinyang", max: 2, k: yy.k, yy },
      { id: "natal", max: 1, k: nat ? nat.k : null, nat },
      { id: "useful", max: 2, k: bazi ? BaziUseful.ROLE_K[bazi.role[el]] : null },
      { id: "main", max: 1.5, k: RATING_K[hex.main.rating] },
      { id: "mutual", max: 1, k: RATING_K[hex.mutual.rating] },
      { id: "tidung", max: 0.5, k: hex.rel.k },
      { id: "nine", max: 1, k: star.k, star },
      { id: "folk", max: 1, k: folkK },
    ].map(c => ({ ...c, pts: c.k === null ? null : r2(c.max * c.k) }));
    const used = criteria.filter(c => c.pts !== null), total = r2(used.reduce((a, c) => a + c.pts, 0)), max = used.reduce((a, c) => a + c.max, 0);
    // Sites treat a Hung main hexagram as disqualifying whatever the other points (simkinhdich: quẻ > điểm; viettopreview loại quẻ hung).
    const raw = Math.round(total / max * 100) / 10, capped = hex.main.rating === "Hung" && raw > HUNG_CAP, score = capped ? HUNG_CAP : raw;
    const verdict = score >= 8 ? "Rất tốt" : score >= 6.5 ? "Tốt" : score >= 5 ? "Trung bình" : "Chưa hợp";
    return { criteria, total, max, raw, capped, score, verdict, sum, el, nut, hex, pairs, goodPairs, folk, bazi, star };
  }

  return { evaluate, nineStar, period };
})();
