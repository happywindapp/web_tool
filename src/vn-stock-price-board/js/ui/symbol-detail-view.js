// Detail pane for the selected symbol: price, stats, 3-level order book, intraday chart, active buy/sell and match history.
const DetailView = (() => {
  let top, overview, bottom;
  const TRADE_ROWS = 150;

  const stat = (label, val, cls = "") => `<div><span>${Dom.esc(T(label))}</span><b class="${cls}">${Dom.esc(val)}</b></div>`;
  const ymd = s => /^\d{8}$/.test(s) ? `${s.slice(6)}/${s.slice(4, 6)}/${s.slice(0, 4)}` : s;

  function stats(q, unit) {
    const p = v => Fmt.price(v) || "—", tone = v => QuoteModel.tone(v, q);
    const out = [stat("Trần", p(q.ceil), "ceil"), stat("Sàn", p(q.floor), "floor"), stat("Tham chiếu", p(q.ref), "ref"),
      stat("Mở cửa", p(q.open), tone(q.open)), stat("Cao", p(q.high), tone(q.high)), stat("Thấp", p(q.low), tone(q.low)),
      stat("Trung bình", p(q.avg), tone(q.avg)), stat("Tổng KL", Fmt.vol(q.totVol, unit) || "0"),
      stat("NN mua", Fmt.vol(q.fBuy, unit) || "0"), stat("NN bán", Fmt.vol(q.fSell, unit) || "0"), stat("Room NN", Fmt.big(q.room) || "—")];
    if (q.cw) out.push(stat("CK cơ sở", q.cw.underlying || "—"), stat("Giá thực hiện", q.cw.strike ? Fmt.en(q.cw.strike, 2) : "—"),
      stat("Tỷ lệ chuyển đổi", q.cw.ratio || "—"), stat("Ngày GD cuối", ymd(q.cw.lastTrade) || "—"), stat("Ngày đáo hạn", ymd(q.cw.maturity) || "—"));
    return `<div class="stats">${out.join("")}</div>`;
  }

  function book(q, unit) {
    const max = Math.max(1, ...q.bids.map(l => l.v), ...q.asks.map(l => l.v));
    const bar = (v, side) => `<i class="vbar ${side}" style="width:${Math.round(v / max * 100)}%"></i>`;
    const rows = [0, 1, 2].map(i => {
      const b = q.bids[i], a = q.asks[i];
      return `<tr><td class="bv">${bar(b.v, "b")}<span>${Fmt.vol(b.v, unit)}</span></td><td class="${QuoteModel.tone(b.p, q)}">${Fmt.price(b.p)}</td>`
        + `<td class="${QuoteModel.tone(a.p, q)}">${Fmt.price(a.p)}</td><td class="av">${bar(a.v, "a")}<span>${Fmt.vol(a.v, unit)}</span></td></tr>`;
    }).join("");
    return `<table class="book"><thead><tr><th>${Dom.esc(T("KL mua"))}</th><th>${Dom.esc(T("Giá mua"))}</th><th>${Dom.esc(T("Giá bán"))}</th><th>${Dom.esc(T("KL bán"))}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function sides(trades, unit) {
    const s = QuoteModel.tradeSides(trades), tot = s.B + s.S || 1;
    return `<div class="sides"><div class="sbar"><i class="up" style="width:${(s.B / tot * 100).toFixed(1)}%"></i><i class="down" style="width:${(s.S / tot * 100).toFixed(1)}%"></i></div>`
      + `<span class="up">${Dom.esc(T("Mua chủ động {v}", { v: Fmt.vol(s.B, unit) || "0" }))}</span><span class="down">${Dom.esc(T("Bán chủ động {v}", { v: Fmt.vol(s.S, unit) || "0" }))}</span></div>`;
  }

  function tradeList(trades, q, unit) {
    const rows = trades.slice(-TRADE_ROWS).reverse().map(t => {
      const tone = QuoteModel.tone(t.price, q), side = t.side === "B" ? T("M") : t.side === "S" ? T("B") : "";
      return `<tr><td>${Dom.esc(t.time)}</td><td class="${tone}">${Fmt.price(t.price)}</td><td class="${tone}">${Fmt.signed((Math.round(t.price * 100) - Math.round(q.ref * 100)) / 100)}</td>`
        + `<td>${Fmt.vol(t.vol, unit)}</td><td class="${t.side === "B" ? "up" : t.side === "S" ? "down" : ""}">${Dom.esc(side)}</td></tr>`;
    }).join("");
    return `<table class="trades"><thead><tr><th>${Dom.esc(T("Giờ"))}</th><th>${Dom.esc(T("Giá"))}</th><th>+/-</th><th>${Dom.esc(T("KL"))}</th><th>${Dom.esc(T("M/B"))}</th></tr></thead><tbody>${rows}</tbody></table>`
      + (trades.length > TRADE_ROWS ? `<p class="muted">${Dom.esc(T("Hiện {n} / {total} lệnh khớp gần nhất.", { n: TRADE_ROWS, total: Fmt.en(trades.length) }))}</p>` : "");
  }

  // s = { q, name, watched, unit, trades: array | null, tradeState: "loading" | "error" | "ok" }
  function render(s) {
    if (!s.q) { top.innerHTML = `<p class="muted pad">${Dom.esc(T("Chọn 1 mã trong bảng giá để xem chi tiết."))}</p>`; overview.innerHTML = ""; bottom.innerHTML = ""; return; }
    const q = s.q, tone = QuoteModel.tone(q.last || q.ref, q), tip = s.watched ? T("Bỏ khỏi danh mục") : T("Thêm vào danh mục");
    const head = `<div class="dh"><div><b class="dsym ${tone}">${Dom.esc(q.sym)}</b> <span class="badge">${Dom.esc(q.ex)}</span>`
      + `<button id="dStar" class="star${s.watched ? " on" : ""}" title="${Dom.esc(tip)}">${s.watched ? "★" : "☆"}</button>`
      + `<button id="dChart" class="chart-btn" title="${Dom.esc(T("Mở biểu đồ kỹ thuật toàn màn hình"))}">📈 ${Dom.esc(T("Biểu đồ"))}</button>`
      + `<div class="muted dname">${Dom.esc(s.name)}</div></div>`
      + `<div class="dp ${tone}"><b>${Fmt.price(q.last || q.ref)}</b><span>${Fmt.chg(q, q.chg)} ${Fmt.pct(q, q.pct)}</span></div></div>`;
    let tail;
    if (s.tradeState === "loading") tail = `<p class="muted pad">${Dom.esc(T("Đang tải lịch sử khớp lệnh…"))}</p>`;
    else if (s.tradeState === "error") tail = `<p class="bad pad">${Dom.esc(T("Không tải được lịch sử khớp lệnh."))}</p>`;
    else if (!s.trades || !s.trades.length) tail = `<p class="muted pad">${Dom.esc(T("Chưa có lệnh khớp trong ngày."))}</p>`;
    else tail = ChartSvg.intraday(s.trades, q) + sides(s.trades, s.unit) + tradeList(s.trades, q, s.unit);
    top.innerHTML = head;
    overview.innerHTML = stats(q, s.unit) + book(q, s.unit);
    bottom.innerHTML = `<div class="dsec"><b>${Dom.esc(T("Diễn biến trong ngày"))}</b><button id="dReload" title="${Dom.esc(T("Tải lại lịch sử khớp lệnh"))}">↻</button></div>` + tail;
  }

  return { init: (t, o, b) => { top = t; overview = o; bottom = b; }, render };
})();
