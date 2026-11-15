// Pure: notable line crossings for the full chart's cross dots — MA pair, price × longest MA, Ichimoku TK, SAR flip, oscillator zones, MACD, +DI/−DI, Stoch in zones.
// Cross = { time, i, ind (index in inds), line (index of the line the dot sits on), price (y of the dot), kind, tone, v (first line's value), a?, b?, n?, l? }.
const ChartCrosses = (() => {
  const GAP = 3, TONE = { obIn: "warn", obOut: "down", osIn: "warn", osOut: "up", adxUp: "warn", adxDown: "warn" };
  const ok = (...xs) => xs.every(Number.isFinite);
  const above = (a, b, i) => ok(a[i - 1], b[i - 1], a[i], b[i]) && a[i - 1] <= b[i - 1] && a[i] > b[i];

  function detect(bars, inds = [], from = 0) {
    const n = bars.length, out = [], close = bars.map(b => b.close), lvl = v => new Array(n).fill(v);
    // a crosses above b → kUp, below → kDn; the dot sits on line `line` at y(i). Re-crosses within GAP bars are whipsaw noise.
    const pair = (ind, line, a, b, kUp, kDn, { y = i => (a[i] + b[i]) / 2, when = () => true, ...extra } = {}) => {
      for (let i = Math.max(1, from), prev = -GAP; i < n; i++) {
        const kind = above(a, b, i) && when(i, 1) ? kUp : above(b, a, i) && when(i, -1) ? kDn : "";
        if (!kind || i - prev < GAP) { if (kind) prev = i; continue; }
        prev = i;
        out.push({ time: bars[i].time, i, ind, line, price: y(i), kind, tone: TONE[kind] || (kind === kUp ? "up" : "down"), v: a[i], ...extra });
      }
    };
    const mas = inds.map((x, k) => ({ x, k, v: x.lines[0].values, t: x.lines[0].title })).filter(o => ["sma", "ema", "wma"].includes(o.x.id)).sort((p, q) => p.x.p.n - q.x.p.n);
    if (mas.length) {
      const f = mas[0], s = mas[mas.length - 1];
      if (s !== f) pair(s.k, 0, f.v, s.v, "maUp", "maDown", { a: f.t, b: s.t });
      pair(s.k, 0, close, s.v, "pxUp", "pxDown", { y: i => s.v[i], b: s.t });
    }
    inds.forEach((x, k) => {
      const L = x.lines.map(l => l.values), t = x.lines[0].title, lv = x.def.levels || [];
      if (x.id === "ichi") pair(k, 1, L[0], L[1], "tkUp", "tkDown");
      else if (x.id === "psar") pair(k, 0, close, L[0], "sarUp", "sarDown", { y: i => L[0][i] });
      else if (x.id === "macd") { pair(k, 1, L[1], L[2], "sigUp", "sigDown"); pair(k, 1, L[1], lvl(0), "zeroUp", "zeroDown", { y: () => 0, n: x.lines[1].title }); }
      else if (x.id === "roc") pair(k, 0, L[0], lvl(0), "zeroUp", "zeroDown", { y: () => 0, n: t });
      else if (x.id === "adx") { pair(k, 1, L[1], L[2], "diUp", "diDown"); pair(k, 0, L[0], lvl(25), "adxUp", "adxDown", { y: () => 25 }); }
      else if (x.id === "stoch") pair(k, 0, L[0], L[1], "stUp", "stDown", { when: (i, dir) => dir > 0 ? Math.min(L[0][i - 1], L[1][i - 1]) <= 20 : Math.max(L[0][i - 1], L[1][i - 1]) >= 80 });
      else if (lv.length === 2) {
        const [lo, hi] = [Math.min(...lv), Math.max(...lv)];
        pair(k, 0, L[0], lvl(hi), "obIn", "obOut", { y: () => hi, n: t, l: hi });
        pair(k, 0, L[0], lvl(lo), "osOut", "osIn", { y: () => lo, n: t, l: lo });
      }
    });
    return out.sort((p, q) => p.time - q.time);
  }

  return { detect };
})();
