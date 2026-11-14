// Pure rule-based technical read: score −100…+100 per timeframe from MA / RSI / MACD / ADX / Bollinger / volume signals,
// pivots + ATR ranges, and how this ticker's price actually moved after past bars with a similar score (historical odds).
const TechOutlook = (() => {
  // MA periods per timeframe: daily 20/50/200 sessions, weekly 10/20/40 weeks, monthly 6/12/24 months.
  const PERIODS = { D: [20, 50, 200], W: [10, 20, 40], M: [6, 12, 24] };
  const col = (b, k) => b.map(x => x[k]);

  // All indicator arrays once, so scoreAt(i) is cheap for every past bar.
  function prepare(bars, tf) {
    const [f, m, s] = PERIODS[tf], c = col(bars, "close"), h = col(bars, "high"), l = col(bars, "low"), v = col(bars, "volume");
    return { bars, c, h, l, v, f: TA.sma(c, f), m: TA.sma(c, m), s: TA.sma(c, s), rsi: TA.rsi(c, 14), macd: TA.macd(c), adx: TA.adx(h, l, c, 14),
      atr: TA.atr(h, l, c, 14), bb: TA.bollinger(c, 20, 2), vavg: TA.sma(v, 20), dc: TA.donchian(h, l, 20) };
  }

  const sign = x => x > 0 ? 1 : x < 0 ? -1 : 0;
  // [key, weight, vote −1…+1, value shown]; null vote = indicator not ready yet (left out).
  function signals(x, i) {
    const c = x.c[i], has = a => a[i] != null, out = [];
    const add = (key, w, vote, val = null) => { if (vote !== null && Number.isFinite(vote)) out.push({ key, w, vote, val }); };
    add("aboveFast", 1, has(x.f) ? sign(c - x.f[i]) : null, x.f[i]);
    add("aboveMid", 1, has(x.m) ? sign(c - x.m[i]) : null, x.m[i]);
    add("aboveSlow", 2, has(x.s) ? sign(c - x.s[i]) : null, x.s[i]);
    add("maOrder", 1, has(x.f) && has(x.m) && has(x.s) ? (x.f[i] > x.m[i] && x.m[i] > x.s[i] ? 1 : x.f[i] < x.m[i] && x.m[i] < x.s[i] ? -1 : 0) : null);
    add("slope", 1, has(x.m) && x.m[i - 5] != null ? sign(x.m[i] - x.m[i - 5]) : null);
    const r = x.rsi[i];
    add("rsi", 1, r == null ? null : r >= 70 ? -0.5 : r <= 30 ? 0.5 : r >= 50 ? 1 : -1, r);
    const ml = x.macd.line[i], sg = x.macd.signal[i], hs = x.macd.hist[i], hp = x.macd.hist[i - 1];
    add("macd", 1, ml == null || sg == null ? null : sign(ml - sg), ml);
    add("macdHist", 0.5, hs == null || hp == null ? null : sign(hs - hp), hs);
    const a = x.adx.adx[i], pdi = x.adx.plus[i], mdi = x.adx.minus[i];
    add("adx", 1, a == null || pdi == null ? null : a >= 25 ? sign(pdi - mdi) : 0, a);
    const up = x.bb.upper[i], lo = x.bb.lower[i], pb = up != null && up > lo ? (c - lo) / (up - lo) : null;
    add("bb", 0.5, pb == null ? null : pb > 1 ? -1 : pb < 0 ? 1 : 0, pb);
    const va = x.vavg[i], prev = x.c[i - 1];
    add("volume", 0.5, va && prev != null ? (x.v[i] > 1.5 * va ? sign(c - prev) : 0) : null, va ? x.v[i] / va : null);
    return out;
  }

  function scoreAt(x, i) {
    const s = signals(x, i), w = s.reduce((t, q) => t + q.w, 0);
    return w ? Math.round(s.reduce((t, q) => t + q.w * q.vote, 0) / w * 100) : null;
  }
  const bucket = s => s >= 50 ? 2 : s >= 15 ? 1 : s > -15 ? 0 : s > -50 ? -1 : -2;
  const LABELS = { 2: "Tăng mạnh", 1: "Tăng", 0: "Đi ngang", "-1": "Giảm", "-2": "Giảm mạnh" };

  // Past bars in the same score bucket → % of times the close was higher h bars later, median / quartile returns.
  // Fewer than 20 exact matches → widen to every bar leaning the same way (all up buckets / all down buckets), flagged broad.
  function odds(x, h, bkt, scores) {
    const pick = test => {
      const rets = [];
      for (let i = 0; i + h < x.c.length - 1; i++) {
        const s = scores[i];
        if (s === null || !test(bucket(s)) || !(x.c[i] > 0)) continue;
        rets.push((x.c[i + h] / x.c[i] - 1) * 100);
      }
      return rets;
    };
    let rets = pick(b => b === bkt), broad = false;
    if (rets.length < 20 && bkt !== 0) { rets = pick(b => Math.sign(b) === Math.sign(bkt)); broad = true; }
    if (!rets.length) return { n: 0, broad };
    const q = p => { const s = rets.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
    return { n: rets.length, broad, up: rets.filter(r => r > 0).length / rets.length * 100, median: q(0.5), p25: q(0.25), p75: q(0.75) };
  }

  // Classic floor pivots from the last completed-or-current bar.
  function pivots(b) {
    const p = (b.high + b.low + b.close) / 3, r = b.high - b.low;
    return { p, r1: 2 * p - b.low, s1: 2 * p - b.high, r2: p + r, s2: p - r };
  }

  // One timeframe: score, label, signals, levels, ranges and odds for the given horizons (bars ahead).
  function frame(bars, tf, horizons = [1]) {
    if (bars.length < 30) return null;
    const x = prepare(bars, tf), i = bars.length - 1, scores = bars.map((_, k) => scoreAt(x, k)), score = scores[i];
    if (score === null) return null;
    const last = bars[i], atr = x.atr[i];
    return { tf, score, bucket: bucket(score), label: LABELS[bucket(score)], signals: signals(x, i), close: last.close, change: i ? (last.close / bars[i - 1].close - 1) * 100 : null,
      rsi: x.rsi[i], adx: x.adx.adx[i], atr, atrPct: atr && last.close ? atr / last.close * 100 : null, pivots: pivots(last),
      support: x.dc.lower[i], resistance: x.dc.upper[i], odds: Object.fromEntries(horizons.map(h => [h, odds(x, h, bucket(score), scores)])) };
  }

  // Year / long-term figures from daily bars (adjusted closes).
  function longTerm(daily) {
    const c = daily.map(b => b.close), n = c.length, last = c[n - 1], t = daily[n - 1].time, at = days => { for (let i = n - 1; i >= 0; i--) if (daily[i].time <= t - days * 86400) return c[i]; return null; };
    const lr = []; for (let i = Math.max(1, n - 252); i < n; i++) if (c[i - 1] > 0) lr.push(Math.log(c[i] / c[i - 1]));
    const mean = lr.reduce((s, x) => s + x, 0) / (lr.length || 1), vol = lr.length > 20 ? Math.sqrt(lr.reduce((s, x) => s + (x - mean) ** 2, 0) / (lr.length - 1) * 252) * 100 : null;
    const y1 = at(365), y3 = at(1096), y5 = at(1826), hi52 = Math.max(...c.slice(-252)), lo52 = Math.min(...c.slice(-252));
    let peak = -Infinity, mdd = 0;
    for (const x of c.slice(-1260)) { peak = Math.max(peak, x); mdd = Math.min(mdd, (x / peak - 1) * 100); }
    const ma250 = n >= 250 ? c.slice(-250).reduce((s, x) => s + x, 0) / 250 : null, ath = Math.max(...c);
    return { last, ret1y: y1 ? (last / y1 - 1) * 100 : null, cagr3: y3 ? (Math.pow(last / y3, 1 / 3) - 1) * 100 : null, cagr5: y5 ? (Math.pow(last / y5, 1 / 5) - 1) * 100 : null,
      vol, hi52, lo52, fromHi52: (last / hi52 - 1) * 100, fromLo52: (last / lo52 - 1) * 100, mdd5: mdd, ma250, aboveMa250: ma250 ? last > ma250 : null, fromAth: (last / ath - 1) * 100,
      // ±1σ one-year band from annual volatility (log-normal).
      band1y: vol ? [last * Math.exp(-vol / 100), last * Math.exp(vol / 100)] : null };
  }

  return { PERIODS, prepare, signals, scoreAt, bucket, LABELS, odds, pivots, frame, longTerm };
})();
