// Pure valuation math: P/E–P/B history band, fair-price methods (Graham, multiples, DCF), CAGR, price performance by period.
const Valuation = (() => {
  const DAY = 86400;
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  function median(a) {
    const s = a.filter(Number.isFinite).sort((x, y) => x - y), m = s.length >> 1;
    return !s.length ? null : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // points [{ date, value }] ascending → stats of positive values; percentile = share of days at or below today's value.
  function band(points) {
    const v = points.map(p => p.value).filter(x => Number.isFinite(x) && x > 0);
    if (v.length < 20) return null;
    const m = mean(v), sd = Math.sqrt(mean(v.map(x => (x - m) ** 2))), cur = points[points.length - 1].value;
    const pct = Number.isFinite(cur) && cur > 0 ? v.filter(x => x <= cur).length / v.length * 100 : null;
    return { mean: m, sd, median: median(v), min: Math.min(...v), max: Math.max(...v), current: cur, percentile: pct };
  }

  const cagr = (from, to, years) => from > 0 && to > 0 && years > 0 ? (Math.pow(to / from, 1 / years) - 1) * 100 : null;

  // 2-stage DCF on free cash flow (VND): 5 years at g %, then terminal tg %, discounted at wacc %, minus net debt → thousand VND / share.
  function dcf({ fcf0, g, wacc, tg, netDebt = 0, shares }) {
    if (!(fcf0 > 0) || !(shares > 0) || !(wacc > tg)) return null;
    let pv = 0, f = fcf0;
    for (let y = 1; y <= 5; y++) { f *= 1 + g / 100; pv += f / (1 + wacc / 100) ** y; }
    pv += f * (1 + tg / 100) / ((wacc - tg) / 100) / (1 + wacc / 100) ** 5;
    const equity = pv - netDebt;
    return equity > 0 ? equity / shares / 1000 : null;
  }

  // x: { price (thousand VND), eps, bvps (VND), peMedian, pbMedian, dcf: params | null } → per-method value + upside, and their average.
  function fairValues(x) {
    const methods = [
      ["graham", x.eps > 0 && x.bvps > 0 ? Math.sqrt(22.5 * x.eps * x.bvps) / 1000 : null],
      ["pe", x.peMedian > 0 && x.eps > 0 ? x.peMedian * x.eps / 1000 : null],
      ["pb", x.pbMedian > 0 && x.bvps > 0 ? x.pbMedian * x.bvps / 1000 : null],
      ["dcf", x.dcf ? dcf(x.dcf) : null],
    ].map(([key, v]) => {
      const value = Number.isFinite(v) && v > 0 ? v : null;
      return { key, value, upside: value && x.price > 0 ? (value / x.price - 1) * 100 : null };
    });
    const vals = methods.map(m => m.value).filter(Boolean);
    const average = vals.length ? mean(vals) : null;
    return { methods, average, upside: average && x.price > 0 ? (average / x.price - 1) * 100 : null };
  }

  // Daily bars [{ time (unix s), close }] → % change of the last close vs the close on/before each period start.
  const PERIODS = [["1W", 7], ["1M", 30], ["3M", 91], ["YTD", 0], ["1Y", 365], ["3Y", 1096], ["5Y", 1826]];
  function perf(bars) {
    const out = {};
    if (!bars || !bars.length) return out;
    const last = bars[bars.length - 1];
    for (const [k, d] of PERIODS) {
      const start = k === "YTD" ? Date.UTC(new Date(last.time * 1000).getUTCFullYear(), 0, 1) / 1000 - 1 : last.time - d * DAY;
      let ref = null;
      for (let i = bars.length - 2; i >= 0; i--) if (bars[i].time <= start) { ref = bars[i]; break; }
      out[k] = ref && ref.close > 0 ? (last.close / ref.close - 1) * 100 : null;
    }
    return out;
  }

  return { median, band, cagr, dcf, fairValues, perf, PERIODS };
})();
