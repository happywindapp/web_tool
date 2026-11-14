// Pure scores from annual statements: Piotroski F-score, Altman Z, DCF inputs, and a 5-axis snowflake (each axis 0–6 = share of checks passed).
const Health = (() => {
  // VNDirect item codes shared by every statement form; ca/cl/gp/cfo… exist only for non-financial companies.
  const C = { ca: 11000, cash: 11100, cl: 13100, std: 13110, ltd: 13340, tl: 13000, eq: 14000, re: 14200, ta: 14400, rev: 21001, revBank: 421701,
    gp: 23100, pbt: 23800, np: 23000, eps: 23001, int: 22509, dep: 22230, cfo: 32000, capex: 32100, divPaid: 33600 };
  const CODES = Object.values(C);

  // [{ itemCode, fiscalDate, numericValue }] → [{ year, v: { code: value } }] newest first (first value per code/year wins).
  function byYear(rows) {
    const m = {};
    for (const r of rows) {
      const y = String(r.fiscalDate || "").slice(0, 4), n = +r.numericValue;
      if (!/^\d{4}$/.test(y) || !Number.isFinite(n)) continue;
      const row = m[y] ||= {};
      if (!(+r.itemCode in row)) row[+r.itemCode] = n;
    }
    return Object.keys(m).sort().reverse().map(y => ({ year: +y, v: m[y] }));
  }
  const g = (y, k) => y && Number.isFinite(y.v[C[k]]) ? y.v[C[k]] : null;
  const ratio = (a, b) => a != null && b ? a / b : null;
  const revenue = y => g(y, "rev") ?? g(y, "revBank");
  const isFinancial = years => !!years[0] && g(years[0], "ca") == null;

  function piotroski(years) {
    const [y0, y1] = years;
    if (!y0 || !y1 || isFinancial(years)) return null;
    const roa = y => ratio(g(y, "np"), g(y, "ta")), lev = y => ratio(g(y, "ltd") || 0, g(y, "ta")), cr = y => ratio(g(y, "ca"), g(y, "cl"));
    const gm = y => ratio(g(y, "gp"), revenue(y)), at = y => ratio(revenue(y), g(y, "ta")), shares = y => ratio(g(y, "np"), g(y, "eps"));
    // null = a value is missing → shown as "–" and left out (JS would otherwise compare null as 0 and pass).
    const cmp = (a, b, f) => a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) ? null : f(a, b);
    const gt = (a, b) => cmp(a, b, (x, y) => x > y), le = (a, b) => cmp(a, b, (x, y) => x <= y);
    const checks = [
      ["roa", gt(roa(y0), 0)], ["cfo", gt(g(y0, "cfo"), 0)], ["droa", gt(roa(y0), roa(y1))], ["accrual", gt(g(y0, "cfo"), g(y0, "np"))],
      ["dlev", le(lev(y0), lev(y1))], ["dcr", gt(cr(y0), cr(y1))], ["dil", shares(y0) > 0 && shares(y1) > 0 ? shares(y0) <= shares(y1) * 1.02 : null],
      ["dgm", gt(gm(y0), gm(y1))], ["dat", gt(at(y0), at(y1))],
    ].map(([key, pass]) => ({ key, pass }));
    return { score: checks.filter(c => c.pass).length, known: checks.filter(c => c.pass !== null).length, checks };
  }

  // Altman Z (public manufacturer form); not meaningful for banks / brokers / insurers.
  function altman(years, marketCap) {
    const y0 = years[0], ta = g(y0, "ta"), tl = g(y0, "tl");
    if (!ta || !tl || !(marketCap > 0) || isFinancial(years)) return null;
    const ebit = (g(y0, "pbt") || 0) + Math.abs(g(y0, "int") || 0);
    const z = 1.2 * (g(y0, "ca") - g(y0, "cl")) / ta + 1.4 * (g(y0, "re") || 0) / ta + 3.3 * ebit / ta + 0.6 * marketCap / tl + (revenue(y0) || 0) / ta;
    return { z, zone: z > 2.99 ? "safe" : z >= 1.81 ? "grey" : "distress" };
  }

  // FCF = CFO + capex (capex is negative), averaged over up to 3 years; growth = NPAT CAGR over 3 years clamped 0–20 %.
  function dcfInputs(years, shares) {
    if (isFinancial(years) || !(shares > 0)) return null;
    const fcfs = years.slice(0, 3).map(y => g(y, "cfo") != null ? g(y, "cfo") + (g(y, "capex") || 0) : null).filter(v => v != null);
    const np0 = g(years[0], "np"), np3 = g(years[3], "np");
    const growth = Valuation.cagr(np3, np0, 3);
    const debt = (g(years[0], "std") || 0) + (g(years[0], "ltd") || 0);
    return { fcf0: fcfs.length ? fcfs.reduce((s, x) => s + x, 0) / fcfs.length : null, g: Math.min(20, Math.max(0, growth ?? 5)),
      netDebt: debt - (g(years[0], "cash") || 0), shares, wacc: 12, tg: 3 };
  }

  // Each check: pass true/false, or null when data is missing (left out of the score).
  const dim = (key, checks) => {
    const known = checks.filter(c => c.pass !== null);
    return { key, checks, score: known.length ? Math.round(known.filter(c => c.pass).length / known.length * 6) : null };
  };
  const chk = (key, cond, v = null) => ({ key, pass: cond === null || cond === undefined || Number.isNaN(cond) ? null : !!cond, v });
  const has = (...xs) => xs.every(x => x != null && Number.isFinite(x));

  // x: { r (latest ratios), band: { pe, pb }, fair (fairValues result), years, est: { rev, np } | null, divs: [đ/share per year newest first], pio, alt, price }
  function snowflake(x) {
    const { r = {}, band = {}, years = [] } = x, y0 = years[0], y1 = years[1], fin = isFinancial(years);
    const pe = r.PRICE_TO_EARNINGS, pb = r.PRICE_TO_BOOK, roe = r.ROAE_TR_AVG5Q, roa = r.ROAA_TR_AVG5Q, dy = r.DIVIDEND_YIELD;
    const np0 = g(y0, "np"), np1 = g(y1, "np"), cagr3 = Valuation.cagr(g(years[3], "np"), np0, 3), cagr5 = Valuation.cagr(g(years[5], "np"), np0, 5);
    const estRev = x.est && has(x.est.rev, revenue(y0)) ? (x.est.rev / revenue(y0) - 1) * 100 : null;
    const estNp = x.est && has(x.est.np, np0) && np0 > 0 ? (x.est.np / np0 - 1) * 100 : null;
    const debt = (g(y0, "std") || 0) + (g(y0, "ltd") || 0), ebit = (g(y0, "pbt") || 0) + Math.abs(g(y0, "int") || 0), intExp = Math.abs(g(y0, "int") || 0);
    const divs = x.divs || [], payout = has(g(y0, "divPaid"), np0) && np0 > 0 ? Math.abs(g(y0, "divPaid")) / np0 * 100 : null;
    return [
      dim("value", [chk("peBand", has(pe, band.pe?.median) ? pe < band.pe.median : null, pe), chk("pbBand", has(pb, band.pb?.median) ? pb < band.pb.median : null, pb),
        chk("fair", x.fair && has(x.fair.average, x.price) && x.price > 0 ? x.price < x.fair.average : null, x.fair?.upside), chk("pe15", has(pe) && pe > 0 ? pe < 15 : null, pe),
        chk("peg", has(pe, cagr3) && pe > 0 && cagr3 > 0 ? pe / cagr3 < 1 : null, has(pe, cagr3) && cagr3 > 0 ? pe / cagr3 : null)]),
      dim("future", [chk("estRev", has(estRev) ? estRev > 10 : null, estRev), chk("estNp", has(estNp) ? estNp > 10 : null, estNp), chk("estNpHigh", has(estNp) ? estNp > 20 : null, estNp)]),
      dim("past", [chk("roe", has(roe) ? roe > 0.15 : null, has(roe) ? roe * 100 : null), chk("roa", has(roa) ? roa > (fin ? 0.01 : 0.07) : null, has(roa) ? roa * 100 : null),
        chk("npUp", has(np0, np1) ? np0 > np1 : null, has(np0, np1) && np1 > 0 ? (np0 / np1 - 1) * 100 : null), chk("cagr3", has(cagr3) ? cagr3 > 10 : null, cagr3),
        chk("cagr5", has(cagr5) ? cagr5 > 0 : null, cagr5)]),
      dim("health", fin
        ? [chk("eqRatio", has(g(y0, "eq"), g(y0, "ta")) ? g(y0, "eq") / g(y0, "ta") > 0.07 : null, ratio(g(y0, "eq"), g(y0, "ta")) * 100), chk("profit", has(np0) ? np0 > 0 : null)]
        : [chk("current", has(g(y0, "ca"), g(y0, "cl")) ? g(y0, "ca") / g(y0, "cl") > 1 : null, ratio(g(y0, "ca"), g(y0, "cl"))),
          chk("de", has(g(y0, "eq")) && g(y0, "eq") > 0 ? debt / g(y0, "eq") < 1 : null, has(g(y0, "eq")) ? ratio(debt, g(y0, "eq")) : null),
          chk("cover", intExp ? ebit / intExp > 3 : has(g(y0, "pbt")) ? g(y0, "pbt") > 0 : null, intExp ? ebit / intExp : null), chk("cfoPos", has(g(y0, "cfo")) ? g(y0, "cfo") > 0 : null),
          chk("altman", x.alt ? x.alt.zone === "safe" : null, x.alt?.z), chk("piotroski", x.pio ? x.pio.score >= 6 : null, x.pio?.score)]),
      dim("dividend", [chk("yield2", has(dy) ? dy > 0.02 : null, has(dy) ? dy * 100 : null), chk("yield4", has(dy) ? dy > 0.04 : null, has(dy) ? dy * 100 : null),
        chk("streak", divs.length ? divs.slice(0, 3).filter(d => d > 0).length === 3 : null, divs.filter(d => d > 0).length),
        chk("stable", divs.length >= 2 ? (divs[1] > 0 ? divs[0] >= divs[1] : divs[0] > 0) : null), chk("payout", has(payout) ? payout > 0 && payout <= 80 : null, payout)]),
    ];
  }

  return { C, CODES, byYear, piotroski, altman, dcfInputs, snowflake, isFinancial, revenue, get: g };
})();
