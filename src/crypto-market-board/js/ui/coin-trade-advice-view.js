// "Khuyến nghị" tab: CoinAdvice on 4h / 1D / 1W Binance candles + funding, Fear & Greed, BTC trend — action, when to buy / sell,
// buy / sell zones, stop-loss per horizon, and other key notes. Rule-based, refreshed each time the tab opens (1-min cache).
const AdviceView = (() => {
  const HORIZON = { short: ["Hôm nay / ngắn hạn", "1–5 ngày"], medium: ["Trung hạn", "2–8 tuần"], long: ["Dài hạn", "6–24 tháng"] };
  const PRICE = new Set(["a", "b", "c", "d", "r", "s"]);
  const cache = new Map();
  let sym = "", seq = 0;
  const e = s => Dom.esc(s ?? "");
  // Translate a [key, params] pair: price params → coin price format, m → money, f → funding %, tf → translated word.
  const fmt = (v, k) => typeof v !== "number" ? T(v) : PRICE.has(k) ? Fmt.price(v) : k === "m" ? Fmt.moneyBig(v) : k === "f" ? Fmt.en(v, 4) : Fmt.en(v, Number.isInteger(v) ? 0 : 1);
  const tr = (key, p = {}) => T(key, Object.fromEntries(Object.entries(p).map(([k, v]) => [k, fmt(v, k)])));
  const range = z => `${Fmt.price(z.lo)} – ${Fmt.price(z.hi)}`;

  async function load(s, pair) {
    const hit = cache.get(pair);
    if (hit && Date.now() - hit.at < 60e3) return hit.v;
    const isBtc = s === "BTC";
    const [h4, d1, w1] = await Promise.all([Spot.klines(pair, "4h", 300), Spot.klines(pair, "1d", 1000), Spot.klines(pair, "1w", 400)]);
    const [btc, fut, fng] = await Promise.allSettled([isBtc ? null : Spot.klines("BTCUSDT", "1d", 300), Futures.board(Coins.hasSpot, 60e3), FearGreed.history(1)]);
    const f = fut.status === "fulfilled" ? fut.value.find(x => x.sym === s) : null;
    const v = CoinAdvice.build({ h4, d1, w1 }, { isBtc, btc: btc.value || null, funding: f ? f.funding : null, fng: fng.status === "fulfilled" && fng.value[0] ? fng.value[0].v : null, qvol: Coins.row(s).qvol });
    cache.set(pair, { at: Date.now(), v });
    return v;
  }

  function card(h) {
    const [title, span] = HORIZON[h.id], o = h.odds;
    const row = (label, val, sub, cls = "") => `<div class="adv-row"><span>${e(T(label))}</span><b class="${cls}">${e(val)}</b><em class="muted">${e(sub)}</em></div>`;
    return `<div class="ol-card adv-card"><div class="ol-h"><b>${e(T(title))} <span class="muted">· ${e(T(span))}</span></b><span class="badge ${h.tone}">${e(T(h.action))}</span></div>`
      + `<div class="ol-meter" title="${e(T("Điểm kỹ thuật {s} (−100…+100)", { s: h.score }))}"><i style="left:${((h.score + 100) / 2).toFixed(0)}%"></i></div>`
      + row("Vùng mua", range(h.buy), T(h.buy.basis), "up") + row("Vùng bán / chốt lời", range(h.sell), T(h.sell.basis), "down")
      + row("Dừng lỗ", Fmt.price(h.stop.v), tr(h.stop.basis, { n: h.stop.n }), "down")
      + row("Lời : lỗ", h.rr == null ? "—" : `1 : ${Fmt.en(Math.max(0, h.rr), 1)}`, T(h.tone === "down" ? "nếu mua ở vùng mua — chỉ tham khảo khi xu hướng còn giảm" : h.rr >= 2 ? "đáng giá" : h.rr >= 1 ? "tạm được" : "kém — chờ giá tốt hơn"), h.tone === "down" ? "" : h.rr >= 2 ? "up" : h.rr < 1 ? "down" : "")
      + `<ul class="insights adv-when">${h.timing.map(([k, p]) => `<li>${e(tr(k, p))}</li>`).join("")}</ul>`
      + (o && o.n ? `<p class="muted adv-odds">${e(T("Lịch sử: sau {n} lần có điểm tương tự, giá cao hơn {h} sau {p}% số lần (trung vị {m}%).", { n: o.n, h: T(h.oddsH), p: Fmt.en(o.up, 0), m: Fmt.signed(o.median, 1) }))}</p>` : "")
      + `</div>`;
  }

  async function open(s) {
    sym = s;
    const my = ++seq, el = $("dAdvice"), pair = Coins.pair(s), head = `<div class="dsec"><b>${e(T("Khuyến nghị"))}</b><span class="muted">${e(T("tự động theo quy tắc kỹ thuật — không phải lời khuyên đầu tư"))}</span></div>`;
    if (MarketMath.isStable(Coins.row(s))) { el.innerHTML = head + `<p class="pad muted">${e(T("{s} là stablecoin (giá neo ~1$) — không có khuyến nghị mua / bán theo giá.", { s }))}</p>`; return; }
    if (!pair) { el.innerHTML = head + `<p class="pad muted">${e(T("Coin này không có cặp USDT trên Binance nên không có biểu đồ nến."))}</p>`; return; }
    el.innerHTML = head + `<p class="pad muted">${e(T("Đang tính…"))}</p>`;
    try {
      const v = await load(s, pair);
      if (my !== seq) return;
      if (!v) { el.innerHTML = head + `<p class="pad muted">${e(T("Chưa đủ lịch sử giá (cần ≥ 60 nến ngày) để khuyến nghị."))}</p>`; return; }
      el.innerHTML = head + `<p class="pad adv-price">${e(T("Giá tham chiếu {p} (đóng cửa nến ngày hiện tại)", { p: Fmt.price(v.price) }))}</p>`
        + `<div class="ol-grid">${v.horizons.map(card).join("")}</div>`
        + `<div class="dsec"><b>${e(T("Khuyến nghị quan trọng khác"))}</b></div><ul class="insights">${v.notes.map(([c, k, p]) => `<li class="${c}">${e(tr(k, p))}</li>`).join("")}</ul>`
        + `<p class="sc-note">${e(T("Cách tính: điểm kỹ thuật (MA20/50/200, RSI, MACD, ADX, Bollinger, khối lượng) quyết định hành động; vùng mua / bán lấy từ pivot, MA, đỉnh / đáy gần nhất ± một phần ATR; dừng lỗ dưới vùng mua 0,5–1 ATR. Ngắn hạn dùng nến 4h + ngày, trung hạn nến ngày, dài hạn nến tuần."))}</p>`;
    } catch (err) {
      if (my !== seq) return;
      console.warn("AdviceView.open - load klines fail", s, err.message);
      el.innerHTML = head + `<div class="errbox">${e(T("Không tải được nến để tính khuyến nghị."))}</div>`;
    }
  }

  return { open, close: () => { seq++; } };
})();
