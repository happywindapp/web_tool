// Lightweight Charts wrapper for analytic time series (on-chain, DeFi, derivatives): lines / areas / histograms on 1–3 panes,
// left / right / own scales, log scale, markers, guide levels, crosshair legend. axis "days" shows x as day counts (halving cycles).
const SeriesChart = (() => {
  const css = () => { const s = getComputedStyle(document.documentElement), v = n => s.getPropertyValue(n).trim(); return { bg: v("--panel"), muted: v("--muted"), line: v("--line"), ink: v("--ink") }; };
  const alpha = (hex, a) => /^#[0-9a-f]{6}$/i.test(hex) ? hex + a : hex;
  const DAY = 86400;
  // Sorted, one point per time, finite values only (the library throws on unsorted / duplicate times).
  function tidy(data) {
    const m = new Map();
    for (const d of data || []) if (d && Number.isFinite(d.time) && (d.value == null || Number.isFinite(d.value))) m.set(Math.round(d.time), d);
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, d]) => d.value == null ? { time: t } : { ...d, time: t });
  }

  // opt: { legend?: HTMLElement, axis?: "date" | "days", fmt?: v => string }
  function create(el, opt = {}) {
    const LW = globalThis.LightweightCharts;
    let chart = null, made = [], args = null;

    function destroy() { if (chart) chart.remove(); chart = null; made = []; }

    // series: [{ title, data: [{ time (s), value, color? }], color, type: "line"|"area"|"hist"|"dots", width, dash, scale, pane, fmt, markers, levels }]
    function set(series, o = {}) {
      args = [series, o];
      destroy();
      const c = css(), days = opt.axis === "days";
      const fmt = opt.fmt || (v => Fmt.big(v));
      chart = LW.createChart(el, {
        autoSize: true,
        layout: { background: { type: "solid", color: c.bg }, textColor: c.muted, fontSize: 11, panes: { separatorColor: c.line } },
        grid: { vertLines: { color: alpha(c.line, "44") }, horzLines: { color: alpha(c.line, "44") } },
        rightPriceScale: { borderColor: c.line, visible: true }, leftPriceScale: { borderColor: c.line, visible: series.some(s => s.scale === "left") },
        timeScale: { borderColor: c.line, timeVisible: !!o.intraday, secondsVisible: false, rightOffset: 2, minBarSpacing: 0.02,
          ...(days ? { tickMarkFormatter: t => T("Ngày {n}", { n: Math.round(t / DAY) }) } : {}) },
        localization: { locale: "en-US", priceFormatter: fmt, ...(days ? { timeFormatter: t => T("Ngày {n}", { n: Math.round(t / DAY) }) } : {}) },
        crosshair: { mode: LW.CrosshairMode.Normal },
        handleScroll: { vertTouchDrag: false },
      });
      made = series.map(s => {
        const pane = s.pane || 0, common = { priceLineVisible: false, lastValueVisible: s.last !== false, title: s.axisTitle || "", priceScaleId: s.scale || "right", visible: s.visible !== false,
          ...(s.fmt ? { priceFormat: { type: "custom", formatter: s.fmt, minMove: 1e-12 } } : {}) };
        let ser;
        if (s.type === "hist") ser = chart.addSeries(LW.HistogramSeries, { ...common, color: s.color }, pane);
        else if (s.type === "area") ser = chart.addSeries(LW.AreaSeries, { ...common, lineColor: s.color, topColor: alpha(s.color, "55"), bottomColor: alpha(s.color, "08"), lineWidth: s.width || 2 }, pane);
        else ser = chart.addSeries(LW.LineSeries, { ...common, color: s.color, lineWidth: s.width || 2, lineStyle: s.dash ? LW.LineStyle.Dashed : LW.LineStyle.Solid,
          lineVisible: s.type !== "dots", pointMarkersVisible: s.type === "dots", pointMarkersRadius: 2, crosshairMarkerVisible: true }, pane);
        ser.setData(tidy(s.data));
        if (s.markers && s.markers.length) LW.createSeriesMarkers(ser, tidy(s.markers.map(m => ({ ...m, value: 0 }))).map(m => ({ time: m.time, position: m.position || "aboveBar", color: m.color || c.ink, shape: m.shape || "arrowDown", text: m.text || "" })));
        for (const lv of s.levels || []) ser.createPriceLine({ price: lv.price, color: lv.color || c.muted, lineWidth: 1, lineStyle: LW.LineStyle.Dotted, axisLabelVisible: true, title: lv.title || "" });
        return { s, ser };
      });
      if (o.log) chart.priceScale("right").applyOptions({ mode: 1 });
      for (const sc of new Set(series.map(s => s.scale).filter(x => x && x !== "right" && x !== "left"))) {
        const first = series.find(s => s.scale === sc);
        chart.priceScale(sc, first.pane || 0).applyOptions({ scaleMargins: first.margins || { top: 0.7, bottom: 0 } });
      }
      const panes = chart.panes();
      panes.forEach((p, i) => p.setStretchFactor(i ? 1 : Math.max(2, panes.length)));
      chart.subscribeCrosshairMove(p => legend(p));
      if (o.from) chart.timeScale().setVisibleRange({ from: o.from, to: o.to || Math.floor(Date.now() / 1000) + DAY });
      else chart.timeScale().fitContent();
      legend(null);
    }

    function legend(p) {
      if (!opt.legend) return;
      const items = made.filter(m => m.s.legend !== false).map(({ s, ser }) => {
        let v = p && p.seriesData ? p.seriesData.get(ser) : null;
        if (!v) { const d = ser.data(); v = d[d.length - 1]; }
        const val = v && Number.isFinite(v.value) ? (s.fmt || opt.fmt || Fmt.big)(v.value) : "–";
        return `<span style="color:${s.color}">${Dom.esc(s.title)} <b>${Dom.esc(val)}</b></span>`;
      });
      const t = p && p.time != null ? (opt.axis === "days" ? T("Ngày {n}", { n: Math.round(p.time / DAY) }) : Fmt.date(p.time * 1000)) : "";
      opt.legend.innerHTML = (t ? `<span>${Dom.esc(t)}</span>` : "") + items.join("");
    }

    return { set, destroy, redraw: () => { if (args) set(...args); }, chart: () => chart };
  }

  // [{ t (ms) | time (s), value }] helpers for callers.
  const fromMs = (list, key = "value") => list.map(x => ({ time: Math.floor(x.t / 1000), value: x[key] }));
  return { create, tidy, fromMs, DAY };
})();
