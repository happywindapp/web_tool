// Pure rule-based trade plan: buy / sell timing from day + week outlook and recent crosses, buy zone · targets · stop for today / medium / long term, risk notes.
// Prices in thousand VND. Inputs come from TechOutlook frames, TechOutlook.longTerm, Valuation.fairValues, analyst targets and the live quote.
const TradePlan = (() => {
  const fin = Number.isFinite;
  // HOSE steps 10 / 50 / 100 đ by price; HNX / UPCOM 100 đ.
  const tick = (p, ex) => ex === "HNX" || ex === "UPCOM" ? 0.1 : p < 10 ? 0.01 : p < 50 ? 0.05 : 0.1;
  const round = (p, ex, dir = 0) => { if (!fin(p) || p <= 0) return null; const t = tick(p, ex), f = dir < 0 ? Math.floor : dir > 0 ? Math.ceil : Math.round; return +(f(p / t - 1e-9 * dir) * t).toFixed(2); };

  // Action from the weekly trend (direction) and the daily trend (timing).
  function timing(D, W) {
    if (!D) return null;
    const w = W ? W.bucket : D.bucket, d = D.bucket, hot = D.rsi >= 70, cold = D.rsi <= 30;
    let action;
    if (w >= 1) action = d >= 1 ? (hot ? "hold" : "buy") : "buyDip";
    else if (w === 0) action = d >= 1 ? "probe" : d <= -1 ? "avoid" : "watch";
    else action = d >= 1 ? "sellRally" : cold ? "avoid" : "sell";
    const tone = { buy: "up", buyDip: "up", probe: "up", hold: "ref", watch: "ref", avoid: "down", sellRally: "down", sell: "down" }[action];
    return { action, tone, hot, cold, conflict: !!W && D.bucket * W.bucket < 0 };
  }

  // One horizon from a TechOutlook frame: buy zone around pivot / S1, targets R1 / resistance, stop under the zone.
  function fromFrame(fr, ex, band) {
    if (!fr || !fin(fr.atr)) return null;
    const { p, s1, r1, r2 } = fr.pivots, c = fr.close, a = fr.atr;
    const hi = Math.min(c, p), lo = Math.max(s1, hi - a);
    const t1 = r1 > c ? r1 : c + a, t2 = Math.max(r2, fin(fr.resistance) ? fr.resistance : 0, t1 + a / 2);
    return finish({ lo, hi, t1, t2, stop: Math.min(lo, hi) - 0.75 * a }, ex, band);
  }

  // Long term: margin of safety under fair value (or MA250), target = fair value / analyst consensus, −15 % stop (52-week low when close by).
  function longTerm(L, fair, analyst, ex) {
    if (!L) return null;
    const anchor = fin(fair) ? fair * 0.85 : L.ma250;
    if (!fin(anchor)) return null;
    const hi = Math.min(L.last, anchor), lo = L.band1y && L.band1y[0] < hi ? Math.max(hi * 0.9, L.band1y[0]) : hi * 0.9;
    const goals = [fair, analyst].filter(v => fin(v) && v > 0), t1 = goals.length ? goals.reduce((s, v) => s + v, 0) / goals.length : L.band1y ? L.band1y[1] : null;
    if (!fin(t1)) return null;
    const stop = L.lo52 < lo && L.lo52 > lo * 0.85 ? L.lo52 * 0.97 : lo * 0.85;
    return finish({ lo, hi, t1, t2: Math.max(t1, L.band1y ? L.band1y[1] : t1), stop }, ex, null);
  }

  // Tick rounding, today's price band (floor / ceiling) and reward : risk from the middle of the buy zone.
  function finish(x, ex, band) {
    const clamp = v => band ? Math.min(band.ceil || v, Math.max(band.floor || v, v)) : v;
    const lo = round(clamp(Math.min(x.lo, x.hi)), ex, 1), hi = round(clamp(Math.max(x.lo, x.hi)), ex, -1) ?? lo;
    const t1 = round(clamp(x.t1), ex, -1), t2 = round(clamp(x.t2), ex, -1), stop = round(clamp(x.stop), ex, -1);
    if (![lo, hi, t1, stop].every(fin)) return null;
    const mid = (lo + Math.max(lo, hi)) / 2, risk = mid - stop;
    return { lo, hi: Math.max(lo, hi), t1, t2: t2 > t1 ? t2 : null, stop, rr: risk > 0 && t1 > mid ? (t1 - mid) / risk : null, stopPct: mid ? (stop / mid - 1) * 100 : null, upPct: mid ? (t1 / mid - 1) * 100 : null };
  }

  // Risk 1 % of capital per idea → position ≤ 1 % / stop distance, capped at 20 % (10 % when yearly volatility > 50 %).
  const position = (stopPct, vol) => fin(stopPct) && stopPct < 0 ? Math.min(vol > 50 ? 10 : 20, 100 / -stopPct) : null;

  // Average traded value over the last 20 sessions, in billion VND.
  const liquidity = bars => { const t = bars.slice(-20).filter(b => b.close > 0 && b.volume >= 0); return t.length ? t.reduce((s, b) => s + b.close * b.volume, 0) / t.length / 1e6 : null; };

  // Recent crosses on the daily chart with the usual set (SMA 20 / 50, RSI 14, MACD 12-26-9), newest first.
  function recent(bars, k = 10) {
    if (bars.length < 60) return [];
    const inds = Indicators.compute([{ id: "sma", p: { n: 20 } }, { id: "sma", p: { n: 50 } }, { id: "rsi", p: { n: 14 } }, { id: "macd", p: { f: 12, s: 26, g: 9 } }], bars);
    const n = bars.length;
    return ChartCrosses.detect(bars, inds, n - k).map(x => ({ ...x, ago: n - 1 - x.i })).reverse();
  }

  return { tick, round, timing, fromFrame, longTerm, position, liquidity, recent };
})();
