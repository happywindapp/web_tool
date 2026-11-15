// Pure rule-based advice for one coin: per horizon (today / medium / long) an action, when to buy / sell, buy zone, sell zone,
// stop-loss, reward : risk and historical odds; plus other key notes (sizing by ATR, MA200, RSI, ATH, funding, Fear & Greed, BTC, liquidity).
// Texts are Vietnamese keys + numeric params (the UI translates and formats). Needs TA + TechOutlook.
const CoinAdvice = (() => {
  const ACTION = { 2: ["Mua / nắm giữ", "up"], 1: ["Mua dần khi điều chỉnh", "up"], 0: ["Chờ — mua thấp, bán cao trong biên độ", "ref"],
    "-1": ["Hạn chế mua — bán khi hồi", "down"], "-2": ["Bán / đứng ngoài", "down"] };
  const HOT = ["Không đuổi giá — chờ về vùng mua", "ref"], COLD = ["Có thể hồi kỹ thuật — không bắt đáy lớn", "down"];
  const ok = Number.isFinite, last = a => a[a.length - 1];
  const nearestBelow = (price, list) => list.filter(c => ok(c.v) && c.v < price).sort((a, b) => b.v - a.v)[0];
  const nearestAbove = (price, list) => list.filter(c => ok(c.v) && c.v > price * 1.003).sort((a, b) => a.v - b.v)[0];
  function zone(L, w, price, side) {
    if (side === "buy") { const hi = Math.min(L.v + w, price); return { lo: Math.min(L.v - w, hi), hi, basis: L.basis }; }
    const lo = Math.max(L.v - w, price); return { lo, hi: Math.max(L.v + w, lo), basis: L.basis };
  }

  // One horizon from its score, RSI, buy / sell levels, ATR for the zone width, and odds.
  function horizon(id, score, rsi, price, sup, res, atr, w, stopAtr, tf, odds, oddsH) {
    const b = TechOutlook.bucket(score);
    const [action, tone] = b >= 1 && rsi >= 75 ? HOT : b <= -1 && rsi <= 25 ? COLD : ACTION[b];
    const buy = zone(sup, w * atr, price, "buy"), sell = zone(res, w * atr, price, "sell"), stop = buy.lo - stopAtr * atr;
    const bm = (buy.lo + buy.hi) / 2, sm = (sell.lo + sell.hi) / 2, rr = bm > stop ? (sm - bm) / (bm - stop) : null;
    const timing = b >= 1 ? [["Thời điểm mua: khi giá lùi về {a} – {b} và có nến xác nhận (đóng cửa tăng, RSI quay lên).", { a: buy.lo, b: buy.hi }],
      ["Mua bứt phá: khi đóng cửa {tf} trên {r} kèm khối lượng tăng.", { tf, r: sell.lo }], ["Chốt lời dần: trong vùng {a} – {b}.", { a: sell.lo, b: sell.hi }]]
      : b <= -1 ? [["Thời điểm bán: khi giá hồi lên {a} – {b} mà không vượt được.", { a: sell.lo, b: sell.hi }],
        ["Thoát hẳn: khi đóng cửa {tf} dưới {s}.", { tf, s: stop }], ["Chỉ mua lại khi đóng cửa {tf} trên {r}.", { tf, r: sell.hi }]]
      : [["Mua gần {a} – {b}, bán gần {c} – {d}.", { a: buy.lo, b: buy.hi, c: sell.lo, d: sell.hi }],
        ["Chờ phá vỡ: đóng cửa {tf} trên {r} → theo tăng; dưới {s} → đứng ngoài.", { tf, r: sell.hi, s: buy.lo }]];
    return { id, score, bucket: b, action, tone, buy, sell, stop: { v: stop, basis: "{n} ATR dưới vùng mua", n: stopAtr }, rr, timing, odds, oddsH };
  }

  // k = { h4, d1, w1 } candle arrays (oldest first); opt = { btc: daily bars | null, funding (%/8h), fng (0–100), qvol (USD), isBtc }.
  function build(k, opt = {}) {
    const fH = TechOutlook.frame(k.h4, "D", [6]), fD = TechOutlook.frame(k.d1, "D", [5, 20]), fW = TechOutlook.frame(k.w1, "W", [26]);
    if (!fD || !fD.atr || k.d1.length < 60) return null;
    const price = fD.close, cD = k.d1.map(b => b.close), cW = k.w1.map(b => b.close), atrD = fD.atr;
    const pd = TechOutlook.pivots(k.d1[k.d1.length - 2]), pw = k.w1.length > 2 ? TechOutlook.pivots(k.w1[k.w1.length - 2]) : null;
    const ma50 = last(TA.sma(cD, 50)), ma200 = last(TA.sma(cD, 200)), ma40w = last(TA.sma(cW, 40)), lt = TechOutlook.longTerm(k.d1);
    const ath = Math.max(...k.w1.map(b => b.high), ...k.d1.map(b => b.high)), years = (last(k.w1).time - k.w1[0].time) / 31557600;
    const fall = (v, basis) => ({ v, basis });

    const out = [];
    const sScore = fH ? Math.round((fH.score + fD.score) / 2) : fD.score;
    out.push(horizon("short", sScore, fD.rsi, price,
      nearestBelow(price, [fall(pd.s1, "Pivot S1 ngày"), fall(pd.s2, "Pivot S2 ngày")]) || fall(price - 0.5 * atrD, "Giá hiện tại − 0,5 ATR"),
      nearestAbove(price, [fall(pd.r1, "Pivot R1 ngày"), fall(pd.r2, "Pivot R2 ngày")]) || fall(price + 0.75 * atrD, "Giá hiện tại + 0,75 ATR"),
      atrD, 0.25, 0.5, "nến 4h", fD.odds[5], "5 ngày"));
    out.push(horizon("medium", fD.score, fD.rsi, price,
      nearestBelow(price, [fall(ma50, "MA50 ngày"), fall(fD.support, "Đáy 20 ngày"), fall(pw && pw.s1, "Pivot S1 tuần")]) || fall(price - atrD, "Giá hiện tại − 1 ATR"),
      nearestAbove(price, [fall(fD.resistance, "Đỉnh 20 ngày"), fall(pw && pw.r1, "Pivot R1 tuần"), fall(pw && pw.r2, "Pivot R2 tuần"), fall(lt.hi52, "Đỉnh 52 tuần")])
        || fall(price + 2 * atrD, "Giá hiện tại + 2 ATR"), atrD, 0.35, 1, "nến ngày", fD.odds[20], "20 ngày"));
    if (fW && fW.atr) {
      const band = lt.band1y || [];
      out.push(horizon("long", fW.score, fW.rsi, price,
        nearestBelow(price, [fall(ma200, "MA200 ngày"), fall(ma40w, "MA40 tuần"), fall(lt.lo52, "Đáy 52 tuần"), fall(band[0], "Dải biến động 1 năm (−1σ)")]) || fall(price - fW.atr, "Giá hiện tại − 1 ATR tuần"),
        nearestAbove(price, [fall(lt.hi52, "Đỉnh 52 tuần"), fall(ath, "Đỉnh lịch sử"), fall(band[1], "Dải biến động 1 năm (+1σ)")]) || fall(price + 2 * fW.atr, "Giá hiện tại + 2 ATR tuần"),
        fW.atr, 0.35, 1, "nến tuần", fW.odds[26], "26 tuần"));
    }
    return { price, horizons: out, notes: notes({ price, fD, ma200, ath, years, lt }, opt) };
  }

  // [tone, key, params]; money / price params are formatted by the UI.
  function notes(x, opt) {
    const n = [], atrPct = x.fD.atrPct, fromAth = (x.price / x.ath - 1) * 100;
    if (ok(atrPct)) n.push([atrPct > 6 ? "down" : "ref", "Biến động trung bình {p}%/ngày — dừng lỗ nên cách điểm mua khoảng 1,5 ATR (≈ {q}%). Nếu chỉ chấp nhận mất 1% vốn mỗi lệnh, tỷ trọng tối đa ≈ {z}% vốn.",
      { p: atrPct, q: 1.5 * atrPct, z: Math.min(100, 100 / (1.5 * atrPct)) }]);
    if (ok(x.ma200)) n.push(x.price > x.ma200 ? ["up", "Giá trên MA200 ngày ({a}): xu hướng dài hạn tăng — ưu tiên mua khi điều chỉnh, không bán khống.", { a: x.ma200 }]
      : ["down", "Giá dưới MA200 ngày ({a}): xu hướng dài hạn giảm — chỉ giao dịch ngắn, giảm tỷ trọng, chờ giá lấy lại MA200.", { a: x.ma200 }]);
    const r = x.fD.rsi;
    if (r >= 70) n.push(["down", "RSI ngày {p}: quá mua — không mua đuổi, cân nhắc chốt lời từng phần.", { p: r }]);
    else if (r <= 30) n.push(["up", "RSI ngày {p}: quá bán — có thể hồi kỹ thuật, nhưng chờ nến đảo chiều rồi mới mua.", { p: r }]);
    if (fromAth > -5) n.push(["ref", "Giá cách đỉnh cao nhất {p}% (dữ liệu Binance ~{y} năm): trên đầu không còn kháng cự, biến động mạnh — dời dừng lỗ theo giá.", { p: fromAth, y: x.years }]);
    else if (fromAth < -70) n.push(["down", "Giá thấp hơn đỉnh cao nhất {p}% (dữ liệu Binance ~{y} năm): rủi ro coin mất vị thế — chỉ mua lượng nhỏ, chia nhiều lần.", { p: -fromAth, y: x.years }]);
    if (ok(opt.funding) && opt.funding > 0.03) n.push(["down", "Funding {f}%/8h: phe Long đông và trả phí cao — dễ có cú quét Long, tránh dùng đòn bẩy.", { f: opt.funding }]);
    else if (ok(opt.funding) && opt.funding < 0) n.push(["up", "Funding âm ({f}%/8h): phe Short đông — giá tăng có thể kích hoạt short squeeze.", { f: opt.funding }]);
    if (opt.fng <= 25) n.push(["up", "Chỉ số Sợ hãi & Tham lam {p} (sợ hãi tột độ): lịch sử thường là vùng tích luỹ tốt cho dài hạn — mua dần, không dồn hết vốn.", { p: opt.fng }]);
    else if (opt.fng >= 75) n.push(["down", "Chỉ số Sợ hãi & Tham lam {p} (tham lam tột độ): thị trường hưng phấn — chốt lời dần, tránh mua theo đám đông.", { p: opt.fng }]);
    const btc = !opt.isBtc && opt.btc ? TechOutlook.frame(opt.btc, "D", [5]) : null;
    if (btc && btc.bucket <= -1) n.push(["down", "BTC đang trong xu hướng giảm (khung ngày, điểm {p}) — altcoin thường giảm mạnh hơn BTC, nên giảm tỷ trọng.", { p: btc.score }]);
    else if (btc && btc.bucket >= 1) n.push(["up", "BTC đang tăng (khung ngày, điểm {p}) — thuận lợi cho altcoin nếu dòng tiền lan sang.", { p: btc.score }]);
    if (ok(opt.qvol) && opt.qvol < 5e6) n.push(["down", "KL giao dịch 24h chỉ {m}: thanh khoản mỏng — dùng lệnh giới hạn, chia nhỏ lệnh, tránh lệnh thị trường.", { m: opt.qvol }]);
    n.push(["ref", "Chia vốn mua làm 3–4 lần (DCA) thay vì mua một lần; luôn đặt dừng lỗ trước khi vào lệnh và không dùng tiền vay.", {}]);
    return n;
  }

  return { build, ACTION };
})();
