// Đánh giá 1 ngày cho người dùng theo ngày giờ sinh: xung/hợp tuổi, nạp âm ngày ↔ mệnh, dụng/kỵ thần bát tự, hoàng/hắc đạo, ngày kỵ, số ngày cá nhân, sinh nhật.
const PersonalDay = (() => {
  const mod = (a, n) => ((a % n) + n) % n;
  const TAM_HOP = [[8, 0, 4], [2, 6, 10], [11, 3, 7], [5, 9, 1]];
  const LUC_HOP = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const LUC_HAI = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];
  const digits = n => String(Math.abs(n)).split("").reduce((a, c) => a + +c, 0);
  const reduce9 = n => { while (n > 9) n = digits(n); return n; };
  const cc = p => T(CanChi.CAN[p.can]) + " " + T(CanChi.CHI[p.chi]);

  // me: { d, m, y, hour?, minute?, male } solar → profile, or null when the date is invalid.
  function profile(me) {
    const chart = BirthChart.compute({ name: "", male: !!me.male, d: me.d, m: me.m, y: me.y, hour: me.hour, minute: me.minute });
    if (!chart || chart.error) return null;
    const t = Number.isInteger(me.hour) ? { hour: me.hour, minute: me.minute || 0 } : null;
    const bazi = BaziUseful.analyze(BaziUseful.solarPillars(chart, t));
    return { me, chart, bazi, num: Numerology.compute("", { d: me.d, m: me.m, y: me.y }), lunar: chart.lunar };
  }

  // → { score, verdict, reasons: [{ good, key, params }], num, birthday, hours: [{ chi, star }] }
  function day(pf, jd) {
    const s = LunarCal.jdToDate(jd), l = LunarCal.fromJd(jd), p = CanChi.day(jd), yp = pf.chart.pillars.year, age = cc(yp);
    const reasons = [], add = (good, key, params, w) => { reasons.push({ good, key, params }); score += w; };
    let score = 0;
    if (Almanac.clashes(p).some(q => q.idx === yp.idx)) add(false, "clash", { day: cc(p), age }, -3);
    else if (p.chi === mod(yp.chi + 6, 12)) add(false, "xung", { chi: T(CanChi.CHI[p.chi]), age }, -2);
    else if (p.chi === LUC_HAI[yp.chi]) add(false, "hai", { chi: T(CanChi.CHI[p.chi]), age }, -1);
    else if (p.chi === LUC_HOP[yp.chi]) add(true, "lucHop", { chi: T(CanChi.CHI[p.chi]), age }, 2);
    else if (TAM_HOP.find(g => g.includes(yp.chi)).includes(p.chi) && p.chi !== yp.chi) add(true, "tamHop", { chi: T(CanChi.CHI[p.chi]), age }, 2);
    else if (p.chi === yp.chi) add(true, "sameChi", { chi: T(CanChi.CHI[p.chi]) }, 0.5);
    const dEl = CanChi.napAm(p).el, me = pf.chart.el, elP = { day: T(CanChi.napAm(p).name), me: T(CanChi.ELEMENTS[me]) };
    if (CanChi.generates(dEl, me)) add(true, "elGen", elP, 1);
    else if (dEl === me) add(true, "elSame", elP, 0.5);
    else if (CanChi.overcomes(dEl, me)) add(false, "elBeat", elP, -1);
    const els = [CanChi.CAN_EL[p.can], CanChi.CHI_EL[p.chi]];
    if (els.includes(pf.bazi.useful)) add(true, "useful", { el: T(CanChi.ELEMENTS[pf.bazi.useful]) }, 1);
    else if (els.includes(pf.bazi.avoid)) add(false, "avoid", { el: T(CanChi.ELEMENTS[pf.bazi.avoid]) }, -1);
    const god = Almanac.dayGod(l.m, p.chi);
    add(god.good, god.good ? "good" : "bad", { god: T(god.name) }, god.good ? 1 : -0.5);
    const taboo = Almanac.taboos(l.d, l.m);
    if (taboo.length) add(false, "taboo", { list: taboo.map(x => T(x)).join(", ") }, -0.5 * taboo.length);
    const verdict = score >= 3 ? "great" : score >= 1 ? "good" : score > -1.5 ? "normal" : "careful";
    const birthday = (s.d === pf.me.d && s.m === pf.me.m ? "solar" : "") || (!l.leap && l.d === pf.lunar.d && l.m === pf.lunar.m ? "lunar" : "");
    const num = reduce9(Numerology.personalMonth(pf.num, s) + s.d);
    const hours = [...Array(12).keys()].filter(h => Almanac.hourGod(p.chi, h).good && h !== mod(yp.chi + 6, 12))
      .map(h => ({ chi: h, star: h === LUC_HOP[yp.chi] || TAM_HOP.find(g => g.includes(yp.chi)).includes(h) }));
    return { score, verdict, reasons, num, birthday, hours };
  }

  return { profile, day, reduce9 };
})();
