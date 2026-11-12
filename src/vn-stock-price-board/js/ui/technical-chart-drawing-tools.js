// Drawing tools on the full chart: horizontal line, trend line, Fibonacci retracement, measure. Kept per symbol in memory, redrawn after every render.
const ChartDraw = (() => {
  const FIB = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const TWO_CLICK = new Set(["t", "f", "m"]);

  function create() {
    let tool = "", pending = null, items = [];

    function apply(view) {
      const chart = view.chart(), main = view.main(), LW = globalThis.LightweightCharts;
      if (!chart || !main) return;
      for (const d of items) {
        if (d.type === "h") main.createPriceLine({ price: d.price, color: "#2563eb", lineWidth: 1, lineStyle: LW.LineStyle.Solid, axisLabelVisible: true, title: "" });
        if (d.type === "f") FIB.forEach(f => main.createPriceLine({ price: d.b.price - (d.b.price - d.a.price) * f, color: "#9333ea", lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: true, title: `${(f * 100).toFixed(1)}%` }));
        if (d.type === "t" || d.type === "m") {
          const [a, b] = [d.a, d.b].sort((x, y) => x.time - y.time);
          if (a.time === b.time) continue;
          const s = chart.addSeries(LW.LineSeries, { color: d.type === "t" ? "#f97316" : "#64748b", lineWidth: 2, lineStyle: d.type === "m" ? LW.LineStyle.Dashed : LW.LineStyle.Solid,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, 0);
          s.setData([{ time: a.time, value: a.price }, { time: b.time, value: b.price }]);
        }
      }
    }

    // Returns a status message key + params for the chart footer, or null.
    function click(pt, bars) {
      if (!tool || !Number.isFinite(pt.price)) return null;
      if (tool === "h") { items.push({ type: "h", price: pt.price }); return { key: "Đã thêm đường ngang tại {p}.", p: { p: TechChart.fmtPrice(pt.price) }, redraw: true }; }
      if (!pending) { pending = pt; return { key: "Chọn điểm thứ 2." }; }
      const a = pending, b = pt;
      pending = null;
      items.push({ type: tool, a, b });
      if (tool !== "m") return { key: "Đã vẽ.", redraw: true };
      const i = bars.findIndex(x => x.time === a.time), j = bars.findIndex(x => x.time === b.time), pct = (b.price - a.price) / a.price * 100;
      return { key: "Đo: {d} ({pct}%) qua {n} nến.", p: { d: Fmt.signed(b.price - a.price), pct: Fmt.signed(pct), n: Math.abs(j - i) }, redraw: true };
    }

    return {
      apply, click,
      setTool: t => { tool = tool === t ? "" : t; pending = null; return tool; },
      tool: () => tool, needsTwo: () => TWO_CLICK.has(tool),
      clear: () => { items = []; pending = null; },
      count: () => items.length,
    };
  }

  return { create };
})();
