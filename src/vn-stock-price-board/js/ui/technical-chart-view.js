// Lightweight Charts wrapper: price series (6 types), volume, overlay + own-pane indicators, crosshair legend, click → drawing tools.
const TechChart = (() => {
  const css = () => { const s = getComputedStyle(document.documentElement), v = n => s.getPropertyValue(n).trim(); return { bg: v("--panel"), ink: v("--ink"), muted: v("--muted"), line: v("--line"), up: v("--up"), down: v("--down"), acc: v("--acc") }; };
  const alpha = (hex, a) => /^#[0-9a-f]{6}$/i.test(hex) ? hex + a : hex;
  const CMP_COLORS = ["#eab308", "#ec4899", "#8b5cf6", "#06b6d4", "#84cc16"];
  let fmtPrice = p => Math.abs(p) >= 1e6 ? (p < 0 ? "-" : "") + Fmt.big(Math.abs(p)) : Math.abs(p) >= 1000 ? Fmt.en(p, 2) : p.toFixed(2);
  const pts = (bars, values) => values.map((v, i) => v == null || !Number.isFinite(v) ? { time: bars[i].time } : { time: bars[i].time, value: v });

  // opt: { legend: HTMLElement, tip?: HTMLElement (full chart help box), onClick(point), compact }
  function create(el, opt) {
    const LW = globalThis.LightweightCharts;
    let chart = null, main = null, vol = null, last = null, overlays = [], paneInds = [], evByTime = new Map(), ptr = null, crosses = [];
    const box = el.parentElement, PRICE_MIN = 340, PANE_MIN = 130;
    // Full chart: every indicator pane keeps ≥ PANE_MIN px; when they don't fit, the host grows and the box scrolls.
    function fitPanes() {
      if (!chart) return;
      const panes = chart.panes(), n = panes.length - 1, need = PRICE_MIN + n * PANE_MIN, scroll = !opt.compact && n > 0 && box.clientHeight < need;
      el.style.height = scroll ? `${need}px` : "";
      panes.forEach((pn, i) => pn.setStretchFactor(scroll ? (i ? PANE_MIN : PRICE_MIN) : (i ? 1 : Math.max(3, n))));
      if (tags) requestAnimationFrame(() => requestAnimationFrame(paneTags));
    }
    // Name tag at the top-left of each indicator pane, so scrolled-down panes stay identifiable.
    const tags = opt.compact ? null : box.appendChild(Object.assign(document.createElement("div"), { className: "pane-tags" }));
    function paneTags() {
      if (!chart) { tags.innerHTML = ""; return; }
      let top = 0;
      tags.innerHTML = chart.panes().map((pn, i) => {
        const at = top, ind = paneInds[i];
        top += pn.getHeight() + 1;
        return i && ind ? `<span style="top:${at + 2}px" title="${Dom.esc(ChartHelp.desc(ind.id))}">${ind.lines.filter(l => l.kind !== "hist").map(l => `<b style="color:${l.color}">${Dom.esc(l.title)}</b>`).join(" ")}</span>` : "";
      }).join("");
    }
    if (!opt.compact) {
      new ResizeObserver(fitPanes).observe(box);
      // Wheel over an indicator pane scrolls the panes (the price pane still zooms); capture runs before the library's own handler.
      el.addEventListener("wheel", e => {
        if (!chart || e.ctrlKey || box.scrollHeight <= box.clientHeight || e.clientY - el.getBoundingClientRect().top <= chart.panes()[0].getHeight()) return;
        e.preventDefault(); e.stopPropagation(); box.scrollTop += e.deltaY;
      }, { capture: true, passive: false });
    }
    const track = e => { const r = el.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    el.addEventListener("pointermove", track);
    el.addEventListener("pointerdown", track);
    el.addEventListener("pointerleave", e => { if (e.pointerType === "touch") return; ptr = null; if (opt.tip) opt.tip.hidden = true; });

    // Native click → bar + price: the library drops a quick 2nd click at another spot (double-click guard), drawing needs every click.
    // A short tap never moves the library's crosshair, so a touch tap opens the help box itself.
    let down = null;
    el.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" }; });
    el.addEventListener("click", e => {
      if (!chart || !last || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const i = Math.round(chart.timeScale().coordinateToLogical(x) ?? -1), b = last.bars[Math.min(i, last.bars.length - 1)];
      if (i < 0 || !b) return;
      if (down.touch) tip(b.time);
      if (!opt.onClick || y > chart.panes()[0].getHeight()) return;
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

    // s = { bars, type, scale: "normal"|"log"|"pct", volume, inds (Indicators.compute), intraday, from (first visible index), keep, compare: [{ name, bars }] }
    function render(s) {
      const keep = s.keep && chart ? chart.timeScale().getVisibleLogicalRange() : null;
      if (chart) chart.remove();
      // Own copy: updateLast() appends today's bar and the mini + full charts share the controller's array.
      const c = css(), src = s.bars.slice(), bars = s.type === "ha" ? ChartRange.heikinAshi(src) : src;
      chart = LW.createChart(el, {
        autoSize: true,
        layout: { background: { type: "solid", color: c.bg }, textColor: c.muted, fontSize: 11, panes: { separatorColor: c.line } },
        grid: { vertLines: { color: alpha(c.line, "55") }, horzLines: { color: alpha(c.line, "55") } },
        rightPriceScale: { borderColor: c.line },
        timeScale: { borderColor: c.line, timeVisible: s.intraday, secondsVisible: false, rightOffset: 4 },
        crosshair: { mode: LW.CrosshairMode.Normal },
        handleScroll: { vertTouchDrag: !!opt.compact },
        localization: { locale: "en-US", priceFormatter: fmtPrice },
      });
      last = { bars, raw: src, inds: s.inds, type: s.type };
      main = mainSeries(s.type, bars, c);
      // Log / % mode only on the price pane: oscillator panes (RSI, MACD…) keep their own linear scale.
      main.priceScale().applyOptions({ mode: { normal: 0, log: 1, pct: 2 }[s.scale] ?? 0, scaleMargins: { top: 0.08, bottom: s.volume ? 0.24 : 0.06 } });
      vol = null;
      if (s.volume) {
        vol = chart.addSeries(LW.HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, priceLineVisible: false, lastValueVisible: false }, 0);
        vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        vol.setData(s.bars.map(b => ({ time: b.time, value: b.volume, color: alpha(b.close >= b.open ? c.up : c.down, "66") })));
      }
      (s.compare || []).forEach((c, i) => {
        const cmp = chart.addSeries(LW.LineSeries, { color: CMP_COLORS[i % CMP_COLORS.length], lineWidth: 2, priceLineVisible: false, title: c.name }, 0);
        cmp.setData(c.bars.map(b => ({ time: b.time, value: b.close })));
      });
      let pane = 0;
      overlays = []; paneInds = [];
      const indSer = [];
      for (const [k, ind] of s.inds.entries()) {
        if (ind.def.pane === "own" && opt.compact) continue;
        const p = ind.def.pane === "own" ? ++pane : 0;
        const series = ind.lines.map(ln => addLine(bars, ln, p));
        indSer[k] = { series, p };
        overlays.push(...ind.lines.map((ln, i) => ({ ln, s: series[i], id: ind.id })));
        if (p) { series[0].priceScale().applyOptions({ mode: 0 }); paneInds[p] = ind; }
        if (p && ind.def.levels) for (const lv of ind.def.levels) series[series.length - 1].createPriceLine({ price: lv, color: c.muted, lineWidth: 1, lineStyle: LW.LineStyle.Dotted, axisLabelVisible: false });
      }
      // Price pane keeps ≥ half the height when the panes fit; otherwise fixed minimum heights + scrolling.
      fitPanes();
      // Full chart: mark peaks / troughs / crosses / signal points; hovering a marked bar explains it.
      evByTime = new Map();
      if (!opt.compact) {
        const evs = ChartEvents.detect(s.bars, s.inds, s.from).filter(ev => s.peaks !== false || !/^swing/.test(ev.kind));
        for (const ev of evs) (evByTime.get(ev.time) || evByTime.set(ev.time, []).get(ev.time)).push(ev);
        LW.createSeriesMarkers(main, evs.map(ev => ({ time: ev.time, position: ev.pos === "above" ? "aboveBar" : "belowBar",
          color: ev.tone === "up" ? c.up : ev.tone === "down" ? c.down : "#eab308", text: ChartHelp.short(ev.kind),
          ...(ChartHelp.major(ev.kind) ? { shape: ev.pos === "above" ? "arrowDown" : "arrowUp" } : { shape: "circle", size: 0.4 }) })));
      }
      crosses = opt.compact || !s.crosses ? [] : ChartCrosses.detect(s.bars, s.inds, s.from).filter(x => indSer[x.ind]).map(x => ({ ...x, pane: indSer[x.ind].p, s: indSer[x.ind].series[x.line] }));
      if (crosses.length) ChartCrossUI.mark(LW, crosses, c);
      chart.subscribeCrosshairMove(p => { legend(p.time); tip(p.time); });
      if (keep) chart.timeScale().setVisibleLogicalRange(keep);
      else chart.timeScale().setVisibleLogicalRange({ from: s.from, to: bars.length + 3 });
      legend(null);
    }

    const paneAt = y => { let top = 0; const ps = chart.panes(); for (let k = 0; k < ps.length; k++) { top += ps[k].getHeight() + 1; if (y < top) return k; } return -1; };
    // Help box near the cursor: marked events on the price pane, or the hovered indicator pane's meaning + reading.
    function tip(time) {
      if (!opt.tip) return;
      if (time == null || !ptr || !last || !chart) { opt.tip.hidden = true; return; }
      const pi = paneAt(ptr.y), i = last.bars.findIndex(b => b.time === time), ind = pi > 0 ? paneInds[pi] : null;
      const pane = ind ? { id: ind.id, name: ind.def.name, reading: i >= 0 ? ChartHelp.interp(ind.id, ind.lines.map(l => l.values[i])) : "" } : null;
      // A cross dot counts as hovered within 16 px of it (crosshair already snaps to its bar).
      const top = chart.panes().slice(0, pi).reduce((t, pn) => t + pn.getHeight() + 1, 0);
      const hits = crosses.filter(x => x.pane === pi && x.time === time && Math.abs(top + (x.s.priceToCoordinate(x.price) ?? -99) - ptr.y) <= 16);
      const html = (hits.length ? ChartCrossUI.html(hits) : "") + ChartHelp.tipHtml(pi === 0 ? evByTime.get(time) || [] : [], pane);
      if (!html) { opt.tip.hidden = true; return; }
      opt.tip.innerHTML = html; opt.tip.hidden = false;
      const w = el.clientWidth, tw = opt.tip.offsetWidth, th = opt.tip.offsetHeight;
      opt.tip.style.left = `${ptr.x + 16 + tw > w ? Math.max(4, ptr.x - tw - 16) : ptr.x + 16}px`;
      opt.tip.style.top = `${Math.max(4, Math.min(el.clientHeight - th - 4, ptr.y + 16))}px`;
    }

    function legend(time) {
      if (!opt.legend || !last || !last.bars.length) return;
      const bars = last.bars;
      let i = time == null ? bars.length - 1 : bars.findIndex(b => b.time === time);
      if (i < 0) i = bars.length - 1;
      const b = last.raw[i], prev = last.raw[i - 1], chg = prev ? (b.close - prev.close) / prev.close * 100 : 0, tone = chg > 0 ? "up" : chg < 0 ? "down" : "ref";
      const vals = overlays.filter(o => o.ln.kind !== "hist" && o.ln.values[i] != null).map(o => `<span style="color:${o.ln.color}" title="${Dom.esc(ChartHelp.desc(o.id))}">${Dom.esc(o.ln.title)} ${fmtPrice(o.ln.values[i])}</span>`);
      opt.legend.innerHTML = `<span title="${Dom.esc(ChartHelp.desc("price"))}">O <b class="${tone}">${fmtPrice(b.open)}</b> H <b class="${tone}">${fmtPrice(b.high)}</b> L <b class="${tone}">${fmtPrice(b.low)}</b> C <b class="${tone}">${fmtPrice(b.close)}</b>`
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
      scrolls: () => !!el.style.height,
      screenshot: () => chart && chart.takeScreenshot(),
      destroy: () => { if (chart) chart.remove(); chart = main = vol = last = null; crosses = []; el.style.height = ""; if (tags) tags.innerHTML = ""; },
    };
  }

  // setPriceFormat: a tool whose prices need other decimals (crypto < $1) swaps the page-wide formatter before the first render.
  return { create, fmtPrice: p => fmtPrice(p), setPriceFormat: f => { fmtPrice = f; } };
})();
