// Indicator catalog: params, pane (overlay on price or own pane), guide levels, and calc(bars, p) → plotted lines.
// Line = { title, color, values[], kind: "line" | "hist" | "dots", colors?[] }.
const Indicators = (() => {
  const PALETTE = ["#2563eb", "#f97316", "#9333ea", "#0d9488", "#db2777", "#ca8a04", "#64748b", "#0891b2"];
  const col = (b, k) => b.map(x => x[k]);
  const P = (k, d, min, max, step = 1) => ({ k, d, min, max, step });
  const line = (title, values, color, extra) => ({ title, values, color, kind: "line", ...extra });

  const DEFS = {
    sma: { name: "SMA", label: "Trung bình động đơn giản", pane: "main", params: [P("n", 20, 1, 500)], calc: (b, p, c) => [line(`SMA ${p.n}`, TA.sma(col(b, "close"), p.n), c)] },
    ema: { name: "EMA", label: "Trung bình động hàm mũ", pane: "main", params: [P("n", 21, 1, 500)], calc: (b, p, c) => [line(`EMA ${p.n}`, TA.ema(col(b, "close"), p.n), c)] },
    wma: { name: "WMA", label: "Trung bình động có trọng số", pane: "main", params: [P("n", 20, 1, 500)], calc: (b, p, c) => [line(`WMA ${p.n}`, TA.wma(col(b, "close"), p.n), c)] },
    bb: { name: "BB", label: "Dải Bollinger", pane: "main", params: [P("n", 20, 2, 200), P("m", 2, 0.5, 5, 0.1)], calc: (b, p, c) => {
      const x = TA.bollinger(col(b, "close"), p.n, p.m);
      return [line("BB+", x.upper, c, { width: 1 }), line(`BB ${p.n}`, x.mid, c, { dash: true, width: 1 }), line("BB−", x.lower, c, { width: 1 })];
    } },
    dc: { name: "Donchian", label: "Kênh Donchian", pane: "main", params: [P("n", 20, 2, 200)], calc: (b, p, c) => {
      const x = TA.donchian(col(b, "high"), col(b, "low"), p.n);
      return [line("DC+", x.upper, c, { width: 1 }), line(`DC ${p.n}`, x.mid, c, { dash: true, width: 1 }), line("DC−", x.lower, c, { width: 1 })];
    } },
    ichi: { name: "Ichimoku", label: "Mây Ichimoku", pane: "main", params: [P("a", 9, 2, 100), P("b", 26, 2, 100), P("s", 52, 2, 200)], calc: (b, p) => {
      const x = TA.ichimoku(col(b, "high"), col(b, "low"), col(b, "close"), p.a, p.b, p.s);
      return [line("Tenkan", x.tenkan, "#2563eb", { width: 1 }), line("Kijun", x.kijun, "#dc2626", { width: 1 }), line("Span A", x.spanA, "#16a34a", { width: 1 }),
        line("Span B", x.spanB, "#f97316", { width: 1 }), line("Chikou", x.chikou, "#9333ea", { width: 1, dash: true })];
    } },
    psar: { name: "SAR", label: "Parabolic SAR", pane: "main", params: [P("s", 0.02, 0.01, 0.2, 0.01), P("m", 0.2, 0.05, 1, 0.05)], calc: (b, p, c) => [line("SAR", TA.psar(col(b, "high"), col(b, "low"), p.s, p.m), c, { kind: "dots" })] },
    vwap: { name: "VWAP", label: "Giá bình quân theo KL (trong phiên)", pane: "main", params: [], intraday: true, calc: (b, p, c) => [line("VWAP", TA.vwap(b), c)] },
    rsi: { name: "RSI", label: "Sức mạnh tương đối", pane: "own", levels: [30, 70], params: [P("n", 14, 2, 100)], calc: (b, p) => [line(`RSI ${p.n}`, TA.rsi(col(b, "close"), p.n), "#9333ea")] },
    macd: { name: "MACD", label: "Hội tụ phân kỳ trung bình động", pane: "own", levels: [0], params: [P("f", 12, 2, 100), P("s", 26, 2, 200), P("g", 9, 2, 100)], calc: (b, p) => {
      const x = TA.macd(col(b, "close"), p.f, p.s, p.g);
      return [{ title: "Hist", values: x.hist, kind: "hist", colors: x.hist.map(v => v >= 0 ? "#22c55e99" : "#ef444499") },
        line(`MACD ${p.f},${p.s}`, x.line, "#2563eb"), line(`Signal ${p.g}`, x.signal, "#f97316")];
    } },
    stoch: { name: "Stoch", label: "Dao động ngẫu nhiên", pane: "own", levels: [20, 80], params: [P("n", 14, 2, 100), P("k", 3, 1, 20), P("d", 3, 1, 20)], calc: (b, p) => {
      const x = TA.stoch(col(b, "high"), col(b, "low"), col(b, "close"), p.n, p.k, p.d);
      return [line(`%K ${p.n}`, x.k, "#2563eb"), line(`%D ${p.d}`, x.d, "#f97316")];
    } },
    adx: { name: "ADX", label: "Chỉ số định hướng trung bình", pane: "own", levels: [25], params: [P("n", 14, 2, 100)], calc: (b, p) => {
      const x = TA.adx(col(b, "high"), col(b, "low"), col(b, "close"), p.n);
      return [line(`ADX ${p.n}`, x.adx, "#ca8a04"), line("+DI", x.plus, "#16a34a", { width: 1 }), line("−DI", x.minus, "#dc2626", { width: 1 })];
    } },
    atr: { name: "ATR", label: "Biên độ dao động thực trung bình", pane: "own", params: [P("n", 14, 2, 100)], calc: (b, p, c) => [line(`ATR ${p.n}`, TA.atr(col(b, "high"), col(b, "low"), col(b, "close"), p.n), c)] },
    cci: { name: "CCI", label: "Chỉ số kênh hàng hoá", pane: "own", levels: [-100, 100], params: [P("n", 20, 2, 100)], calc: (b, p, c) => [line(`CCI ${p.n}`, TA.cci(col(b, "high"), col(b, "low"), col(b, "close"), p.n), c)] },
    wr: { name: "%R", label: "Williams %R", pane: "own", levels: [-80, -20], params: [P("n", 14, 2, 100)], calc: (b, p, c) => [line(`%R ${p.n}`, TA.williamsR(col(b, "high"), col(b, "low"), col(b, "close"), p.n), c)] },
    mfi: { name: "MFI", label: "Chỉ số dòng tiền", pane: "own", levels: [20, 80], params: [P("n", 14, 2, 100)], calc: (b, p, c) => [line(`MFI ${p.n}`, TA.mfi(col(b, "high"), col(b, "low"), col(b, "close"), col(b, "volume"), p.n), c)] },
    obv: { name: "OBV", label: "Khối lượng cân bằng", pane: "own", params: [], calc: (b, p, c) => [line("OBV", TA.obv(col(b, "close"), col(b, "volume")), c)] },
    roc: { name: "ROC", label: "Tốc độ thay đổi giá (%)", pane: "own", levels: [0], params: [P("n", 12, 1, 200)], calc: (b, p, c) => [line(`ROC ${p.n}`, TA.roc(col(b, "close"), p.n), c)] },
  };

  // Most widely used; highlighted in the indicator menu.
  const CORE = ["sma", "ema", "bb", "rsi", "macd"];
  const DEFAULT = [{ id: "sma", p: { n: 20 } }, { id: "sma", p: { n: 50 } }, { id: "rsi", p: { n: 14 } }, { id: "macd", p: { f: 12, s: 26, g: 9 } }];
  const MAX = 12;

  // Untrusted list (storage / share link) → known ids, numeric params clamped to the def's range.
  function clean(list) {
    if (!Array.isArray(list)) return DEFAULT.map(x => ({ ...x, p: { ...x.p } }));
    return list.filter(x => x && Object.hasOwn(DEFS, x.id)).slice(0, MAX).map(x => ({ id: x.id, p: params(x.id, x.p) }));
  }
  function params(id, raw = {}) {
    const out = {};
    for (const q of DEFS[id].params) { const v = +(raw && raw[q.k]); out[q.k] = Number.isFinite(v) ? Math.min(q.max, Math.max(q.min, v)) : q.d; }
    return out;
  }
  const add = (list, id) => list.length >= MAX ? list : [...list, { id, p: params(id) }];
  // Overlay colours rotate by position among overlays, so two SMAs get different colours.
  function compute(list, bars) {
    let k = 0;
    return list.map(x => { const d = DEFS[x.id], c = d.pane === "main" ? PALETTE[k++ % PALETTE.length] : PALETTE[0]; return { ...x, def: d, lines: d.calc(bars, x.p, c) }; });
  }

  return { DEFS, DEFAULT, CORE, clean, params, add, compute, MAX };
})();
