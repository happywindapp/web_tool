// Pure Bitcoin cycle maths on daily series (no DOM / network): moving averages, Mayer, Pi Cycle, Rainbow, Puell, S2F, halvings, hash ribbons, thermometer.
const BtcCycle = (() => {
  const DAY = 86400, GENESIS = Date.UTC(2009, 0, 3) / 1000, EPOCH = 210000, NEXT_HALVING_BLOCK = 1050000;
  const HALVINGS = [Date.UTC(2012, 10, 28), Date.UTC(2016, 6, 9), Date.UTC(2020, 4, 11), Date.UTC(2024, 3, 20)].map(ms => ({ t: ms / 1000, label: new Date(ms).toISOString().slice(0, 10) }));
  const ZONES = ["Đáy", "Tích luỹ", "Trung tính", "Nóng", "Đỉnh"];
  const BANDS = ["Bán tháo", "Mua đi", "Tích luỹ", "Vẫn còn rẻ", "HODL", "Hơi đắt", "FOMO mạnh", "Bán đi", "Bong bóng"];
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const last = a => { for (let i = a.length - 1; i >= 0; i--) if (a[i] != null) return a[i]; return null; };

  // [{t (s), v}] → consecutive UTC days, positive values only, gaps forward-filled.
  function grid(points) {
    const m = new Map();
    for (const p of points) if (p && p.v > 0) m.set(Math.floor(p.t / DAY) * DAY, p.v);
    const keys = [...m.keys()].sort((a, b) => a - b), times = [], values = [];
    if (!keys.length) return { times, values };
    let v = m.get(keys[0]);
    for (let t = keys[0]; t <= keys[keys.length - 1]; t += DAY) { if (m.has(t)) v = m.get(t); times.push(t); values.push(v); }
    return { times, values };
  }

  // Linear interpolation of sparse points onto `times`; null before the first point, last value held after the end.
  function align(times, points) {
    const p = points.filter(x => x && Number.isFinite(x.v)).sort((a, b) => a.t - b.t), out = [];
    let j = 0;
    for (const t of times) {
      if (!p.length || t < p[0].t) { out.push(null); continue; }
      while (j + 1 < p.length && p[j + 1].t <= t) j++;
      const a = p[j], b = p[j + 1];
      out.push(!b ? a.v : a.v + (b.v - a.v) * (t - a.t) / (b.t - a.t));
    }
    return out;
  }

  function sma(v, n) {
    const out = new Array(v.length).fill(null);
    let sum = 0, bad = 0;
    for (let i = 0; i < v.length; i++) {
      if (v[i] == null) bad++; else sum += v[i];
      if (i >= n) { if (v[i - n] == null) bad--; else sum -= v[i - n]; }
      if (i >= n - 1 && !bad) out[i] = sum / n;
    }
    return out;
  }
  const ratio = (a, b) => a.map((x, i) => x != null && b[i] ? x / b[i] : null);
  const scale = (a, k) => a.map(x => x == null ? null : x * k);
  const crossUps = (a, b) => { const out = []; for (let i = 1; i < a.length; i++) if (a[i] != null && b[i] != null && a[i - 1] != null && b[i - 1] != null && a[i] > b[i] && a[i - 1] <= b[i - 1]) out.push(i); return out; };
  const daysSinceGenesis = t => (t - GENESIS) / DAY;

  // Least squares of log10(price) on log10(days since genesis); 10 band edges spaced 0.6σ in log space around the fit.
  function rainbow(times, prices) {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    times.forEach((t, i) => { if (prices[i] > 0) { const x = Math.log10(daysSinceGenesis(t)), y = Math.log10(prices[i]); n++; sx += x; sy += y; sxx += x * x; sxy += x * y; } });
    const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
    const center = t => a + b * Math.log10(daysSinceGenesis(t));
    let ss = 0;
    times.forEach((t, i) => { if (prices[i] > 0) ss += (Math.log10(prices[i]) - center(t)) ** 2; });
    const std = Math.sqrt(ss / n), w = 0.6 * std;
    const edge = (k, t) => Math.pow(10, center(t) + (k - 5) * w);
    const band = (t, price) => clamp(Math.floor((Math.log10(price) - center(t)) / w + 4.5), 0, BANDS.length - 1);
    return { a, b, std, w, edge, band, fair: t => Math.pow(10, center(t)) };
  }

  // Per halving: price divided by the price on halving day, x = seconds since halving (axis "days").
  function halvingCycles(times, prices) {
    return HALVINGS.map(h => {
      const i0 = times.findIndex(t => t >= h.t);
      if (i0 < 0 || times[0] > h.t + DAY || !prices[i0]) return { label: h.label, points: [] };
      return { label: h.label, points: times.slice(i0).map((t, k) => ({ time: k * DAY, value: prices[i0 + k] / prices[i0] })) };
    });
  }

  function drawdown(prices) { let top = 0; return prices.map(p => { top = Math.max(top, p); return top ? (p / top - 1) * 100 : 0; }); }

  function hashRibbon(hashVals) {
    const s30 = sma(hashVals, 30), s60 = sma(hashVals, 60);
    return { s30, s60, recovery: crossUps(s30, s60), capitulation: last(s30) != null && last(s60) != null && last(s30) < last(s60) };
  }

  function stockToFlow(supply) {
    const s2f = supply.map((s, i) => i >= 365 && s != null && supply[i - 365] != null && s > supply[i - 365] ? s / (s - supply[i - 365]) : null);
    return { s2f, model: s2f.map(x => x == null ? null : Math.exp(-1.84) * Math.pow(x, 3.36)) };
  }

  function halvingInfo(height, nowMs = Date.now()) {
    const left = NEXT_HALVING_BLOCK - height, done = EPOCH - left;
    return { blocksLeft: left, progress: clamp(done / EPOCH * 100, 0, 100), etaMs: nowMs + left * 600000, nextBlock: NEXT_HALVING_BLOCK };
  }

  function interp(x, pts) {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return pts[pts.length - 1][1];
  }
  const zoneOf = score => score < 20 ? 0 : score < 40 ? 1 : score < 60 ? 2 : score < 80 ? 3 : 4;
  const CURVES = {
    mayer: [[0.6, 0], [0.8, 18], [1.2, 45], [1.8, 70], [2.4, 88], [3, 100]],
    wma: [[0.9, 5], [1.2, 20], [2, 45], [3, 65], [4.5, 85], [6, 100]],
    pi: [[0.3, 5], [0.5, 25], [0.75, 55], [0.9, 80], [1, 100]],
    puell: [[0.4, 3], [0.6, 20], [1, 40], [2, 62], [4, 88], [6, 100]],
  };

  // now: { mayer, ratio200w, pi, puell, band, fg, capitulation } (null = unknown) → rows { key, value, score, zone } + aggregate.
  function thermometer(now) {
    const rows = [];
    const add = (key, value, score) => { if (value != null && score != null) rows.push({ key, value, score, zone: zoneOf(score) }); };
    for (const [k, f] of [["mayer", "mayer"], ["wma", "ratio200w"], ["pi", "pi"], ["puell", "puell"]]) add(k, now[f], now[f] == null ? null : interp(now[f], CURVES[k]));
    add("rainbow", now.band, now.band == null ? null : now.band / (BANDS.length - 1) * 100);
    add("fng", now.fg, now.fg);
    add("ribbon", now.capitulation == null ? null : +now.capitulation, now.capitulation == null ? null : now.capitulation ? 10 : 50);
    const score = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : null;
    return { rows, score, zone: score == null ? null : zoneOf(score) };
  }

  function analyze({ price, rev, supply, hash, fg }) {
    const { times, values: prices } = grid(price);
    const ma200 = sma(prices, 200), ma111 = sma(prices, 111), ma350 = sma(prices, 350), ma200w = sma(prices, 1400);
    const ma350x2 = scale(ma350, 2), mayer = ratio(prices, ma200), ratio200w = ratio(prices, ma200w);
    const revG = align(times, rev), puell = ratio(revG, sma(revG, 365));
    const supplyG = align(times, supply), s2f = stockToFlow(supplyG);
    const hg = grid(hash), ribbon = { times: hg.times, hash: hg.values, ...hashRibbon(hg.values) };
    const rb = rainbow(times, prices), n = times.length - 1, dd = drawdown(prices);
    const pi = ratio(ma111, ma350x2);
    const now = { price: prices[n], mayer: last(mayer), ma200w: last(ma200w), ratio200w: last(ratio200w), pi: last(pi), puell: last(puell), band: n >= 0 ? rb.band(times[n], prices[n]) : null,
      drawdown: dd[n], s2fModel: last(s2f.model), fg: fg == null ? null : fg, capitulation: hg.values.length >= 60 ? ribbon.capitulation : null, ma350x2: last(ma350x2), ma111: last(ma111) };
    return { times, prices, ma200, ma111, ma350, ma350x2, ma200w, mayer, ratio200w, puell, supply: supplyG, s2f, ribbon, rainbow: rb, drawdown: dd, piCross: crossUps(ma111, ma350x2),
      halvings: halvingCycles(times, prices), now, thermo: thermometer(now) };
  }

  return { DAY, HALVINGS, ZONES, BANDS, grid, align, sma, ratio, scale, crossUps, rainbow, halvingCycles, drawdown, hashRibbon, stockToFlow, halvingInfo, interp, zoneOf, thermometer, analyze, last, daysSinceGenesis };
})();
