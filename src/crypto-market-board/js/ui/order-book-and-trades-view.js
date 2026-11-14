// "Sổ lệnh" tab: Binance order book (top 15 per side, depth bars, spread, bid/ask imbalance) + realtime aggregated trades with taker buy/sell split.
const BookView = (() => {
  const LV = 15, KEEP = 50;
  let sym = "", pair = "", book = null, trades = [], unsubs = [], timer = 0, seq = 0;
  const e = s => Dom.esc(s ?? "");

  function bookHtml() {
    if (!book || !book.bids.length || !book.asks.length) return `<p class="pad muted">${e(T("Đang tải sổ lệnh…"))}</p>`;
    const asks = book.asks.slice(0, LV), bids = book.bids.slice(0, LV);
    const cum = list => { let t = 0; return list.map(([p, q]) => (t += q, [p, q, t])); };
    const ca = cum(asks), cb = cum(bids), max = Math.max(ca.at(-1)[2], cb.at(-1)[2]);
    const row = (side, [p, q, c]) => `<tr class="${side}"><td class="${side === "a" ? "down" : "up"}">${e(Fmt.price(p))}</td><td>${e(Fmt.qty(q))}</td><td>${e(Fmt.moneyBig(p * q))}</td>`
      + `<td class="bk-bar"><i class="${side}" style="width:${(c / max * 100).toFixed(1)}%"></i></td></tr>`;
    const bidV = bids.reduce((t, [p, q]) => t + p * q, 0), askV = asks.reduce((t, [p, q]) => t + p * q, 0), imb = bidV + askV ? (bidV - askV) / (bidV + askV) * 100 : 0;
    const spread = asks[0][0] - bids[0][0], mid = (asks[0][0] + bids[0][0]) / 2;
    return `<table class="dtable book"><thead><tr><th>${e(T("Giá"))}</th><th>${e(T("Số lượng"))}</th><th>${e(T("Giá trị"))}</th><th>${e(T("Luỹ kế"))}</th></tr></thead><tbody>`
      + ca.slice().reverse().map(r => row("a", r)).join("")
      + `<tr class="spread"><td colspan="4">${e(T("Chênh lệch {s} ({p}%)", { s: Fmt.price(spread), p: Fmt.en(spread / mid * 100, 4) }))}</td></tr>`
      + cb.map(r => row("b", r)).join("") + `</tbody></table>`
      + `<div class="sides"><span class="up">${e(T("Bên mua {v}", { v: Fmt.moneyBig(bidV) }))}</span><span class="${Fmt.tone(imb)}">${e(T("Lệch {p}", { p: Fmt.pct(imb, 1) }))}</span><span class="down">${e(T("Bên bán {v}", { v: Fmt.moneyBig(askV) }))}</span>`
      + `<div class="sbar"><i class="up" style="width:${(bidV / (bidV + askV) * 100).toFixed(1)}%"></i><i class="down" style="flex:1"></i></div></div>`;
  }

  function tradesHtml() {
    if (!trades.length) return "";
    const buy = trades.filter(t => t.buy).reduce((s, t) => s + t.p * t.q, 0), all = trades.reduce((s, t) => s + t.p * t.q, 0);
    const fmtT = t => new Date(t).toLocaleTimeString(I18n.lang, { hour12: false });
    return `<div class="dsec"><b>${e(T("Khớp lệnh gần nhất"))}</b><span class="muted">${e(T("Mua chủ động {p}% giá trị", { p: Fmt.en(all ? buy / all * 100 : 0, 0) }))}</span></div>`
      + `<table class="dtable trades"><thead><tr><th>${e(T("Giờ"))}</th><th>${e(T("Giá"))}</th><th>${e(T("Số lượng"))}</th><th>${e(T("Giá trị"))}</th></tr></thead><tbody>`
      + trades.slice(0, 40).map(t => `<tr><td class="muted">${e(fmtT(t.t))}</td><td class="${t.buy ? "up" : "down"}">${e(Fmt.price(t.p))}</td><td>${e(Fmt.qty(t.q))}</td><td>${e(Fmt.moneyBig(t.p * t.q))}</td></tr>`).join("")
      + `</tbody></table>`;
  }

  function paint() { timer = 0; const el = $("dBook"); if (el && pair) el.innerHTML = bookHtml() + tradesHtml() + `<p class="src muted">${e(T("Nguồn: Binance {p}, cập nhật mỗi giây", { p: pair }))}</p>`; }
  const later = () => { if (!timer) timer = setTimeout(paint, 500); };

  async function open(s) {
    close();
    sym = s; pair = Coins.pair(s) || ""; book = null; trades = [];
    const my = ++seq;
    if (!pair) { $("dBook").innerHTML = `<p class="pad muted">${e(T("Coin này không có cặp USDT trên Binance nên không có sổ lệnh."))}</p>`; return; }
    paint();
    const lp = pair.toLowerCase();
    unsubs = [Live.sub(`${lp}@depth20@1000ms`, d => { if (d && d.bids) { book = { bids: d.bids.map(([p, q]) => [+p, +q]), asks: d.asks.map(([p, q]) => [+p, +q]) }; later(); } }),
      Live.sub(`${lp}@aggTrade`, d => { if (d && d.p) { trades.unshift(Spot.trade(d)); if (trades.length > KEEP) trades.length = KEEP; later(); } })];
    try {
      const [b, t] = await Promise.all([Spot.depth(pair, 20), Spot.trades(pair, KEEP)]);
      if (my !== seq) return;
      if (!book) book = b;
      if (!trades.length) trades = t;
      paint();
    } catch (err) {
      if (my !== seq) return;
      console.warn("BookView.open - load depth fail", pair, err.message);
      $("dBook").innerHTML = `<div class="errbox">${e(T("Không tải được sổ lệnh từ Binance."))}</div>`;
    }
  }

  function close() { seq++; unsubs.forEach(u => u()); unsubs = []; clearTimeout(timer); timer = 0; pair = ""; }

  return { open, close };
})();
