// Full-chart help: what each line / pane means, how to read its value at the cursor, and why a marked point deserves attention.
const ChartHelp = (() => {
  const e = s => Dom.esc(s ?? "");
  const DESC = {
    price: "Nến: thân xanh = đóng cửa cao hơn mở cửa, đỏ = thấp hơn; râu là giá cao / thấp nhất trong phiên. Cột dưới cùng là khối lượng.",
    sma: "Đường trung bình đơn giản: giá trên đường là xu hướng tăng, dưới là giảm; đường dốc lên / xuống cho biết hướng, thường đóng vai hỗ trợ / kháng cự.",
    ema: "Đường trung bình hàm mũ: như SMA nhưng phản ứng nhanh hơn với giá gần đây.",
    wma: "Đường trung bình có trọng số: giá càng gần càng nặng ký, phản ứng nhanh hơn SMA.",
    bb: "Dải Bollinger: SMA ± 2 độ lệch chuẩn. Giá chạm dải trên là căng, dải dưới là quá bán; dải co hẹp báo sắp có biến động mạnh.",
    dc: "Kênh Donchian: giá cao / thấp nhất N phiên. Vượt cạnh trên là bứt phá, thủng cạnh dưới là phá vỡ hỗ trợ.",
    ichi: "Mây Ichimoku: giá trên mây là xu hướng tăng, dưới mây là giảm; Tenkan cắt Kijun là tín hiệu sớm, mây dày là hỗ trợ / kháng cự mạnh.",
    psar: "Parabolic SAR: chấm dưới giá là xu hướng tăng, trên giá là giảm; chấm đổi phía là tín hiệu đảo chiều, hay dùng làm điểm dừng lỗ.",
    vwap: "VWAP: giá bình quân theo khối lượng trong phiên. Giá trên VWAP là bên mua chiếm ưu thế trong ngày.",
    rsi: "RSI (0–100) đo sức mạnh tăng / giảm gần đây: > 70 quá mua, < 30 quá bán, cắt 50 là đổi phe.",
    macd: "MACD = EMA nhanh − EMA chậm. Cắt lên đường tín hiệu là tín hiệu mua, cắt xuống là bán; histogram cho biết động lượng mạnh lên hay yếu đi.",
    stoch: "Stochastic (0–100): vị trí giá đóng cửa trong biên độ N phiên. > 80 quá mua, < 20 quá bán; %K cắt %D là tín hiệu.",
    adx: "ADX đo độ mạnh xu hướng (không phân biệt chiều): > 25 có xu hướng rõ, < 20 đi ngang. +DI trên −DI là phe mua mạnh hơn.",
    atr: "ATR: biên độ dao động trung bình mỗi phiên, dùng ước lượng rủi ro và đặt điểm dừng lỗ.",
    cci: "CCI: độ lệch của giá so với trung bình. > +100 mạnh / quá mua, < −100 yếu / quá bán.",
    wr: "Williams %R (−100…0): > −20 quá mua, < −80 quá bán.",
    mfi: "MFI: RSI có tính khối lượng (dòng tiền). > 80 quá mua, < 20 quá bán.",
    obv: "OBV: cộng khối lượng phiên tăng, trừ phiên giảm. OBV đi lên cùng giá là dòng tiền xác nhận xu hướng.",
    roc: "ROC: % thay đổi giá so với N phiên trước. Trên 0 là đà tăng, dưới 0 là đà giảm.",
  };
  const zone = (v, hi, lo, hiT, loT, midT) => v >= hi ? hiT : v <= lo ? loT : midT;

  // Reading of an oscillator value at the cursor.
  function interp(id, vals) {
    const v = vals[0];
    if (!Number.isFinite(v)) return "";
    if (id === "rsi") return T(zone(v, 70, 30, "RSI {v}: quá mua", "RSI {v}: quá bán", v >= 50 ? "RSI {v}: phe mua nhỉnh hơn" : "RSI {v}: phe bán nhỉnh hơn"), { v: v.toFixed(1) });
    if (id === "stoch" || id === "mfi") return T(zone(v, 80, 20, "{v}: quá mua", "{v}: quá bán", "{v}: vùng trung tính"), { v: v.toFixed(1) });
    if (id === "wr") return T(zone(v, -20, -80, "{v}: quá mua", "{v}: quá bán", "{v}: vùng trung tính"), { v: v.toFixed(1) });
    if (id === "cci") return T(zone(v, 100, -100, "{v}: mạnh / quá mua", "{v}: yếu / quá bán", "{v}: vùng trung tính"), { v: v.toFixed(0) });
    if (id === "adx") return T(v >= 25 ? "ADX {v}: xu hướng rõ" : v < 20 ? "ADX {v}: đi ngang" : "ADX {v}: xu hướng đang hình thành", { v: v.toFixed(1) });
    if (id === "macd") { const hist = vals[0], line = vals[1], sig = vals[2];
      return Number.isFinite(line) && Number.isFinite(sig) ? T(line > sig ? "MACD trên tín hiệu, histogram {h}: động lượng tăng" : "MACD dưới tín hiệu, histogram {h}: động lượng giảm", { h: Number.isFinite(hist) ? hist.toFixed(2) : "—" }) : ""; }
    if (id === "roc") return T(v >= 0 ? "ROC {v}%: đà tăng" : "ROC {v}%: đà giảm", { v: v.toFixed(1) });
    return "";
  }

  const EVENT = {
    swingHigh: "Đỉnh {p}: giá quay đầu giảm sau điểm này — vùng {p} là kháng cự cần chú ý khi giá quay lại.",
    swingLow: "Đáy {p}: lực mua xuất hiện, giá bật lên — vùng {p} là hỗ trợ cần chú ý.",
    rangeHigh: "Cao nhất trong khoảng đang xem: {p}. Vượt được mức này là bứt phá, thất bại dễ tạo đỉnh.",
    rangeLow: "Thấp nhất trong khoảng đang xem: {p}. Thủng mức này là phá vỡ hỗ trợ, giữ được có thể tạo đáy.",
    maCrossUp: "{fast} cắt lên {slow} (giao cắt vàng): xu hướng ngắn hạn mạnh hơn dài hạn — thường là tín hiệu tăng.",
    maCrossDown: "{fast} cắt xuống {slow} (giao cắt tử thần): xu hướng ngắn hạn yếu đi — thường là tín hiệu giảm.",
    macdUp: "MACD cắt lên đường tín hiệu: động lượng chuyển sang tăng.",
    macdDown: "MACD cắt xuống đường tín hiệu: động lượng chuyển sang giảm.",
    rsiHigh: "RSI vượt 70 ({v}): vào vùng quá mua — dễ điều chỉnh, nhưng trong xu hướng mạnh có thể ở lâu.",
    rsiLow: "RSI xuống dưới 30 ({v}): vào vùng quá bán — có thể hồi phục kỹ thuật.",
    bbUp: "Giá đóng cửa trên dải Bollinger trên: bứt phá mạnh nhưng đang căng, dễ rung lắc.",
    bbDown: "Giá đóng cửa dưới dải Bollinger dưới: bán mạnh, quá bán ngắn hạn.",
    volSpike: "Khối lượng đột biến {v}× trung bình 20 phiên: dòng tiền lớn vào / ra — chú ý chiều nến đi kèm.",
  };
  const TITLE = { swingHigh: "Đỉnh", swingLow: "Đáy", rangeHigh: "Đỉnh của khoảng", rangeLow: "Đáy của khoảng", maCrossUp: "Giao cắt vàng", maCrossDown: "Giao cắt tử thần",
    macdUp: "MACD cắt lên", macdDown: "MACD cắt xuống", rsiHigh: "Quá mua", rsiLow: "Quá bán", bbUp: "Vượt dải trên", bbDown: "Thủng dải dưới", volSpike: "KL đột biến" };
  // Major points get an arrow + word; minor signals only a small dot (still explained on hover) to keep the chart readable.
  const SHORT = { swingHigh: "Đỉnh", swingLow: "Đáy", rangeHigh: "Cao nhất", rangeLow: "Thấp nhất", maCrossUp: "MA↑", maCrossDown: "MA↓" };
  const major = kind => Object.hasOwn(SHORT, kind);

  const eventText = ev => T(EVENT[ev.kind], { p: TechChart.fmtPrice(ev.price), v: Number.isFinite(ev.v) ? ev.v.toFixed(1) : "", fast: ev.fast || "", slow: ev.slow || "" });

  // Tooltip: events on the hovered bar and / or the hovered pane's explanation + reading.
  function tipHtml(events, pane) {
    let html = events.map(ev => `<div class="tip-ev"><b class="${ev.tone === "warn" ? "ref" : ev.tone}">${e(T(TITLE[ev.kind]))}</b> ${e(eventText(ev))}</div>`).join("");
    if (pane) html += `<div class="tip-pane"><b>${e(pane.name)}</b> ${e(T(DESC[pane.id] || ""))}${pane.reading ? `<div class="tip-read">${e(pane.reading)}</div>` : ""}</div>`;
    return html;
  }

  const desc = id => DESC[id] ? T(DESC[id]) : "";
  const short = kind => SHORT[kind] ? T(SHORT[kind]) : "";

  return { desc, interp, tipHtml, eventText, short, major, TITLE };
})();
