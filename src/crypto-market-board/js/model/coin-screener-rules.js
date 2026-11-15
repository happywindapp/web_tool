// Pure screener rules: preset criteria, match of one coin (snapshot + events + row) against criteria, sorting.
const ScreenerRules = (() => {
  const EMPTY = { rsiMin: "", rsiMax: "", ma50: "", ma200: "", pctMin: "", pctMax: "", p7Min: "", p7Max: "", athMax: "", mcapMin: "", volMin: "", scoreMin: "", scoreMax: "", within: 10, sig: [] };
  const PRESETS = {
    oversoldUp: ["Quá bán trong xu hướng tăng", { rsiMax: 35, ma200: "above" }],
    golden: ["Golden cross mới (≤ 10 phiên)", { sig: ["goldenCross"], within: 10 }],
    crossUp200: ["Vừa vượt MA200", { sig: ["crossUp200"], within: 5 }],
    breakout: ["Bứt phá đỉnh 20 phiên + KL ≥ 1,5×", { sig: ["breakout20"], within: 1, volMin: 1.5 }],
    macdUp: ["MACD cắt lên", { sig: ["macdUp"], within: 3 }],
    overbought: ["Quá mua RSI ≥ 75", { rsiMin: 75 }],
    bearish: ["Death cross / thủng MA200", { sig: ["deathCross", "crossDown200"], within: 10 }],
  };
  const num = v => v === "" || v == null || !Number.isFinite(+v) ? null : +v;
  const preset = k => PRESETS[k] ? { ...EMPTY, ...PRESETS[k][1] } : { ...EMPTY };

  // Keeps only known fields with sane types (stored criteria / presets).
  function clean(c) {
    const o = { ...EMPTY };
    if (!c || typeof c !== "object") return o;
    for (const k of Object.keys(EMPTY)) {
      if (k === "sig") o.sig = Array.isArray(c.sig) ? c.sig.filter(s => CoinSignals.KEYS.includes(s)) : [];
      else if (k === "ma50" || k === "ma200") o[k] = c[k] === "above" || c[k] === "below" ? c[k] : "";
      else if (k === "within") o.within = Math.min(60, Math.max(0, Math.round(num(c.within) ?? 10)));
      else o[k] = num(c[k]) == null ? "" : +c[k];
    }
    return o;
  }

  const inRange = (v, lo, hi) => (lo == null || (v != null && v >= lo)) && (hi == null || (v != null && v <= hi));

  // item: { snap, events: [{ key, barsAgo }], row } → boolean
  function match(item, crit) {
    const { snap: s, events, row: r } = item, c = clean(crit);
    if (!s) return false;
    if (!inRange(s.rsi, num(c.rsiMin), num(c.rsiMax)) || !inRange(s.score, num(c.scoreMin), num(c.scoreMax))) return false;
    if (c.ma50 && (s.ma50 == null || (c.ma50 === "above") !== (s.price > s.ma50))) return false;
    if (c.ma200 && (s.ma200 == null || (c.ma200 === "above") !== (s.price > s.ma200))) return false;
    if (!inRange(r.pct, num(c.pctMin), num(c.pctMax)) || !inRange(r.pct7d, num(c.p7Min), num(c.p7Max))) return false;
    if (num(c.athMax) != null && !(r.athPct != null && r.athPct >= -c.athMax)) return false;
    if (num(c.mcapMin) != null && !(r.mcap >= c.mcapMin * 1e6)) return false;
    if (num(c.volMin) != null && !(s.volRatio != null && s.volRatio >= c.volMin)) return false;
    if (c.sig.length && !events.some(e => c.sig.includes(e.key) && e.barsAgo <= c.within)) return false;
    return true;
  }

  const VALUE = { coin: it => it.row.sym, price: it => it.row.last, pct: it => it.row.pct, pct7d: it => it.row.pct7d, rsi: it => it.snap.rsi, score: it => it.snap.score,
    vs200: it => it.snap.vsMa200, vol: it => it.snap.volRatio, sig: it => it.events.length ? it.events[0].barsAgo : null };
  const COLS = Object.keys(VALUE);

  // Stable sort; empty values always last.
  function sort(items, col, dir) {
    const f = VALUE[col] || VALUE.coin, k = dir === "asc" ? 1 : -1;
    return items.map((it, i) => ({ it, i, v: f(it) })).sort((a, b) => {
      const an = a.v == null || (typeof a.v === "number" && !Number.isFinite(a.v)), bn = b.v == null || (typeof b.v === "number" && !Number.isFinite(b.v));
      if (an || bn) return an === bn ? a.i - b.i : an ? 1 : -1;
      return (typeof a.v === "string" ? a.v.localeCompare(b.v) : a.v - b.v) * k || a.i - b.i;
    }).map(x => x.it);
  }

  return { EMPTY, PRESETS, COLS, preset, clean, match, sort };
})();
