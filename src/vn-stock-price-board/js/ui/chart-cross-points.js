// Full-chart cross dots: wording for ChartCrosses kinds, dots pinned on the crossing line, tooltip html for the dots under the cursor.
const ChartCrossUI = (() => {
  const e = s => Dom.esc(s ?? "");
  const TITLE = { maUp: "Giao cắt vàng", maDown: "Giao cắt tử thần", pxUp: "Giá vượt lên MA", pxDown: "Giá thủng MA", tkUp: "Tenkan cắt lên Kijun", tkDown: "Tenkan cắt xuống Kijun",
    sarUp: "SAR đảo chiều tăng", sarDown: "SAR đảo chiều giảm", sigUp: "MACD cắt lên", sigDown: "MACD cắt xuống", zeroUp: "Cắt lên mức 0", zeroDown: "Cắt xuống mức 0",
    obIn: "Vào vùng quá mua", obOut: "Rời vùng quá mua", osIn: "Vào vùng quá bán", osOut: "Rời vùng quá bán", adxUp: "ADX vượt 25", adxDown: "ADX xuống dưới 25",
    diUp: "+DI cắt lên −DI", diDown: "+DI cắt xuống −DI", stUp: "%K cắt lên %D", stDown: "%K cắt xuống %D" };
  const TEXT = {
    maUp: "{a} cắt lên {b} tại {p}: trung bình ngắn hạn vượt dài hạn, xu hướng chuyển sang tăng. Đáng tin hơn khi khối lượng tăng và giá đứng vững trên {b}; thị trường đi ngang hay cho tín hiệu giả. Xác nhận bằng MACD > 0 hoặc ADX > 25.",
    maDown: "{a} cắt xuống {b} tại {p}: trung bình ngắn hạn rơi dưới dài hạn, xu hướng chuyển sang giảm. Thường là lúc giảm tỷ trọng; giá lấy lại nhanh {b} thì tín hiệu mất hiệu lực. Xác nhận bằng MACD < 0 hoặc −DI trên +DI.",
    pxUp: "Giá đóng cửa vượt lên {b} ({p}): giá lấy lại đường trung bình, xu hướng có thể đảo sang tăng và {b} trở thành hỗ trợ. Chờ giá giữ trên đường 2–3 phiên, kèm khối lượng, để tránh bẫy tăng giá.",
    pxDown: "Giá đóng cửa thủng {b} ({p}): mất hỗ trợ của đường trung bình, cảnh báo xu hướng yếu đi; {b} có thể thành kháng cự. Không lấy lại được trong vài phiên thì cân nhắc dừng lỗ / giảm tỷ trọng.",
    tkUp: "Tenkan cắt lên Kijun ({p}): tín hiệu tăng sớm của Ichimoku. Mạnh khi xảy ra trên mây, trung bình trong mây, yếu khi dưới mây; Kijun thường dùng làm mức dừng lỗ.",
    tkDown: "Tenkan cắt xuống Kijun ({p}): tín hiệu giảm sớm của Ichimoku. Mạnh khi xảy ra dưới mây, yếu khi giá còn trên mây.",
    sarUp: "Parabolic SAR chuyển xuống dưới giá ({p}): đảo chiều sang xu hướng tăng; các chấm SAR tiếp theo là mức dừng lỗ dời dần lên. Thị trường đi ngang hay đảo liên tục — chỉ nên theo khi ADX > 25.",
    sarDown: "Parabolic SAR chuyển lên trên giá ({p}): đảo chiều sang xu hướng giảm, tín hiệu thoát vị thế mua. Thị trường đi ngang hay đảo liên tục — kết hợp ADX để lọc.",
    sigUp: "MACD cắt lên đường Signal: động lượng chuyển sang tăng. Xảy ra dưới mức 0 là tín hiệu hồi sớm (rủi ro hơn), trên 0 là xác nhận xu hướng tăng; histogram chuyển dương cùng lúc.",
    sigDown: "MACD cắt xuống đường Signal: động lượng chuyển sang giảm. Xảy ra trên mức 0 là cảnh báo điều chỉnh, dưới 0 là xác nhận xu hướng giảm.",
    zeroUp: "{n} vượt lên trên 0: động lượng chuyển hẳn sang dương — xác nhận đà tăng, chậm hơn nhưng chắc hơn các tín hiệu cắt nhau ngắn hạn.",
    zeroDown: "{n} xuống dưới 0: động lượng chuyển sang âm — xác nhận đà giảm; tránh mua mới cho đến khi quay lại trên 0.",
    obIn: "{n} vượt {l} ({v}): vào vùng quá mua, giá đang tăng nóng. Chưa phải tín hiệu bán — trong xu hướng mạnh chỉ báo có thể ở đây lâu; chờ nó quay xuống dưới {l}.",
    obOut: "{n} quay xuống dưới {l} ({v}): rời vùng quá mua — tín hiệu chốt lời / bán phổ biến, mạnh hơn khi có phân kỳ âm (giá đỉnh cao hơn, chỉ báo đỉnh thấp hơn).",
    osIn: "{n} xuống dưới {l} ({v}): vào vùng quá bán, lực bán đang mạnh. Chưa nên bắt đáy — chờ chỉ báo quay lên trên {l} hoặc có nến đảo chiều.",
    osOut: "{n} quay lên trên {l} ({v}): rời vùng quá bán — tín hiệu mua / hồi phục phổ biến, đáng tin hơn khi có phân kỳ dương và giá giữ được đáy gần nhất.",
    adxUp: "ADX vượt 25 ({v}): xu hướng đang mạnh lên — các tín hiệu theo xu hướng (MA, MACD, SAR) đáng tin hơn. ADX không cho biết chiều: xem +DI / −DI.",
    adxDown: "ADX xuống dưới 25 ({v}): xu hướng yếu đi, thị trường có thể chuyển sang đi ngang — ưu tiên chỉ báo dao động (RSI, Stochastic), mua thấp bán cao trong biên độ.",
    diUp: "+DI cắt lên −DI: phe mua chiếm ưu thế — tín hiệu tăng, đáng tin khi ADX > 25 và đang đi lên.",
    diDown: "+DI cắt xuống −DI: phe bán chiếm ưu thế — tín hiệu giảm, đáng tin khi ADX > 25 và đang đi lên.",
    stUp: "%K cắt lên %D trong vùng quá bán: tín hiệu mua của Stochastic — tốt nhất khi cùng chiều xu hướng chính (giá trên MA dài).",
    stDown: "%K cắt xuống %D trong vùng quá mua: tín hiệu bán của Stochastic — tốt nhất khi cùng chiều xu hướng chính (giá dưới MA dài).",
  };
  const num = v => Number.isFinite(v) ? v.toFixed(1) : "";

  const text = x => T(TEXT[x.kind], { a: x.a || "", b: x.b || "", n: x.n || "", l: x.l ?? "", v: num(x.v), p: TechChart.fmtPrice(x.price) });
  const html = list => list.map(x => `<div class="tip-ev"><b class="${x.tone === "warn" ? "ref" : x.tone}">● ${e(T(TITLE[x.kind]))}</b> ${e(text(x))}</div>`).join("");

  // crosses carry .s (the series of the crossing line); one markers primitive per series.
  function mark(LW, crosses, c) {
    const by = new Map();
    for (const x of crosses) (by.get(x.s) || by.set(x.s, []).get(x.s)).push(x);
    by.forEach((list, s) => LW.createSeriesMarkers(s, list.map(x => ({ time: x.time, position: "atPriceMiddle", price: x.price, shape: "circle", size: 0.7,
      color: x.tone === "up" ? c.up : x.tone === "down" ? c.down : "#eab308" }))));
  }

  return { html, mark, TITLE, TEXT };
})();
