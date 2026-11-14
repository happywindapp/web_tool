// 🧮 calculators: DCA backtest on Binance daily candles, coin ↔ USD ↔ VND converter, futures liquidation / P&L, risk-based position size.
const CalcUI = (() => {
  const TABS = [["dca", "DCA backtest"], ["conv", "Quy đổi"], ["fut", "Futures"], ["size", "Khối lượng theo rủi ro"]];
  let tab = "dca", sym = "BTC", chart = null, seq = 0;
  const e = s => Dom.esc(s ?? "");
  const v = id => +($(id) && $(id).value);
  const field = (id, label, val, type = "number", extra = "") => `<label>${e(T(label))}<input type="${type}" id="${id}" value="${e(val)}" ${type === "number" ? 'min="0" step="any"' : 'spellcheck="false" autocomplete="off"'} ${extra}></label>`;
  const out = (label, value, cls = "") => `<div class="card"><span>${e(label)}</span><b class="${cls}">${e(value)}</b></div>`;
  const yearAgo = () => new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const price = s => { const u = s.toUpperCase(); if (u === "USD" || u === "USDT") return 1; if (u === "VND") return Currency.rate() ? 1 / Currency.rate() : null; const r = Coins.row(CoinParse.norm(u)); return r.last || null; };

  function form() {
    const last = Coins.row(sym).last, lp = last ? String(+last.toPrecision(6)) : "";
    if (tab === "dca") return field("cSym", "Coin", sym, "text") + field("cAmt", "Mỗi lần mua (USD)", 100)
      + `<label>${e(T("Tần suất"))}<select id="cEvery"><option value="day">${e(T("Hằng ngày"))}</option><option value="week" selected>${e(T("Hằng tuần"))}</option><option value="month">${e(T("Hằng tháng"))}</option></select></label>`
      + field("cFrom", "Bắt đầu từ", yearAgo(), "date") + `<button class="main" data-c="run">${e(T("Chạy backtest"))}</button>`;
    if (tab === "conv") return field("cAmt", "Số lượng", 1) + field("cFromC", "Từ (coin / USD / VND)", sym, "text") + field("cTo", "Sang", "VND", "text");
    if (tab === "fut") return `<label>${e(T("Chiều"))}<select id="cSide"><option value="long">Long</option><option value="short">Short</option></select></label>`
      + field("cEntry", "Giá vào lệnh", lp) + field("cLev", "Đòn bẩy (x)", 10) + field("cMargin", "Ký quỹ (USD)", 100) + field("cExit", "Giá chốt dự kiến", "") + field("cMmr", "Tỷ lệ ký quỹ duy trì (%)", 0.5);
    return field("cBal", "Vốn tài khoản (USD)", 1000) + field("cRisk", "Rủi ro mỗi lệnh (%)", 1) + field("cEntry", "Giá vào lệnh", lp) + field("cStop", "Giá cắt lỗ", last ? String(+(last * 0.95).toPrecision(6)) : "");
  }

  function compute() {
    const box = $("cOut");
    if (!box) return;
    if (tab === "conv") {
      const a = v("cAmt"), pf = price($("cFromC").value || ""), pt = price($("cTo").value || ""), r = Calc.convert(a, pf, pt);
      box.innerHTML = r == null ? `<p class="muted">${e(T("Nhập số lượng và mã hợp lệ (coin có giá, USD, VND — VND cần tỷ giá USDT/VND đã tải)."))}</p>`
        : `<div class="cards">${out(`${Fmt.qty(a)} ${$("cFromC").value.toUpperCase()}`, `${Fmt.qty(r)} ${$("cTo").value.toUpperCase()}`)}${out(T("Giá quy đổi"), `1 ${$("cFromC").value.toUpperCase()} = ${Fmt.qty(pf / pt)} ${$("cTo").value.toUpperCase()}`)}</div>`;
    }
    if (tab === "fut") {
      const r = Calc.futures({ side: $("cSide").value, entry: v("cEntry"), lev: v("cLev"), margin: v("cMargin"), exit: v("cExit"), mmr: v("cMmr") });
      box.innerHTML = !r ? `<p class="muted">${e(T("Nhập giá vào, đòn bẩy ≥ 1 và ký quỹ > 0."))}</p>` : `<div class="cards">${out(T("Giá trị vị thế"), "$" + Fmt.big(r.notional))}${out(T("Số lượng"), Fmt.qty(r.qty))}`
        + out(T("Giá thanh lý (ước tính)"), "$" + Fmt.price(r.liq), "down") + out(T("Khoảng cách tới thanh lý"), Fmt.pct(r.liqDist, 2), "down")
        + (r.pnl != null ? out(T("Lãi/lỗ tại giá chốt"), (r.pnl >= 0 ? "+$" : "-$") + Fmt.big(Math.abs(r.pnl)), Fmt.tone(r.pnl)) + out("ROE", Fmt.pct(r.roe, 1), Fmt.tone(r.roe)) : "")
        + `</div><p class="muted">${e(T("Ước tính cho ký quỹ isolated, hợp đồng USDT tuyến tính, chưa tính phí và funding. Sàn tính giá thanh lý theo bậc ký quỹ thực tế."))}</p>`;
    }
    if (tab === "size") {
      const r = Calc.size({ balance: v("cBal"), riskPct: v("cRisk"), entry: v("cEntry"), stop: v("cStop") });
      box.innerHTML = !r ? `<p class="muted">${e(T("Nhập vốn, % rủi ro, giá vào và giá cắt lỗ khác nhau."))}</p>` : `<div class="cards">${out(T("Số tiền chấp nhận mất"), "$" + Fmt.en(r.risk, 2))}`
        + out(T("Khối lượng nên vào"), Fmt.qty(r.qty)) + out(T("Giá trị vị thế"), "$" + Fmt.big(r.notional)) + out(T("Đòn bẩy cần"), Fmt.en(r.lev, 2) + "x") + out(T("Khoảng cắt lỗ"), Fmt.pct(r.stopPct, 2), "down") + `</div>`;
    }
  }

  async function runDca() {
    const s = CoinParse.norm($("cSym").value), pair = Coins.pair(s), box = $("cOut"), my = ++seq;
    if (!pair) { box.innerHTML = `<p class="muted">${e(T("{s} không có cặp USDT trên Binance.", { s }))}</p>`; return; }
    box.innerHTML = `<p class="muted">${e(T("Đang tải nến ngày…"))}</p>`;
    try {
      const bars = await Spot.klines(pair, "1d", 3000), from = Date.parse($("cFrom").value) / 1000 || 0;
      if (my !== seq) return;
      const r = Calc.dca(bars, { amount: v("cAmt"), every: $("cEvery").value, from });
      if (!r) { box.innerHTML = `<p class="muted">${e(T("Không có dữ liệu trong khoảng này."))}</p>`; return; }
      box.innerHTML = `<div class="cards">${out(T("Số lần mua"), Fmt.en(r.buys))}${out(T("Tổng vốn"), "$" + Fmt.big(r.invested))}${out(T("Giá trị hiện tại"), "$" + Fmt.big(r.value), Fmt.tone(r.roi))}`
        + out(T("Lợi nhuận DCA"), Fmt.pct(r.roi, 1), Fmt.tone(r.roi)) + out(T("Giá vốn TB"), "$" + Fmt.price(r.avgCost)) + out(T("Nếu mua 1 lần từ đầu"), Fmt.pct(r.lumpRoi, 1), Fmt.tone(r.lumpRoi)) + `</div>`
        + `<div class="cbox sc-box"><div class="clegend" id="cChartL"></div><div class="chost" id="cChartH"></div></div>`
        + `<p class="muted">${e(T("Mua tại giá đóng cửa ngày đầu mỗi kỳ (Binance {p}), chưa tính phí. Kết quả quá khứ không bảo đảm tương lai.", { p: pair }))}</p>`;
      if (chart) chart.destroy();
      chart = SeriesChart.create($("cChartH"), { legend: $("cChartL"), fmt: x => "$" + Fmt.big(x) });
      chart.set([{ title: T("Giá trị"), type: "area", color: "#22c55e", data: r.curve.map(c => ({ time: c.time, value: c.value })) }, { title: T("Vốn đã bỏ"), color: "#94a3b8", data: r.curve.map(c => ({ time: c.time, value: c.invested })) }]);
    } catch (err) { if (my === seq) { console.warn("CalcUI.runDca - load klines fail", pair, err.message); box.innerHTML = `<div class="errbox">${e(T("Không tải được nến từ Binance."))}</div>`; } }
  }

  function render() {
    const dlg = $("toolDlg");
    dlg.dataset.kind = "calc";
    dlg.innerHTML = `<div class="dlg-head"><b>🧮 ${e(T("Công cụ tính"))}</b><button data-c="close">✕</button></div>`
      + `<nav class="dtabs">${TABS.map(([k, l]) => `<button data-c="tab" data-v="${k}"${k === tab ? ' class="on"' : ""}>${e(T(l))}</button>`).join("")}</nav>`
      + `<div class="dlg-body"><div class="posform">${form()}</div><div id="cOut"></div></div>`;
    if (chart) { chart.destroy(); chart = null; }
    compute();
  }

  function open(s) { if (CoinParse.isSymbol(s)) sym = s; render(); if (!$("toolDlg").open) $("toolDlg").showModal(); }

  function init() {
    $("calcBtn").onclick = () => open(Board.state().sel);
    const dlg = $("toolDlg");
    dlg.addEventListener("click", ev => {
      if (dlg.dataset.kind !== "calc") return;
      const b = ev.target.closest("[data-c]");
      if (!b) return;
      if (b.dataset.c === "close") dlg.close();
      if (b.dataset.c === "tab") { tab = b.dataset.v; render(); }
      if (b.dataset.c === "run") runDca();
    });
    dlg.addEventListener("input", () => { if (dlg.dataset.kind === "calc" && tab !== "dca") compute(); });
    dlg.addEventListener("close", () => { if (chart) { chart.destroy(); chart = null; } });
  }

  return { init, open };
})();
