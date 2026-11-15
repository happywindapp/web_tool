// Pure: Pearson correlation of daily returns between tickers (dates matched pairwise), average and the most / least correlated pairs.
const Correlation = (() => {
  const MIN = 20;

  // Daily bars → Map(time → % return vs the previous bar).
  function returns(bars) {
    const m = new Map();
    for (let i = 1; i < bars.length; i++) if (bars[i - 1].close > 0) m.set(bars[i].time, bars[i].close / bars[i - 1].close - 1);
    return m;
  }

  // Two return maps → r on their common dates (null when fewer than MIN shared sessions or a flat series).
  function pearson(a, b) {
    const xs = [], ys = [];
    for (const [t, x] of a) if (b.has(t)) { xs.push(x); ys.push(b.get(t)); }
    const n = xs.length;
    if (n < MIN) return null;
    const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }

  // series: [{ sym, bars }] → { syms, m (r matrix, diagonal 1), avg (pairs without the first = benchmark), pairs (sorted high → low) }.
  function matrix(series, benchFirst = true) {
    const rets = series.map(s => returns(s.bars)), k = series.length, m = Array.from({ length: k }, () => new Array(k).fill(null)), pairs = [];
    for (let i = 0; i < k; i++) {
      m[i][i] = 1;
      for (let j = i + 1; j < k; j++) {
        const r = pearson(rets[i], rets[j]);
        m[i][j] = m[j][i] = r;
        if (r !== null && (!benchFirst || i > 0)) pairs.push({ a: series[i].sym, b: series[j].sym, r });
      }
    }
    pairs.sort((p, q) => q.r - p.r);
    return { syms: series.map(s => s.sym), m, pairs, avg: pairs.length ? pairs.reduce((s, p) => s + p.r, 0) / pairs.length : null };
  }

  return { returns, pearson, matrix, MIN };
})();
