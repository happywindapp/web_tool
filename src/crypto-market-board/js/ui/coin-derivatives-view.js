// "Phái sinh" tab (CryptoQuant / Coinglass view of one coin's Binance perpetual): mark / index / basis, funding now + history,
// open interest, long/short account ratio vs top traders, taker buy/sell ratio, and a plain-language read of positioning.
const DerivView = (() => {
  const PERIODS = [["1h", "1 giờ", 48], ["4h", "4 giờ", 42], ["1d", "1 ngày", 30]];
  let sym = "", seq = 0, period = ["1h", "4h", "1d"].includes(Prefs.get("deriv.period")) ? Prefs.get("deriv.period") : "4h", charts = [], wired = false;
  const e = s => Dom.esc(s ?? "");
  const card = (label, value, sub = "", cls = "") => `<div class="card"><span>${e(label)}</span><b class="${cls}">${e(value)}</b><em class="muted">${e(sub)}</em></div>`;

  // Rules of thumb: funding > 0.03 %/8h or long/short > 2 = crowded longs (squeeze risk down); negative funding = crowded shorts.
  function reads(f, ls, tk, oi) {
    const out = [];
    if (f.funding > 0.03) out.push(["down", T("Funding cao ({p}/8h): phe Long đang trả phí đắt — thị trường quá hưng phấn, dễ có cú quét Long.", { p: Fmt.pct(f.funding, 4) })]);
    else if (f.funding < 0) out.push(["up", T("Funding âm ({p}/8h): phe Short đang trả phí — nếu giá tăng có thể xảy ra short squeeze.", { p: Fmt.pct(f.funding, 4) })]);
    else out.push(["ref", T("Funding bình thường ({p}/8h).", { p: Fmt.pct(f.funding, 4) })]);
    const l = ls.at(-1), t = tk.at(-1);
    if (l) out.push([l.ratio > 2 ? "down" : l.ratio < 0.8 ? "up" : "ref", T("{p}% tài khoản đang Long (tỷ lệ Long/Short {r}).", { p: Fmt.en(l.long * 100, 0), r: Fmt.en(l.ratio, 2) })]);
    if (t) out.push([t.ratio > 1.05 ? "up" : t.ratio < 0.95 ? "down" : "ref", T("Taker mua/bán {r}: {s}.", { r: Fmt.en(t.ratio, 2), s: t.ratio > 1.05 ? T("bên mua chủ động lấn át") : t.ratio < 0.95 ? T("bên bán chủ động lấn át") : T("cân bằng") })]);
    if (oi.length > 1) {
      const ch = (oi.at(-1).oiv / oi[0].oiv - 1) * 100;
      out.push([ch > 0 ? "up" : "down", T("Hợp đồng mở (OI) {p} trong kỳ — {s}.", { p: Fmt.pct(ch, 1), s: ch > 10 ? T("đòn bẩy đang tăng nhanh, biến động có thể mạnh") : ch < -10 ? T("vị thế đang bị đóng / thanh lý") : T("ổn định") })]);
    }
    return `<ul class="insights">${out.map(([c, x]) => `<li class="${c}">${e(x)}</li>`).join("")}</ul>`;
  }

  function chartBox(id) { return `<div class="cbox sc-box tall"><div class="clegend" id="${id}L"></div><div class="chost" id="${id}H"></div></div>`; }
  function draw(oi, fr, ls, top, tk) {
    charts.forEach(c => c.destroy());
    const a = SeriesChart.create($("dvAH"), { legend: $("dvAL"), fmt: v => Fmt.big(v) }), b = SeriesChart.create($("dvBH"), { legend: $("dvBL"), fmt: v => Fmt.en(v, 2) });
    const intraday = period !== "1d", s = x => Math.floor(x / 1000);
    a.set([{ title: T("OI (USD)"), type: "area", color: "#0ea5e9", data: oi.map(x => ({ time: s(x.t), value: x.oiv })) },
      { title: T("Funding %/8h"), type: "hist", color: "#a855f7", pane: 1, fmt: v => Fmt.en(v, 4) + "%", data: fr.map(x => ({ time: s(x.t), value: x.rate, color: x.rate >= 0 ? "#22c55e99" : "#ef444499" })) }], { intraday });
    b.set([{ title: T("Long/Short tài khoản"), color: "#f59e0b", data: ls.map(x => ({ time: s(x.t), value: x.ratio })), levels: [{ price: 1 }] },
      { title: T("Long/Short top trader"), color: "#3b82f6", data: top.map(x => ({ time: s(x.t), value: x.ratio })) },
      { title: T("Taker mua/bán"), color: "#14b8a6", pane: 1, data: tk.map(x => ({ time: s(x.t), value: x.ratio })), levels: [{ price: 1 }] }], { intraday });
    charts = [a, b];
  }

  async function open(s) {
    sym = s;
    const my = ++seq, el = $("dDeriv");
    el.innerHTML = `<p class="pad muted">${e(T("Đang tải dữ liệu phái sinh…"))}</p>`;
    try {
      const all = await Futures.board(Coins.hasSpot, 15e3), f = all.find(x => x.sym === s);
      if (my !== seq) return;
      if (!f) { el.innerHTML = `<p class="pad muted">${e(T("{s} không có hợp đồng vĩnh cửu USDT trên Binance Futures.", { s }))}</p>`; return; }
      const [, label, n] = PERIODS.find(p => p[0] === period);
      const [oi, fr, ls, top, tk] = await Promise.all([Futures.openInterest(f.pair, period, n), Futures.funding(f.pair, 60), Futures.longShort(f.pair, period, n), Futures.topTraders(f.pair, period, n), Futures.taker(f.pair, period, n)]);
      if (my !== seq) return;
      const oiNow = oi.at(-1);
      el.innerHTML = `<div class="dsec"><b>${e(T("Hợp đồng {p}", { p: f.pair }))}</b><span class="seg">${PERIODS.map(([k, l]) => `<button data-dp="${k}"${k === period ? ' class="on"' : ""}>${e(T(l))}</button>`).join("")}</span></div>`
        + `<div class="cards">${card(T("Giá mark"), Fmt.money(f.mark), T("Index {p}", { p: Fmt.money(f.index) }))}${card(T("Chênh mark − index"), Fmt.pct(f.basis, 3), T("dương = futures cao hơn spot"), Fmt.tone(f.basis))}`
        + card(T("Funding hiện tại"), Fmt.pct(f.funding, 4), T("≈ {y}/năm · còn {c}", { y: Fmt.pct(f.funding * 3 * 365, 1), c: BoardCols.countdown(f.next - Date.now()) }), BoardCols.C.funding.f(f).c)
        + card(T("Hợp đồng mở (OI)"), oiNow ? Fmt.moneyBig(oiNow.oiv) : "—", oiNow ? T("{q} {s}", { q: Fmt.big(oiNow.oi), s: f.sym }) : "")
        + card(T("KL futures 24h"), Fmt.moneyBig(f.qvol), Fmt.pct(f.pct) + " · 24h", Fmt.tone(f.pct)) + `</div>`
        + reads(f, ls, tk, oi)
        + `<div class="dsec"><b>${e(T("OI & funding ({l})", { l: T(label) }))}</b></div>${chartBox("dvA")}`
        + `<div class="dsec"><b>${e(T("Tỷ lệ Long/Short & taker"))}</b></div>${chartBox("dvB")}`
        + `<p class="sc-note">${e(T("Long/Short tài khoản: số tài khoản Long ÷ Short. Top trader: theo vị thế của 20% tài khoản lớn nhất. Taker mua/bán > 1: lệnh thị trường mua nhiều hơn bán. Nguồn: Binance Futures."))}</p>`;
      draw(oi, fr, ls, top, tk);
    } catch (err) {
      if (my !== seq) return;
      console.warn("DerivView.open - load futures data fail", s, err.message);
      el.innerHTML = `<div class="errbox">${e(T("Không tải được dữ liệu phái sinh từ Binance."))} <button data-dp="${period}">${e(T("Thử lại"))}</button></div>`;
    }
  }

  function close() { seq++; charts.forEach(c => c.destroy()); charts = []; }

  function wire() {
    if (wired) return; wired = true;
    $("dDeriv").addEventListener("click", ev => { const b = ev.target.closest("button[data-dp]"); if (b && ["1h", "4h", "1d"].includes(b.dataset.dp)) { period = b.dataset.dp; Prefs.set("deriv.period", period); open(sym); } });
  }

  return { open: s => { wire(); open(s); }, close };
})();
