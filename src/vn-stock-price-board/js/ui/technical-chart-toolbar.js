// Toolbar markup for the technical chart: compact (detail pane) and full (dialog) variants + indicator chips. Events: data-c attribute.
const ChartBar = (() => {
  const TYPES = [["candle", "Nến"], ["ha", "Heikin-Ashi"], ["bar", "OHLC"], ["line", "Đường"], ["area", "Vùng"], ["baseline", "Baseline"]];
  const SCALES = [["normal", "Thang giá"], ["log", "Thang log"], ["pct", "Thang % thay đổi"]];
  const TOOLS = [["h", "─", "Đường ngang: bấm 1 điểm"], ["t", "╱", "Đường xu hướng: bấm 2 điểm"], ["f", "Fib", "Fibonacci thoái lui: bấm đỉnh/đáy rồi điểm còn lại"], ["m", "📏", "Đo % thay đổi giữa 2 điểm"]];
  const e = s => Dom.esc(s);
  const opts = (list, v) => list.map(([k, label]) => `<option value="${k}"${k === v ? " selected" : ""}>${e(T(label))}</option>`).join("");
  const intervalOpts = s => ChartRange.INTERVALS.map(i => `<option value="${i.k}"${i.k === s.interval ? " selected" : ""}${ChartRange.valid(s.range, i.k) ? "" : " disabled"}>${i.k}</option>`).join("");

  function compact(s) {
    return `<select data-c="range" title="${e(T("Khoảng thời gian"))}">${ChartRange.RANGES.map(r => `<option value="${r.k}"${r.k === s.range ? " selected" : ""}>${e(T(r.label))}</option>`).join("")}</select>`
      + `<select data-c="interval" title="${e(T("Khung nến"))}">${intervalOpts(s)}</select>`
      + `<select data-c="type" title="${e(T("Kiểu biểu đồ"))}">${opts(TYPES, s.type)}</select>`
      + `<button data-c="open" class="chart-btn" title="${e(T("Mở biểu đồ kỹ thuật toàn màn hình"))}">📊 Full</button>`;
  }

  function full(s, tool) {
    const seg = (key, list, cur, ok = () => true) => `<span class="seg" role="group">${list.map(([k, label]) =>
      `<button data-c="${key}" data-v="${k}"${k === cur ? ' class="on"' : ""}${ok(k) ? "" : " disabled"}>${Dom.esc(label)}</button>`).join("")}</span>`;
    return seg("range", ChartRange.RANGES.map(r => [r.k, r.k === "ALL" ? T(r.label) : r.k]), s.range)
      + seg("interval", ChartRange.INTERVALS.map(i => [i.k, i.k]), s.interval, k => ChartRange.valid(s.range, k))
      + `<select data-c="type" title="${e(T("Kiểu biểu đồ"))}">${opts(TYPES, s.type)}</select>`
      + `<select data-c="scale" title="${e(T("Thang giá"))}">${opts(SCALES, s.scale)}</select>`
      + `<label class="chk"><input type="checkbox" data-c="volume"${s.volume ? " checked" : ""}>${e(T("Khối lượng"))}</label>`
      + `<label class="chk" title="${e(T("Vẽ thêm VNINDEX để so sánh (thang % thay đổi)"))}"><input type="checkbox" data-c="compare"${s.compare ? " checked" : ""}>${e(T("So với VNINDEX"))}</label>`
      + `<select data-c="add" title="${e(T("Thêm chỉ báo kỹ thuật"))}"><option value="">${e(T("+ Chỉ báo…"))}</option>`
      + `<optgroup label="${e(T("Trên biểu đồ giá"))}">${addOpts("main")}</optgroup><optgroup label="${e(T("Khung riêng"))}">${addOpts("own")}</optgroup></select>`
      + `<span class="seg tools">${TOOLS.map(([k, icon, tip]) => `<button data-c="tool" data-v="${k}" title="${e(T(tip))}"${k === tool ? ' class="on"' : ""}>${icon}</button>`).join("")}`
      + `<button data-c="clearDraw" title="${e(T("Xoá mọi hình vẽ"))}">🗑</button></span>`
      + `<button data-c="fit" title="${e(T("Xem toàn bộ dữ liệu"))}">⤢</button>`
      + `<button data-c="png" title="${e(T("Tải ảnh PNG của biểu đồ"))}">📷 PNG</button>`;
  }
  const addOpts = pane => Object.entries(Indicators.DEFS).filter(([, d]) => d.pane === pane).map(([k, d]) => `<option value="${k}">${Dom.esc(d.name)} — ${e(T(d.label))}</option>`).join("");

  function chips(list) {
    return list.map((x, i) => {
      const d = Indicators.DEFS[x.id];
      const inputs = d.params.map(q => `<input type="number" data-c="param" data-i="${i}" data-k="${q.k}" value="${x.p[q.k]}" min="${q.min}" max="${q.max}" step="${q.step}" title="${Dom.esc(q.k)}">`).join("");
      return `<span class="ichip" title="${e(T(d.label))}"><b>${Dom.esc(d.name)}</b>${inputs}<button data-c="rm" data-i="${i}" title="${e(T("Bỏ chỉ báo"))}">✕</button></span>`;
    }).join("");
  }

  return { compact, full, chips };
})();
