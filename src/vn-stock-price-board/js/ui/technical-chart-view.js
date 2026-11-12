// Lightweight Charts wrapper: price series (6 types), volume, overlay + own-pane indicators, crosshair legend, click → drawing tools.
const TechChart = (() => {
  const css = () => { const s = getComputedStyle(document.documentElement), v = n => s.getPropertyValue(n).trim(); return { bg: v("--panel"), ink: v("--ink"), muted: v("--muted"), line: v("--line"), up: v("--up"), down: v("--down"), acc: v("--acc") }; };
  const alpha = (hex, a) => /^#[0-9a-f]{6}$/i.test(hex) ? hex + a : hex;
  const fmtPrice = p => Math.abs(p) >= 1e6 ? (p < 0 ? "-" : "") + Fmt.big(Math.abs(p)) : Math.abs(p) >= 1000 ? Fmt.en(p, 2) : p.toFixed(2);
  const pts = (bars, values) => values.map((v, i) => v == null || !Number.isFinite(v) ? { time: bars[i].time } : { time: bars[i].time, value: v });

  // opt: { legend: HTMLElement, onClick(point), compact }
  function create(el, opt) {
    const LW = globalThis.LightweightCharts;
    let chart = null, main = null, vol = null, last = null, overlays = [];

    // Native click → bar + price: the library drops a quick 2nd click at another spot (double-click guard), drawing needs every click.
    let down = null;
    el.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener("click", e => {
      if (!opt.onClick || !chart || !last || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (y > chart.panes()[0].getHeight()) return;
      const i = Math.round(chart.timeScale().coordinateToLogical(x) ?? -1), b = last.bars[Math.min(i, last.bars.length - 1)];
      if (i < 0 || !b) return;
      opt.onClick({ time: b.time, price: main.coordinateToPrice(y) });
    });

    function mainSeries(type, bars, c) {
      const S = { candle: LW.CandlestickSeries, ha: LW.CandlestickSeries, bar: LW.BarSeries, line: LW.LineSeries, area: LW.AreaSeries, baseline: LW.BaselineSeries }[type] || LW.CandlestickSeries;
      const o = { priceLineVisible: true, lastValueVisible: true };
      if (S === LW.CandlestickSeries) Object.assign(o, { upColor: c.up, downColor: c.down, borderVisible: false, wickUpColor: c.up, wickDownColor: c.down });
      if (S === LW.BarSeries) Object.assign(o, { upColor: c.up, downColor: c.down, thinBars: false });
      if (S === LW.LineSeries) Object.assign(o, { color: c.acc, lineWidth: 2 });
      if (S === LW.AreaSeries) Object.assign(o, { lineColor: c.acc, topColor: alpha(c.acc, "55"), bottomColor: alpha(c.acc, "05"), lineWidth: 2 });
      if (S === LW.BaselineSeries) Object.assign(o, { baseValue: { type: "price", price: bars[0] ? bars[0].close : 0 }, topLineColor: c.up, bottomLineColor: c.down,
        topFillColor1: alpha(c.up, "44"), topFillColor2: alpha(c.up, "05"), bottomFillColor1: alpha(c.down, "05"), bottomFillColor2: alpha(c.down, "44") });
      const s = chart.addSeries(S, o, 0);
      s.setData(S === LW.CandlestickSeries || S === LW.BarSeries ? bars : bars.map(b => ({ time: b.time, value: b.close })));
      return s;
    }

    function addLine(bars, ln, pane) {
      const s = ln.kind === "hist"
        ? chart.addSeries(LW.HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane)
        : chart.addSeries(LW.LineSeries, { color: ln.color, lineWidth: ln.width || (opt.compact ? 1 : 2), lineStyle: ln.dash ? LW.LineStyle.Dashed : LW.LineStyle.Solid,
          lineVisible: ln.kind !== "dots", pointMarkersVisible: ln.kind === "dots", pointMarkersRadius: 1.5, priceLineVisible: false, lastValueVisible: !opt.compact, crosshairMarkerVisible: false }, pane);
      const data = pts(bars, ln.values);
      if (ln.colors) data.forEach((d, i) => { if ("value" in d) d.color = ln.colors[i]; });
      s.setData(data);
      return s;
    }

    // s = { bars, type, scale: "normal"|"log"|"pct", volume, inds (Indicators.compute), intraday, from (first visible index), keep, compare: { name, bars } }
    function render(s) {
      const keep = s.keep && chart ? chart.timeScale().getVisibleLogicalRange() : null;
      if (chart) chart.remove();
      // Own copy: updateLast() appends today's bar and the mini + full charts share the controller's array.
      const c = css(), src = s.bars.slice(), bars = s.type === "ha" ? ChartRange.heikinAshi(src) : src;
      chart = LW.createChart(el, {
        autoSize: true,
        layout: { background: { type: "solid", color: c.bg }, textColor: c.muted, fontSize: 11, panes: { separatorColor: c.line } },
        grid: { vertLines: { color: alpha(c.line, "55") }, horzLines: { color: alpha(c.line, "55") } },
        rightPriceScale: { borderColor: c.line, mode: { normal: 0, log: 1, pct: 2 }[s.scale] ?? 0 },
        timeScale: { borderColor: c.line, timeVisible: s.intraday, secondsVisible: false, rightOffset: 4 },
        crosshair: { mode: LW.CrosshairMode.Normal },
        localization: { locale: "en-US", priceFormatter: fmtPrice },
      });
      last = { bars, raw: src, inds: s.inds, type: s.type };
      main = mainSeries(s.type, bars, c);
      main.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: s.volume ? 0.24 : 0.06 } });
      vol = null;
      if (s.volume) {
        vol = chart.addSeries(LW.HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false }, 0);
        vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        vol.setData(s.bars.map(b => ({ time: b.time, value: b.volume, color: alpha(b.close >= b.open ? c.up : c.down, "66") })));
      }
      if (s.compare && s.compare.bars.length) {
        const cmp = chart.addSeries(LW.LineSeries, { color: "#eab308", lineWidth: 2, priceLineVisible: false, title: s.compare.name }, 0);
        cmp.setData(s.compare.bars.map(b => ({ time: b.time, value: b.close })));
      }
      let pane = 0;
      overlays = [];
      for (const ind of s.inds) {
        if (ind.def.pane === "own" && opt.compact) continue;
        const p = ind.def.pane === "own" ? ++pane : 0;
        const series = ind.lines.map(ln => addLine(bars, ln, p));
        overlays.push(...ind.lines.map((ln, i) => ({ ln, s: series[i] })));
        if (p && ind.def.levels) for (const lv of ind.def.levels) series[series.length - 1].createPriceLine({ price: lv, color: c.muted, lineWidth: 1, lineStyle: LW.LineStyle.Dotted, axisLabelVisible: false });
      }
      // Price pane keeps ≥ half the height however many oscillator panes are open.
      const panes = chart.panes();
      panes.forEach((pn, i) => pn.setStretchFactor(i ? 1 : Math.max(3, panes.length - 1)));
      chart.subscribeCrosshairMove(p => legend(p.time));
      if (keep) chart.timeScale().setVisibleLogicalRange(keep);
      else chart.timeScale().setVisibleLogicalRange({ from: s.from, to: bars.length + 3 });
      legend(null);
    }

    function legend(time) {
      if (!opt.legend || !last || !last.bars.length) return;
      const bars = last.bars;
      let i = time == null ? bars.length - 1 : bars.findIndex(b => b.time === time);
      if (i < 0) i = bars.length - 1;
      const b = last.raw[i], prev = last.raw[i - 1], chg = prev ? (b.close - prev.close) / prev.close * 100 : 0, tone = chg > 0 ? "up" : chg < 0 ? "down" : "ref";
      const vals = overlays.filter(o => o.ln.kind !== "hist" && o.ln.values[i] != null).map(o => `<span style="color:${o.ln.color}">${Dom.esc(o.ln.title)} ${fmtPrice(o.ln.values[i])}</span>`);
      opt.legend.innerHTML = `<span>O <b class="${tone}">${fmtPrice(b.open)}</b> H <b class="${tone}">${fmtPrice(b.high)}</b> L <b class="${tone}">${fmtPrice(b.low)}</b> C <b class="${tone}">${fmtPrice(b.close)}</b>`
        + ` <b class="${tone}">${Fmt.signed(chg)}%</b> V <b>${Fmt.big(b.volume)}</b></span>${opt.compact ? "" : vals.join("")}`;
    }

    // Live tick for the last daily bar (open / high / low / last / volume from the board quote).
    function updateLast(bar) {
      if (!main || !last || !last.raw.length) return;
      const raw = last.raw, tail = raw[raw.length - 1];
      if (bar.time < tail.time) return;
      if (bar.time === tail.time) raw[raw.length - 1] = bar; else raw.push(bar);
      if (last.type === "ha") return;
      main.update(last.type === "candle" || last.type === "bar" ? bar : { time: bar.time, value: bar.close });
      if (vol) vol.update({ time: bar.time, value: bar.volume, color: alpha(bar.close >= bar.open ? css().up : css().down, "66") });
      legend(null);
    }

    return {
      render, legend, updateLast,
      main: () => main, chart: () => chart,
      fit: () => chart && chart.timeScale().fitContent(),
      screenshot: () => chart && chart.takeScreenshot(),
      destroy: () => { if (chart) chart.remove(); chart = main = vol = last = null; },
    };
  }

  return { create, fmtPrice };
})();
