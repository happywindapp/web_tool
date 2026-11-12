// Pure technical-analysis math, part 2: oscillators and volume indicators (adds to TA).
Object.assign(TA, (() => {
  const { blank, sma, ema, rma, highest, lowest } = TA;
  const diff = (a, b) => a.map((v, i) => v == null || b[i] == null ? null : v - b[i]);

  function rsi(c, n = 14) {
    const up = blank(c.length), dn = blank(c.length);
    for (let i = 1; i < c.length; i++) { const d = c[i] - c[i - 1]; up[i] = Math.max(d, 0); dn[i] = Math.max(-d, 0); }
    const au = rma(up, n), ad = rma(dn, n);
    return au.map((u, i) => u == null ? null : ad[i] === 0 ? 100 : 100 - 100 / (1 + u / ad[i]));
  }

  function macd(c, fast = 12, slow = 26, sig = 9) {
    const line = diff(ema(c, fast), ema(c, slow)), signal = ema(line, sig);
    return { line, signal, hist: diff(line, signal) };
  }

  function stoch(h, l, c, n = 14, smoothK = 3, smoothD = 3) {
    const hh = highest(h, n), ll = lowest(l, n);
    const raw = c.map((v, i) => hh[i] == null ? null : hh[i] === ll[i] ? 50 : 100 * (v - ll[i]) / (hh[i] - ll[i]));
    const k = sma(raw, smoothK);
    return { k, d: sma(k, smoothD) };
  }

  const trueRange = (h, l, c) => h.map((v, i) => i ? Math.max(v - l[i], Math.abs(v - c[i - 1]), Math.abs(l[i] - c[i - 1])) : v - l[i]);
  const atr = (h, l, c, n = 14) => rma(trueRange(h, l, c), n);

  function adx(h, l, c, n = 14) {
    const pdm = blank(h.length), mdm = blank(h.length);
    for (let i = 1; i < h.length; i++) {
      const u = h[i] - h[i - 1], d = l[i - 1] - l[i];
      pdm[i] = u > d && u > 0 ? u : 0; mdm[i] = d > u && d > 0 ? d : 0;
    }
    const tr = rma(trueRange(h, l, c).map((v, i) => i ? v : null), n), sp = rma(pdm, n), sm = rma(mdm, n);
    const plus = sp.map((v, i) => v == null || !tr[i] ? null : 100 * v / tr[i]), minus = sm.map((v, i) => v == null || !tr[i] ? null : 100 * v / tr[i]);
    const dx = plus.map((p, i) => p == null || minus[i] == null ? null : p + minus[i] === 0 ? 0 : 100 * Math.abs(p - minus[i]) / (p + minus[i]));
    return { adx: rma(dx, n), plus, minus };
  }

  function cci(h, l, c, n = 20) {
    const tp = c.map((v, i) => (h[i] + l[i] + v) / 3), m = sma(tp, n);
    return tp.map((v, i) => {
      if (m[i] == null) return null;
      let md = 0;
      for (let j = i - n + 1; j <= i; j++) md += Math.abs(tp[j] - m[i]);
      md /= n;
      return md ? (v - m[i]) / (0.015 * md) : 0;
    });
  }

  function williamsR(h, l, c, n = 14) {
    const hh = highest(h, n), ll = lowest(l, n);
    return c.map((v, i) => hh[i] == null ? null : hh[i] === ll[i] ? -50 : -100 * (hh[i] - v) / (hh[i] - ll[i]));
  }

  function mfi(h, l, c, v, n = 14) {
    const tp = c.map((x, i) => (h[i] + l[i] + x) / 3), out = blank(c.length);
    for (let i = n; i < c.length; i++) {
      let pos = 0, neg = 0;
      for (let j = i - n + 1; j <= i; j++) { const f = tp[j] * v[j]; if (tp[j] > tp[j - 1]) pos += f; else if (tp[j] < tp[j - 1]) neg += f; }
      out[i] = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
    }
    return out;
  }

  function obv(c, v) {
    let s = 0;
    return c.map((x, i) => (s += i === 0 ? 0 : x > c[i - 1] ? v[i] : x < c[i - 1] ? -v[i] : 0));
  }

  const roc = (c, n = 12) => c.map((x, i) => i >= n && c[i - n] ? 100 * (x / c[i - n] - 1) : null);

  return { rsi, macd, stoch, atr, adx, cci, williamsR, mfi, obv, roc, trueRange };
})());
