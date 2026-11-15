// CoinBacktest (pure): replays CoinAdvice.build over closed bars only (no look-ahead), simulates buy-side calls (entry zone, stop, target, time exit, fees)
// and scores sell-side calls. k = { h4, d1, w1 } candle arrays (oldest first, closed bars). Needs TA + TechOutlook + CoinAdvice.
const CoinBacktest = (() => {
  const DAY = 86400, FEE = 0.001, START = 250, DAILY_SPAN = 730, WIN = { h4: 300, d1: 600, w1: 200 };
  const RULES = { short: { entry: 5, hold: 5, win: 5 }, medium: { entry: 20, hold: 40, win: 20 }, long: { entry: 91, hold: 182, win: 182 } };
  const IDS = Object.keys(RULES);
  const sleep = () => new Promise(r => setTimeout(r, 0));

  const closedCount = (bars, span, t) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].time + span <= t) lo = m + 1; else hi = m; } return lo; };

  // Advice as of the close of daily bar i: only bars closed at or before that moment are visible.
  function decisionAt(k, i) {
    const t = k.d1[i].time + DAY, nh = closedCount(k.h4, 14400, t), nw = closedCount(k.w1, 604800, t);
    if (nw < 2) return null;
    return CoinAdvice.build({ h4: k.h4.slice(Math.max(0, nh - WIN.h4), nh), d1: k.d1.slice(Math.max(0, i + 1 - WIN.d1), i + 1), w1: k.w1.slice(Math.max(0, nw - WIN.w1), nw) });
  }

  const done = (c, j, k, entry, exit, reason) => ({ entered: true, from: j, to: k, entry, exit, reason, days: k - j, ret: exit * (1 - FEE) / (entry * (1 + FEE)) - 1 });

  // Hold from entry bar j: stop first (gap → open), then target (gap → open), else close of the last hold bar. Entry bar only checks the stop.
  function hold(d1, c, r, j, entry) {
    const end = j + r.hold;
    for (let k = j; k <= end; k++) {
      if (k >= d1.length) return { pending: true };
      const b = d1[k];
      if (b.low <= c.stop) return done(c, j, k, entry, Math.min(b.open, c.stop), "stop");
      if (k > j && b.high >= c.target) return done(c, j, k, entry, Math.max(b.open, c.target), "target");
      if (k === end) return done(c, j, k, entry, b.close, "time");
    }
  }

  // Buy-side call at daily bar c.i: fills at min(open, zone high) on the first bar touching the zone within the entry window.
  function simulateBuy(d1, c, r) {
    for (let j = c.i + 1; j <= c.i + r.entry; j++) {
      if (j >= d1.length) return { pending: true };
      if (d1[j].low <= c.hi) return hold(d1, c, r, j, Math.min(d1[j].open, c.hi));
    }
    return { entered: false };
  }

  function equityStats(rets) {
    let eq = 1, peak = 1, dd = 0;
    for (const x of rets) { eq *= 1 + x; peak = Math.max(peak, eq); dd = Math.min(dd, eq / peak - 1); }
    return { compound: eq - 1, maxDD: dd };
  }

  // Non-overlapping buy trades + sell-side hit rate + neutral count for one horizon.
  function evaluate(id, calls, d1) {
    const r = RULES[id], buys = [], sells = [], out = { id, calls: calls.length, neutral: 0, pending: 0 };
    let free = 0;
    for (const c of calls) {
      if (c.tone === "ref") out.neutral++;
      else if (c.tone === "down" && c.i + r.win < d1.length) sells.push(d1[c.i + r.win].close / c.price - 1);
      else if (c.tone === "up" && c.i >= free) {
        const s = simulateBuy(d1, c, r);
        if (s.pending) { out.pending++; continue; }
        buys.push({ at: d1[c.i].time + DAY, zone: [c.lo, c.hi], stop: c.stop, target: c.target, ...s, t0: s.entered ? d1[s.from].time : null, t1: s.entered ? d1[s.to].time : null });
        free = s.entered ? s.to : c.i + r.entry;
      }
    }
    const trades = buys.filter(b => b.entered), recent = trades.slice(-15).reverse(), rets = trades.map(t => t.ret), avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
    const first = calls.length ? calls[0].i : 0, firstClose = calls.length ? calls[0].price : null;
    return { ...out, buyCalls: buys.length, entered: trades.length, wins: rets.filter(x => x > 0).length, avg: avg(rets), worst: rets.length ? Math.min(...rets) : null,
      avgDays: avg(trades.map(t => t.days)), stops: trades.filter(t => t.reason === "stop").length, targets: trades.filter(t => t.reason === "target").length,
      ...equityStats(rets), sellCalls: sells.length, sellHits: sells.filter(x => x < 0).length, sellAvg: avg(sells),
      bh: firstClose ? d1[d1.length - 1].close / firstClose - 1 : null, from: calls.length ? d1[first].time : null, to: d1[d1.length - 1].time, trades: recent };
  }

  // Daily steps for short + medium over the last ~2 years, weekly steps for long over all history. opt: { onProgress(f), cancelled(), pause }.
  async function run(k, opt = {}) {
    const n = k.d1.length, dFrom = Math.max(START, n - 1 - DAILY_SPAN), pause = opt.pause || sleep, calls = { short: [], medium: [], long: [] };
    const steps = []; for (let i = START; i < n; i++) if (i >= dFrom || (n - 1 - i) % 7 === 0) steps.push(i);
    let t0 = Date.now();
    for (let s = 0; s < steps.length; s++) {
      const i = steps[s], v = decisionAt(k, i);
      if (v) v.horizons.forEach(h => {
        if (h.id === "long" ? (n - 1 - i) % 7 === 0 : i >= dFrom)
          calls[h.id].push({ i, price: v.price, tone: h.tone, lo: h.buy.lo, hi: h.buy.hi, target: h.sell.lo, stop: h.stop.v });
      });
      if (Date.now() - t0 > 40) { if (opt.onProgress) opt.onProgress((s + 1) / steps.length); await pause(); if (opt.cancelled && opt.cancelled()) return null; t0 = Date.now(); }
    }
    return { rules: RULES, fee: FEE, steps: steps.length, results: IDS.map(id => evaluate(id, calls[id], k.d1)) };
  }

  return { run, decisionAt, simulateBuy, evaluate, equityStats, RULES, FEE };
})();
