// Pure: how price moved 5 / 20 / 60 sessions after each kind of important cross in the past (daily bars), against the average of all sessions.
const SignalBacktest = (() => {
  const H = [5, 20, 60], YEARS = 5;
  const SET = [{ id: "sma", p: { n: 20 } }, { id: "sma", p: { n: 50 } }, { id: "rsi", p: { n: 14 } }, { id: "macd", p: { f: 12, s: 26, g: 9 } },
    { id: "stoch", p: { n: 14, k: 3, d: 3 } }, { id: "adx", p: { n: 14 } }, { id: "psar", p: { s: 0.02, m: 0.2 } }];

  const stat = rets => {
    if (!rets.length) return null;
    return { n: rets.length, avg: rets.reduce((s, r) => s + r, 0) / rets.length, up: rets.filter(r => r > 0).length / rets.length * 100 };
  };
  const ret = (bars, i, h) => i + h < bars.length && bars[i].close > 0 ? (bars[i + h].close / bars[i].close - 1) * 100 : null;

  // bars: daily ascending → { from, to, base: { h: stat }, rows: [{ kind, tone, n, last, h: { h: stat & win } }] } sorted by count; null when < 1 year of data.
  function run(bars, years = YEARS) {
    if (!bars || bars.length < 260) return null;
    const start = Math.max(60, bars.findIndex(b => b.time >= bars[bars.length - 1].time - years * 365.25 * 86400));
    const crosses = ChartCrosses.detect(bars, Indicators.compute(SET, bars), start), by = new Map();
    for (const x of crosses) {
      const r = by.get(x.kind) || { kind: x.kind, tone: x.tone, n: 0, last: 0, rets: Object.fromEntries(H.map(h => [h, []])) };
      r.n++; r.last = x.time;
      for (const h of H) { const v = ret(bars, x.i, h); if (v !== null) r.rets[h].push(v); }
      by.set(x.kind, r);
    }
    const base = {};
    for (const h of H) { const all = []; for (let i = start; i < bars.length; i++) { const v = ret(bars, i, h); if (v !== null) all.push(v); } base[h] = stat(all); }
    const rows = [...by.values()].map(r => ({ kind: r.kind, tone: r.tone, n: r.n, last: r.last, h: Object.fromEntries(H.map(h => {
      const s = stat(r.rets[h]);
      // "win" = price went the way the signal points; warning-type signals have no direction.
      return [h, s && { ...s, win: r.tone === "up" ? s.up : r.tone === "down" ? 100 - s.up : null }];
    })) })).sort((a, b) => b.n - a.n || a.kind.localeCompare(b.kind));
    return { from: bars[start].time, to: bars[bars.length - 1].time, base, rows };
  }

  return { run, H, YEARS };
})();
