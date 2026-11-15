// Pure: replays the tool's own trade plan (TradePlan timing + zones) over completed daily bars without look-ahead, scored by PlanSim.
// VN rules: shares sellable from T+2, buy fee 0.15 %, sell fee 0.15 % + 0.1 % tax. Long term has no historical fair value / analyst target → MA250 anchor only.
const PlanBacktest = (() => {
  const COST = { buy: 0.0015, sell: 0.0025, settle: 2, shift: 0 };
  const RULES = { short: { entry: 3, hold: 5, win: 5 }, medium: { entry: 15, hold: 40, win: 20 }, long: { entry: 60, hold: 250, win: 250 } };
  const IDS = Object.keys(RULES), START = 260, WIN = 600, DAILY_SPAN = 500, WEEK = 5;
  const sleep = () => new Promise(r => setTimeout(r, 0));

  // Plan as of the close of session i (only bars 0…i are visible).
  function decisionAt(daily, i, ex) {
    const d = daily.slice(Math.max(0, i + 1 - WIN), i + 1), D = TechOutlook.frame(d, "D", [1, 5]);
    if (!D) return null;
    const W = TechOutlook.frame(ChartRange.shape(d, "1W"), "W", [1, 4]), t = TradePlan.timing(D, W);
    return { price: D.close, tone: t.tone, action: t.action, plans: { short: TradePlan.fromFrame(D, ex, null), medium: TradePlan.fromFrame(W, ex, null), long: TradePlan.longTerm(TechOutlook.longTerm(d), null, null, ex) } };
  }

  // Daily steps for short + medium over the last ~2 years, weekly steps for long over the whole history. opt: { onProgress(f), cancelled(), pause }.
  async function run(daily, ex, opt = {}) {
    const n = daily.length, dFrom = Math.max(START, n - 1 - DAILY_SPAN), pause = opt.pause || sleep, calls = { short: [], medium: [], long: [] };
    const weekly = i => (n - 1 - i) % WEEK === 0, steps = [];
    for (let i = START; i < n; i++) if (i >= dFrom || weekly(i)) steps.push(i);
    let t0 = Date.now();
    for (let s = 0; s < steps.length; s++) {
      const i = steps[s], v = decisionAt(daily, i, ex);
      if (v) for (const id of IDS) {
        const x = v.plans[id];
        if (x && (id === "long" ? weekly(i) : i >= dFrom)) calls[id].push({ i, price: v.price, tone: v.tone, lo: x.lo, hi: x.hi, target: x.t1, stop: x.stop });
      }
      if (Date.now() - t0 > 40) { if (opt.onProgress) opt.onProgress((s + 1) / steps.length); await pause(); if (opt.cancelled && opt.cancelled()) return null; t0 = Date.now(); }
    }
    return { rules: RULES, cost: COST, steps: steps.length, bars: n, results: IDS.map(id => PlanSim.evaluate(id, calls[id], daily, RULES[id], COST)) };
  }

  return { run, decisionAt, RULES, COST, START };
})();
