// Pure: per-ticker state for technical-signal alerts — yesterday's indicator values vs the same indicators with today's live price appended.
const SignalState = (() => {
  const KEEP = 400;
  const lastOf = a => { for (let i = a.length - 1; i >= 0; i--) if (Number.isFinite(a[i])) return a[i]; return NaN; };
  const at = (a, i) => Number.isFinite(a[i]) ? a[i] : NaN;

  // Daily bars without today's (possibly partial) bar; day = "yyyymmdd" Vietnam date.
  function completed(bars, day) {
    const t = Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6)) / 1000;
    return bars.filter(b => b.time < t).slice(-KEEP);
  }

  // Trade-plan zones from completed bars (fixed for the day): today's buy zone + medium-term stop.
  function plan(done, ex) {
    if (done.length < 60) return null;
    const today = TradePlan.fromFrame(TechOutlook.frame(done, "D", [1, 5]), ex, null), med = TradePlan.fromFrame(TechOutlook.frame(ChartRange.shape(done, "1W"), "W", [1, 4]), ex, null);
    return today && med ? { lo: today.lo, hi: today.hi, stop: med.stop } : null;
  }

  // done: completed daily bars; p: zones from plan(); last: live price → { prev, ma(n), rsi, macd, plan } where pairs are [yesterday, now].
  function of(done, p, last) {
    if (done.length < 30 || !(last > 0)) return null;
    const c = done.map(b => b.close), live = [...c, last], n = c.length;
    const m0 = TA.macd(c), m1 = TA.macd(live);
    return {
      prev: c[n - 1], plan: p,
      ma: k => [lastOf(TA.sma(c, k)), at(TA.sma(live, k), n)],
      rsi: [lastOf(TA.rsi(c, 14)), at(TA.rsi(live, 14), n)],
      macd: [at(m0.line, n - 1) - at(m0.signal, n - 1), at(m1.line, n) - at(m1.signal, n)],
    };
  }

  return { completed, plan, of };
})();
