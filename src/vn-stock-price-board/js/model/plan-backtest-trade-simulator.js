// Trade replay shared by the stock and crypto advice backtests: buy-zone entry, stop / target / time exit, fees, non-overlapping trades.
// cost = { buy, sell (fee fractions), settle (bars after entry before any exit can fill; 0 = the entry bar may still stop out), shift (s added to a call's bar time) }.
const PlanSim = (() => {
  const done = (j, k, entry, exit, reason, cost) => ({ entered: true, from: j, to: k, entry, exit, reason, days: k - j, ret: exit * (1 - cost.sell) / (entry * (1 + cost.buy)) - 1 });

  // From entry bar j: stop first (gap → open), then target (gap → open), else close of the last hold bar. The entry bar never takes profit.
  function hold(d1, c, r, j, entry, cost) {
    const end = j + Math.max(r.hold, cost.settle);
    for (let k = j + cost.settle; k <= end; k++) {
      if (k >= d1.length) return { pending: true };
      const b = d1[k];
      if (b.low <= c.stop) return done(j, k, entry, Math.min(b.open, c.stop), "stop", cost);
      if (k > j && b.high >= c.target) return done(j, k, entry, Math.max(b.open, c.target), "target", cost);
      if (k === end) return done(j, k, entry, b.close, "time", cost);
    }
  }

  // Buy-side call at bar c.i: fills at min(open, zone high) on the first bar touching the zone within the entry window.
  function simulateBuy(d1, c, r, cost) {
    for (let j = c.i + 1; j <= c.i + r.entry; j++) {
      if (j >= d1.length) return { pending: true };
      if (d1[j].low <= c.hi) return hold(d1, c, r, j, Math.min(d1[j].open, c.hi), cost);
    }
    return { entered: false };
  }

  function equityStats(rets) {
    let eq = 1, peak = 1, dd = 0;
    for (const x of rets) { eq *= 1 + x; peak = Math.max(peak, eq); dd = Math.min(dd, eq / peak - 1); }
    return { compound: eq - 1, maxDD: dd };
  }

  // calls [{ i, price, tone, lo, hi, target, stop }] of one horizon → non-overlapping buy trades, sell-side hit rate (close lower after r.win bars), neutral count.
  function evaluate(id, calls, d1, r, cost) {
    const buys = [], sells = [], out = { id, calls: calls.length, neutral: 0, pending: 0, buyAll: 0 };
    let free = 0;
    for (const c of calls) {
      if (c.tone === "ref") out.neutral++;
      else if (c.tone === "down" && c.i + r.win < d1.length) sells.push(d1[c.i + r.win].close / c.price - 1);
      else if (c.tone === "up" && ++out.buyAll && c.i >= free) {
        const s = simulateBuy(d1, c, r, cost);
        if (s.pending) { out.pending++; continue; }
        buys.push({ at: d1[c.i].time + cost.shift, zone: [c.lo, c.hi], stop: c.stop, target: c.target, ...s, t0: s.entered ? d1[s.from].time : null, t1: s.entered ? d1[s.to].time : null });
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

  return { simulateBuy, evaluate, equityStats };
})();
