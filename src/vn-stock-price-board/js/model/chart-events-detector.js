// Pure: notable points on a price chart — swing highs / lows, period extremes, MA crosses, MACD / RSI / Bollinger signals, volume spikes.
// Event = { time, i, kind, tone: "up" | "down" | "warn", pos: "above" | "below", price, v? } (wording + markers live in the UI).
const ChartEvents = (() => {
  const MAX = 80;

  // inds: Indicators.compute(...) result for the same bars.
  function detect(bars, inds = [], from = 0) {
    const n = bars.length, out = [], h = bars.map(b => b.high), l = bars.map(b => b.low), c = bars.map(b => b.close);
    if (n < 10) return out;
    const atr = TA.atr(h, l, c, 14), add = (i, kind, tone, pos, extra = {}) => { if (i >= from) out.push({ time: bars[i].time, i, kind, tone, pos, price: pos === "above" ? h[i] : l[i], ...extra }); };

    // Swing high / low confirmed by k bars each side and standing out by ≥ 2 ATR from the window's opposite extreme.
    const k = Math.max(3, Math.min(12, Math.round(n / 40)));
    for (let i = k; i < n - k; i++) {
      const win = [i - k, i + k + 1], a = atr[i] || 0;
      const hi = Math.max(...h.slice(...win)), lo = Math.min(...l.slice(...win));
      if (h[i] === hi && h[i] - lo >= 2 * a) add(i, "swingHigh", "down", "above");
      if (l[i] === lo && hi - l[i] >= 2 * a) add(i, "swingLow", "up", "below");
    }
    // Highest high / lowest low of the visible range.
    let ih = from, il = from;
    for (let i = from; i < n; i++) { if (h[i] > h[ih]) ih = i; if (l[i] < l[il]) il = i; }
    add(ih, "rangeHigh", "warn", "above");
    add(il, "rangeLow", "warn", "below");

    const crossUp = (a, b, i) => a[i - 1] != null && b[i - 1] != null && a[i] != null && b[i] != null && a[i - 1] <= b[i - 1] && a[i] > b[i];
    const crossDn = (a, b, i) => crossUp(b, a, i);

    // Shortest vs longest moving average among the overlays (e.g. SMA 20 × SMA 50).
    const mas = inds.filter(x => ["sma", "ema", "wma"].includes(x.id)).sort((a, b) => a.p.n - b.p.n);
    if (mas.length >= 2) {
      const f = mas[0].lines[0].values, s = mas[mas.length - 1].lines[0].values, names = { fast: mas[0].lines[0].title, slow: mas[mas.length - 1].lines[0].title };
      for (let i = 1; i < n; i++) {
        if (crossUp(f, s, i)) add(i, "maCrossUp", "up", "below", names);
        if (crossDn(f, s, i)) add(i, "maCrossDown", "down", "above", names);
      }
    }
    const macd = inds.find(x => x.id === "macd");
    if (macd) {
      const line = macd.lines.find(x => x.kind !== "hist" && /^MACD/.test(x.title)).values, sig = macd.lines.find(x => /^Signal/.test(x.title)).values;
      for (let i = 1; i < n; i++) {
        if (crossUp(line, sig, i)) add(i, "macdUp", "up", "below");
        if (crossDn(line, sig, i)) add(i, "macdDown", "down", "above");
      }
    }
    const rsi = inds.find(x => x.id === "rsi");
    if (rsi) {
      const r = rsi.lines[0].values;
      for (let i = 1; i < n; i++) {
        if (r[i - 1] != null && r[i] != null && r[i - 1] < 70 && r[i] >= 70) add(i, "rsiHigh", "warn", "above", { v: r[i] });
        if (r[i - 1] != null && r[i] != null && r[i - 1] > 30 && r[i] <= 30) add(i, "rsiLow", "warn", "below", { v: r[i] });
      }
    }
    const bb = inds.find(x => x.id === "bb");
    if (bb) {
      const up = bb.lines[0].values, lo = bb.lines[2].values;
      for (let i = 1; i < n; i++) {
        if (up[i] != null && c[i] > up[i] && !(c[i - 1] > up[i - 1])) add(i, "bbUp", "warn", "above");
        if (lo[i] != null && c[i] < lo[i] && !(c[i - 1] < lo[i - 1])) add(i, "bbDown", "warn", "below");
      }
    }
    // Volume spike: ≥ 2.5× the 20-bar average.
    const vol = bars.map(b => b.volume), avg = TA.sma(vol, 20);
    for (let i = 20; i < n; i++) if (avg[i - 1] > 0 && vol[i] >= 2.5 * avg[i - 1]) add(i, "volSpike", c[i] >= (c[i - 1] ?? c[i]) ? "up" : "down", c[i] >= (c[i - 1] ?? c[i]) ? "below" : "above", { v: vol[i] / avg[i - 1] });

    // Newest events win when there are too many to draw.
    return out.sort((a, b) => a.time - b.time || a.kind.localeCompare(b.kind)).slice(-MAX);
  }

  return { detect, MAX };
})();
