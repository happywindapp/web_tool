// CoinBacktest (pure): replays CoinAdvice.build over closed bars only (no look-ahead), simulates buy-side calls (entry zone, stop, target, time exit, fees)
// and scores sell-side calls. k = { h4, d1, w1 } candle arrays (oldest first, closed bars). Needs TA + TechOutlook + CoinAdvice + PlanSim.
const CoinBacktest = (() => {
  const DAY = 86400, FEE = 0.001, START = 250, DAILY_SPAN = 730, WIN = { h4: 300, d1: 600, w1: 400 };
  const RULES = { short: { entry: 5, hold: 5, win: 5 }, medium: { entry: 20, hold: 40, win: 20 }, long: { entry: 91, hold: 182, win: 182 } };
  const IDS = Object.keys(RULES);
  const sleep = () => new Promise(r => setTimeout(r, 0));

  const closedCount = (bars, span, t) => { let lo = 0, hi = bars.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bars[m].time + span <= t) lo = m + 1; else hi = m; } return lo; };

  // Advice as of the close of daily bar i: only bars closed at or before that moment are visible.
  function decisionAt(k, i) {
    const t = k.d1[i].time + DAY, nh = closedCount(k.h4, 14400, t), nw = closedCount(k.w1, 604800, t);
    if (nw < 2) return null;
    return CoinAdvice.build({ h4: k.h4.slice(Math.max(0, nh - WIN.h4), nh), d1: k.d1.slice(Math.max(0, i + 1 - WIN.d1), i + 1), w1: k.w1.slice(Math.max(0, nw - WIN.w1), nw) }, { closedOnly: true });
  }

  const COST = { buy: FEE, sell: FEE, settle: 0, shift: DAY };
  const simulateBuy = (d1, c, r) => PlanSim.simulateBuy(d1, c, r, COST);
  const evaluate = (id, calls, d1) => PlanSim.evaluate(id, calls, d1, RULES[id], COST);

  // Daily steps for short + medium over the last ~2 years, weekly steps for long over all history. opt: { onProgress(f), cancelled(), pause }.
  async function run(k, opt = {}) {
    const n = k.d1.length, dFrom = Math.max(START, n - 1 - DAILY_SPAN), pause = opt.pause || sleep, calls = { short: [], medium: [], long: [] };
    const steps = []; for (let i = START; i < n; i++) if (i >= dFrom || (n - 1 - i) % 7 === 0) steps.push(i);
    let t0 = Date.now();
    for (let s = 0; s < steps.length; s++) {
      const i = steps[s], v = decisionAt(k, i);
      if (v) v.horizons.forEach(h => {
        if (h.id === "long" ? (n - 1 - i) % 7 === 0 : i >= dFrom)
          calls[h.id].push({ i, price: v.price, tone: h.cold ? "ref" : h.tone, lo: h.buy.lo, hi: h.buy.hi, target: h.sell.lo, stop: h.stop.v });
      });
      if (Date.now() - t0 > 40) { if (opt.onProgress) opt.onProgress((s + 1) / steps.length); await pause(); if (opt.cancelled && opt.cancelled()) return null; t0 = Date.now(); }
    }
    return { rules: RULES, fee: FEE, steps: steps.length, results: IDS.map(id => evaluate(id, calls[id], k.d1)) };
  }

  return { run, decisionAt, simulateBuy, evaluate, equityStats: PlanSim.equityStats, RULES, FEE };
})();
