// Toolbar markup for the technical chart: compact (detail pane) and full (dialog) variants + indicator chips. Events: data-c attribute.
const ChartBar = (() => {
  const TYPES = [["candle", "Nến"], ["ha", "Heikin-Ashi"], ["bar", "OHLC"], ["line", "Đường"], ["area", "Vùng"], ["baseline", "Baseline"]];
  const SCALES = [["normal", "Thang giá"], ["log", "Thang log"], ["pct", "Thang % thay đổi"]];
  const LAYOUTS = [["1", "▢ 1 biểu đồ"], ["2", "▥ 2 biểu đồ"], ["4", "▦ 4 biểu đồ"]];
  const TOOLS = [["h", "─", "Đường ngang: bấm 1 điểm"], ["t", "╱", "Đường xu hướng: bấm 2 điểm"], ["f", "Fib", "Fibonacci thoái lui: bấm đỉnh/đáy rồi điểm còn lại"], ["m", "📏", "Đo % thay đổi giữa 2 điểm"]];
  const e = s => Dom.esc(s);
  const opts = (list, v) => list.map(([k, label]) => `<option value="${k}"${k === v ? " selected" : ""}>${e(T(label))}</option>`).join("");
  const intervalOpts = s => ChartRange.INTERVALS.map(i => `<option value="${i.k}"${i.k === s.interval ? " selected" : ""}${ChartRange.valid(s.range, i.k) ? "" : " disabled"}>${i.k}</option>`).join("");

  // Range + candle interval selects, shared by the compact and full toolbars.
  const timeSels = s => `<select data-c="range" title="${e(T("Khoảng thời gian"))}">${ChartRange.RANGES.map(r => `<option value="${r.k}"${r.k === s.range ? " selected" : ""}>${e(T(r.label))}</option>`).join("")}</select>`
    + `<select data-c="interval" title="${e(T("Khung nến"))}">${intervalOpts(s)}</select>`;

  function compact(s) {
    return timeSels(s)
      + `<select data-c="type" title="${e(T("Kiểu biểu đồ"))}">${opts(TYPES, s.type)}</select>`
      + `<button data-c="open" class="chart-btn" title="${e(T("Mở biểu đồ kỹ thuật toàn màn hình"))}">📊 Full</button>`;
  }

  function full(s, tool) {
    return `<details class="indmenu"><summary title="${e(T("Bật / tắt chỉ báo kỹ thuật"))}">${e(T("+ Chỉ báo…"))}</summary><div class="indpanel">`
      + `<span class="indnote">★ ${e(T("Chỉ báo quan trọng, dùng phổ biến nhất"))}</span><label title="${e(T("Hiện / ẩn nhãn Đỉnh, Đáy trên biểu đồ giá"))}"><input type="checkbox" data-c="peaks"${s.peaks ? " checked" : ""}> ${e(T("Đánh dấu Đỉnh / Đáy"))}</label>`
      + `<label title="${e(T("Chấm tại chỗ các đường cắt nhau (MA, MACD, RSI 70/30, +DI/−DI…); rê chuột hoặc chạm vào chấm để xem giải thích"))}"><input type="checkbox" data-c="crosses"${s.crosses ? " checked" : ""}> <span class="xdot">●</span> ${e(T("Điểm giao cắt quan trọng"))}</label><b>${e(T("Trên biểu đồ giá"))}</b>${addOpts("main", s.ind)}<b>${e(T("Khung riêng"))}</b>${addOpts("own", s.ind)}</div></details>`
      + timeSels(s)
      + `<select data-c="type" title="${e(T("Kiểu biểu đồ"))}">${opts(TYPES, s.type)}</select>`
      + `<select data-c="scale" title="${e(T("Thang giá"))}">${opts(SCALES, s.scale)}</select>`
      + `<select data-c="layout" title="${e(T("Bố cục: thêm biểu đồ phụ, mỗi ô tự chọn mã và khung nến"))}">${opts(LAYOUTS, String(s.layout))}</select>`
      + `<label class="chk"><input type="checkbox" data-c="volume"${s.volume ? " checked" : ""}>${e(T("Khối lượng"))}</label>`
      + `<label class="chk" title="${e(T("So sánh tối đa 5 mã hoặc chỉ số, cách nhau bằng dấu phẩy (thang % thay đổi)"))}">${e(T("So sánh"))}<input type="text" class="cmpin" data-c="cmp" value="${e(s.cmp.join(", "))}" placeholder="VNINDEX, VCB…" spellcheck="false" autocomplete="off"></label>`
      + `<span class="seg tools">${TOOLS.map(([k, icon, tip]) => `<button data-c="tool" data-v="${k}" title="${e(T(tip))}"${k === tool ? ' class="on"' : ""}>${icon}</button>`).join("")}`
      + `<button data-c="clearDraw" title="${e(T("Xoá mọi hình vẽ"))}">🗑</button></span>`
      + `<button data-c="fit" title="${e(T("Xem toàn bộ dữ liệu"))}">⤢</button>`
      + `<button data-c="png" title="${e(T("Tải ảnh PNG của biểu đồ"))}">📷 PNG</button>`;
  }
  // Checked = shown on the chart; (n) when the same indicator is on with several parameter sets.
  const addOpts = (pane, list) => Object.entries(Indicators.DEFS).filter(([, d]) => d.pane === pane).map(([k, d]) => {
    const n = list.filter(x => x.id === k).length, core = Indicators.CORE.includes(k);
    return `<div class="indrow${core ? " core" : ""}" title="${e(ChartHelp.desc(k))}"><label><input type="checkbox" data-c="toggleInd" value="${k}"${n ? " checked" : ""}> <b>${core ? "★ " : ""}${Dom.esc(d.name)}</b>${n > 1 ? ` (${n})` : ""} <span class="muted">${e(T(d.label))}</span></label>`
      + `<button type="button" class="qbtn" data-c="indHelp" data-v="${k}" title="${e(T("Hướng dẫn chi tiết: cách đọc, ví dụ, cách phối hợp"))}">?</button></div>`;
  }).join("");

  function chips(list) {
    return list.map((x, i) => {
      const d = Indicators.DEFS[x.id];
      const inputs = d.params.map(q => `<input type="number" data-c="param" data-i="${i}" data-k="${q.k}" value="${x.p[q.k]}" min="${q.min}" max="${q.max}" step="${q.step}" title="${Dom.esc(q.k)}">`).join("");
      return `<span class="ichip" title="${e(T(d.label))}"><b>${Dom.esc(d.name)}</b>${inputs}<button data-c="rm" data-i="${i}" title="${e(T("Bỏ chỉ báo"))}">✕</button></span>`;
    }).join("");
  }

  return { compact, full, chips };
})();
