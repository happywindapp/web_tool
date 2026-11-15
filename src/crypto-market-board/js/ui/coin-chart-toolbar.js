// Toolbar markup of the coin chart: range × candle interval (like the stock board), chart type / scale, indicator picker with
// checkboxes (checked = shown), indicator chips, drawing tools. Events: data-c attribute.
const CoinBar = (() => {
  const INTERVALS = [["1m", "1m", 1], ["5m", "5m", 5], ["15m", "15m", 15], ["1h", "1h", 60], ["4h", "4h", 240], ["1d", "1D", 1440], ["1w", "1W", 10080], ["1M", "1M", 43200]];
  const RANGES = [["1D", 1, "1 ngày"], ["1W", 7, "1 tuần"], ["1M", 31, "1 tháng"], ["3M", 92, "3 tháng"], ["1Y", 366, "1 năm"], ["3Y", 1096, "3 năm"], ["5Y", 1827, "5 năm"], ["10Y", 3653, "10 năm"], ["ALL", 0, "Tất cả"]];
  const DEFAULT = { "1D": "5m", "1W": "1h", "1M": "4h", "3M": "1d", "1Y": "1d", "3Y": "1w", "5Y": "1w", "10Y": "1M", ALL: "1M" };
  const TYPES = [["candle", "Nến"], ["ha", "Heikin-Ashi"], ["bar", "OHLC"], ["line", "Đường"], ["area", "Vùng"], ["baseline", "Baseline"]];
  const SCALES = [["normal", "Thang giá"], ["log", "Thang log"], ["pct", "Thang % thay đổi"]];
  const TOOLS = [["h", "─", "Đường ngang: bấm 1 điểm"], ["t", "╱", "Đường xu hướng: bấm 2 điểm"], ["f", "Fib", "Fibonacci thoái lui: bấm đỉnh/đáy rồi điểm còn lại"], ["m", "📏", "Đo % thay đổi giữa 2 điểm"]];
  const MAX_BARS = 5000;
  const e = s => Dom.esc(s);
  const minutes = iv => (INTERVALS.find(i => i[0] === iv) || INTERVALS[5])[2];
  const days = rk => (RANGES.find(r => r[0] === rk) || RANGES[4])[1];
  // Bars needed to cover the range (ALL = as many as the source has, capped).
  const need = (rk, iv) => days(rk) ? Math.ceil(days(rk) * 1440 / minutes(iv)) : MAX_BARS;
  const valid = (rk, iv) => !days(rk) ? minutes(iv) >= 1440 : need(rk, iv) <= MAX_BARS && need(rk, iv) >= 6;
  const fix = (rk, iv) => valid(rk, iv) ? iv : DEFAULT[rk] || "1d";
  const opts = (list, v, tr = true) => list.map(([k, label]) => `<option value="${k}"${k === v ? " selected" : ""}>${e(tr ? T(label) : label)}</option>`).join("");

  const rangeOpts = s => RANGES.map(([k, , l]) => `<option value="${k}"${k === s.range ? " selected" : ""}>${e(T(l))}</option>`).join("");
  const ivOpts = s => INTERVALS.map(([k, l]) => `<option value="${k}"${k === s.interval ? " selected" : ""}${valid(s.range, k) ? "" : " disabled"}>${l}</option>`).join("");
  const compact = s => `<select data-c="range" title="${e(T("Khoảng thời gian"))}">${rangeOpts(s)}</select><select data-c="interval" title="${e(T("Khung nến"))}">${ivOpts(s)}</select>`
    + `<select data-c="type" title="${e(T("Kiểu biểu đồ"))}">${opts(TYPES, s.type)}</select>`
    + `<button data-c="open" class="chart-btn" title="${e(T("Mở biểu đồ kỹ thuật toàn màn hình"))}">📊 Full</button>`;

  // Checkbox list: checked = at least one instance on the chart; core indicators (★) first and highlighted; "?" opens the full guide.
  function picker(s, open) {
    const on = new Set(s.ind.map(x => x.id)), imp = k => IND_IMPORTANT.includes(k);
    const item = ([k, d]) => `<div class="ipi${imp(k) ? " imp" : ""}"><label><input type="checkbox" data-c="ind" value="${k}"${on.has(k) ? " checked" : ""}>`
      + `<span class="ipt"><b>${e(d.name)}</b>${imp(k) ? ` <i class="ipstar" title="${e(T("Chỉ báo quan trọng, nên dùng trước"))}">★</i>` : ""} <span>${e(T(d.label))}</span><em>${e(ChartHelp.desc(k))}</em></span></label>`
      + `<button class="iq" data-c="guide" data-v="${k}" title="${e(T("Giải thích chi tiết, ví dụ minh hoạ và cách phối hợp"))}">?</button></div>`;
    const group = (pane, title) => `<div class="ipg"><b>${e(T(title))}</b>` + Object.entries(Indicators.DEFS).filter(([, d]) => d.pane === pane && !d.intraday)
      .sort((a, b) => imp(b[0]) - imp(a[0])).map(item).join("") + `</div>`;
    const main = group("main", "Trên biểu đồ giá"), own = group("own", "Khung riêng");
    const peaks = `<div class="ipi ipk"><label><input type="checkbox" data-c="peaks"${s.peaks ? " checked" : ""}><span class="ipt"><b>${e(T("Đánh dấu Đỉnh / Đáy"))}</b><em>${e(T("Hiện / ẩn nhãn Đỉnh, Đáy trên biểu đồ giá"))}</em></span></label></div>`
      + `<div class="ipi ipk"><label><input type="checkbox" data-c="crosses"${s.crosses ? " checked" : ""}><span class="ipt"><b><span class="xdot">●</span> ${e(T("Điểm giao cắt quan trọng"))}</b>`
      + `<em>${e(T("Chấm tại chỗ các đường cắt nhau (MA, MACD, RSI 70/30, +DI/−DI…); rê chuột hoặc chạm vào chấm để xem giải thích"))}</em></span></label></div>`;
    return `<details class="ipick"${open ? " open" : ""}><summary title="${e(T("Bật / tắt chỉ báo kỹ thuật"))}">${e(T("+ Chỉ báo…"))} <span class="badge">${s.ind.length}</span></summary>`
      + `<div class="ipop"><p class="iph">${e(T("Tick để hiện trên biểu đồ · ★ = chỉ báo quan trọng · ? = giải thích chi tiết"))}</p>${peaks}${main}${own}</div></details>`;
  }

  function full(s, tool, pickOpen) {
    const seg = (key, list, cur, ok = () => true) => `<span class="seg" role="group">${list.map(([k, l]) => `<button data-c="${key}" data-v="${k}"${k === cur ? ' class="on"' : ""}${ok(k) ? "" : " disabled"}>${e(l)}</button>`).join("")}</span>`;
    return seg("range", RANGES.map(([k, , l]) => [k, k === "ALL" ? T(l) : k]), s.range) + seg("interval", INTERVALS, s.interval, k => valid(s.range, k))
      + `<select data-c="type" title="${e(T("Kiểu biểu đồ"))}">${opts(TYPES, s.type)}</select>`
      + `<select data-c="scale" title="${e(T("Thang giá"))}">${opts(SCALES, s.scale)}</select>`
      + `<label class="chk"><input type="checkbox" data-c="volume"${s.volume ? " checked" : ""}>${e(T("Khối lượng"))}</label>`
      + `<label class="chk" title="${e(T("So sánh tối đa 3 coin, cách nhau bằng dấu phẩy (thang % thay đổi)"))}">${e(T("So sánh"))}<input type="text" class="cmpin" data-c="cmp" value="${e(s.cmp.join(", "))}" placeholder="BTC, ETH" spellcheck="false" autocomplete="off"></label>`
      + picker(s, pickOpen)
      + `<span class="seg tools">${TOOLS.map(([k, icon, tip]) => `<button data-c="tool" data-v="${k}" title="${e(T(tip))}"${k === tool ? ' class="on"' : ""}>${icon}</button>`).join("")}`
      + `<button data-c="clearDraw" title="${e(T("Xoá mọi hình vẽ"))}">🗑</button></span>`
      + `<button data-c="fit" title="${e(T("Xem toàn bộ dữ liệu"))}">⤢</button><button data-c="png" title="${e(T("Tải ảnh PNG của biểu đồ"))}">📷 PNG</button>`;
  }

  function chips(list) {
    return list.map((x, i) => {
      const d = Indicators.DEFS[x.id];
      const inputs = d.params.map(q => `<input type="number" data-c="param" data-i="${i}" data-k="${q.k}" value="${x.p[q.k]}" min="${q.min}" max="${q.max}" step="${q.step}" title="${e(q.k)}">`).join("");
      return `<span class="ichip" title="${e(T(d.label))}"><b>${e(d.name)}</b>${inputs}<button data-c="rm" data-i="${i}" title="${e(T("Bỏ chỉ báo"))}">✕</button></span>`;
    }).join("");
  }

  return { INTERVALS, RANGES, TYPES, SCALES, DEFAULT, compact, full, chips, need, valid, fix, days };
})();
