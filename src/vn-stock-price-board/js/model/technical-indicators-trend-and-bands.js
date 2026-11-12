// Pure technical-analysis math, part 1: moving averages, bands, channels, Ichimoku, Parabolic SAR, VWAP.
// Every function returns arrays aligned with the input; null = not enough bars yet (or a gap in the input).
const TA = (() => {
  const blank = n => Array(n).fill(null);

  // Rolling over contiguous non-null runs, so MAs of derived series (MACD line…) start where that series starts.
  function sma(x, n) {
    const out = blank(x.length);
    let s = 0, run = 0;
    for (let i = 0; i < x.length; i++) {
      if (x[i] == null) { s = 0; run = 0; continue; }
      s += x[i]; run++;
      if (run > n) { s -= x[i - n]; run = n; }
      if (run === n) out[i] = s / n;
    }
    return out;
  }

  // Exponential smoothing seeded with the SMA of the first n values; k = 2/(n+1) (EMA) or 1/n (Wilder / RMA).
  function smooth(x, n, k) {
    const out = blank(x.length);
    let prev = null, seed = 0, run = 0;
    for (let i = 0; i < x.length; i++) {
      const v = x[i];
      if (v == null) { prev = null; seed = 0; run = 0; continue; }
      if (prev == null) { seed += v; if (++run === n) out[i] = prev = seed / n; continue; }
      out[i] = prev = v * k + prev * (1 - k);
    }
    return out;
  }
  const ema = (x, n) => smooth(x, n, 2 / (n + 1));
  const rma = (x, n) => smooth(x, n, 1 / n);

  function wma(x, n) {
    const out = blank(x.length), den = n * (n + 1) / 2;
    for (let i = n - 1; i < x.length; i++) {
      let s = 0, ok = true;
      for (let j = 0; j < n && ok; j++) { const v = x[i - j]; if (v == null) ok = false; else s += v * (n - j); }
      if (ok) out[i] = s / den;
    }
    return out;
  }

  function rolling(x, n, fn) {
    const out = blank(x.length);
    for (let i = n - 1; i < x.length; i++) out[i] = fn(x.slice(i - n + 1, i + 1));
    return out;
  }
  const highest = (x, n) => rolling(x, n, w => Math.max(...w));
  const lowest = (x, n) => rolling(x, n, w => Math.min(...w));
  const stdev = (x, n) => rolling(x, n, w => { const m = w.reduce((a, b) => a + b, 0) / n; return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / n); });

  function bollinger(c, n = 20, mult = 2) {
    const mid = sma(c, n), sd = stdev(c, n);
    return { mid, upper: mid.map((m, i) => m == null ? null : m + mult * sd[i]), lower: mid.map((m, i) => m == null ? null : m - mult * sd[i]) };
  }

  function donchian(h, l, n = 20) {
    const upper = highest(h, n), lower = lowest(l, n);
    return { upper, lower, mid: upper.map((u, i) => u == null ? null : (u + lower[i]) / 2) };
  }

  // Leading spans are shifted forward by `shift` bars inside the data (no future timestamps), lagging span backward.
  function ichimoku(h, l, c, a = 9, b = 26, s = 52) {
    const mid = n => { const hh = highest(h, n), ll = lowest(l, n); return hh.map((v, i) => v == null ? null : (v + ll[i]) / 2); };
    const tenkan = mid(a), kijun = mid(b), spanB0 = mid(s), len = c.length;
    const fwd = x => blank(len).map((_, i) => i >= b ? x[i - b] : null);
    return { tenkan, kijun, spanA: fwd(tenkan.map((t, i) => t == null || kijun[i] == null ? null : (t + kijun[i]) / 2)), spanB: fwd(spanB0),
      chikou: blank(len).map((_, i) => i + b < len ? c[i + b] : null) };
  }

  function psar(h, l, step = 0.02, max = 0.2) {
    const out = blank(h.length);
    if (h.length < 2) return out;
    let up = h[1] >= h[0], af = step, ep = up ? h[0] : l[0], sar = up ? l[0] : h[0];
    for (let i = 1; i < h.length; i++) {
      sar = sar + af * (ep - sar);
      if (up) {
        sar = Math.min(sar, l[i - 1], l[Math.max(0, i - 2)]);
        if (l[i] < sar) { up = false; sar = ep; ep = l[i]; af = step; }
        else if (h[i] > ep) { ep = h[i]; af = Math.min(max, af + step); }
      } else {
        sar = Math.max(sar, h[i - 1], h[Math.max(0, i - 2)]);
        if (h[i] > sar) { up = true; sar = ep; ep = h[i]; af = step; }
        else if (l[i] < ep) { ep = l[i]; af = Math.min(max, af + step); }
      }
      out[i] = sar;
    }
    return out;
  }

  // Session VWAP: resets each calendar day of the (already Vietnam-shifted) bar time.
  function vwap(bars) {
    let day = -1, pv = 0, vol = 0;
    return bars.map(b => {
      const d = Math.floor(b.time / 86400);
      if (d !== day) { day = d; pv = 0; vol = 0; }
      pv += (b.high + b.low + b.close) / 3 * b.volume; vol += b.volume;
      return vol ? pv / vol : null;
    });
  }

  return { blank, sma, ema, rma, wma, highest, lowest, stdev, bollinger, donchian, ichimoku, psar, vwap };
})();
