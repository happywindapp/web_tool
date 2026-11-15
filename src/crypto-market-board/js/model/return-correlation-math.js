// Pure daily-return statistics: align closes by calendar day, log returns, Pearson matrix, beta vs a benchmark, annualised volatility.
const ReturnCorr = (() => {
  const DAY = 86400;
  const day = t => Math.floor(t / DAY);
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

  // series: { SYM: [{ time, close }] } → { n, returns: { SYM: number[] } }; only days present in every series, only consecutive-day pairs.
  function align(series) {
    const syms = Object.keys(series), maps = syms.map(s => new Map(series[s].filter(b => b.close > 0).map(b => [day(b.time), b.close])));
    if (!syms.length) return { n: 0, returns: {} };
    const days = [...maps[0].keys()].filter(d => maps.every(m => m.has(d))).sort((a, b) => a - b);
    const returns = Object.fromEntries(syms.map(s => [s, []]));
    for (let i = 1; i < days.length; i++) {
      if (days[i] - days[i - 1] !== 1) continue;
      syms.forEach((s, k) => returns[s].push(Math.log(maps[k].get(days[i]) / maps[k].get(days[i - 1]))));
    }
    return { n: returns[syms[0]].length, returns };
  }

  function pearson(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 3) return null;
    const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    if (saa < 1e-18 || sbb < 1e-18) return null;
    return Math.max(-1, Math.min(1, sab / Math.sqrt(saa * sbb)));
  }

  function beta(r, rb) {
    const n = Math.min(r.length, rb.length);
    if (n < 3) return null;
    const m = mean(r.slice(0, n)), mb = mean(rb.slice(0, n));
    let sab = 0, sbb = 0;
    for (let i = 0; i < n; i++) { sab += (r[i] - m) * (rb[i] - mb); sbb += (rb[i] - mb) ** 2; }
    return sbb < 1e-18 ? null : sab / sbb;
  }

  // Annualised standard deviation of daily log returns (√365), as a fraction.
  function volatility(r) {
    if (r.length < 3) return null;
    const m = mean(r);
    return Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - 1) * 365);
  }

  const matrix = (syms, returns) => syms.map(a => syms.map(b => a === b ? (pearson(returns[a], returns[a]) === null ? null : 1) : pearson(returns[a], returns[b])));

  function avgPairwise(m) {
    const v = [];
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) if (m[i][j] != null) v.push(m[i][j]);
    return v.length ? mean(v) : null;
  }

  // show: symbols in the matrix; bench: extra series used for beta / correlation (may be outside `show`).
  function analyze(series, show, bench = "BTC") {
    const { n, returns } = align(series), rb = returns[bench], syms = show.filter(s => returns[s]), m = matrix(syms, returns);
    const stats = Object.fromEntries(syms.map(s => [s, { corr: rb ? (s === bench ? 1 : pearson(returns[s], rb)) : null, beta: rb ? (s === bench ? 1 : beta(returns[s], rb)) : null, vol: volatility(returns[s]) }]));
    return { n, syms, matrix: m, stats, avg: avgPairwise(m) };
  }

  const level = avg => avg == null ? null : avg >= 0.7 ? "high" : avg >= 0.4 ? "mid" : "low";

  return { align, pearson, beta, volatility, matrix, avgPairwise, analyze, level };
})();
