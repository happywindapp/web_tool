// Detail pane head (price, rank, ★ / 🔔 / 📊) + "Tổng quan": 24h range, market cap, tokenomics (supply, FDV), ATH / ATL, performance,
// quick Messari-style notes, and your position form (quantity, average cost, note — browser only). live() refreshes numbers, never the form.
const DetailView = (() => {
  let row = null;
  const e = s => Dom.esc(s ?? "");
  const kv = (label, value, cls = "", tip = "") => `<div${tip ? ` title="${e(tip)}"` : ""}><span>${e(label)}</span><b class="${cls}">${e(value)}</b></div>`;

  function head(r) {
    const on = Watch.has(r.sym), tone = Fmt.tone(r.pct);
    return `<div class="dh"><div><b class="dsym">${e(r.sym)}</b> <button class="star${on ? " on" : ""}" id="dStar" title="${e(on ? T("Bỏ khỏi danh mục") : T("Thêm vào danh mục"))}">${on ? "★" : "☆"}</button>`
      + (r.rank ? ` <span class="badge" title="${e(T("Hạng theo vốn hoá"))}">#${r.rank}</span>` : "") + `<div class="dname muted">${e(r.name || "")}</div></div>`
      + `<div class="dp"><b class="${tone}">${e(Fmt.money(r.last) || "—")}</b><span class="${tone}">${e(Fmt.pct(r.pct))} · 24h</span></div></div>`
      + `<div class="dact"><button id="dAlert">🔔 ${e(T("Cảnh báo"))}</button><button id="dCalc">🧮 ${e(T("Tính toán"))}</button><button id="dChart" class="chart-btn">📊 ${e(T("Biểu đồ"))}</button></div>`;
  }

  function rangeBar(r) {
    if (!(r.high > r.low) || !r.last) return "";
    const p = Math.max(0, Math.min(100, (r.last - r.low) / (r.high - r.low) * 100));
    return `<div class="rangebar" title="${e(T("Vị trí giá trong biên độ 24h"))}"><span>${e(Fmt.money(r.low))}</span><i><em style="left:${p.toFixed(1)}%"></em></i><span>${e(Fmt.money(r.high))}</span></div>`;
  }
  function supply(r) {
    const cap = r.max || r.total, pct = BoardCols.supplyPct(r);
    if (!r.circ) return "";
    return `<div class="supbar"><div><span>${e(T("Đang lưu hành"))}</span><b>${e(Fmt.big(r.circ))} ${e(r.sym)}</b>${pct != null ? `<em>${Fmt.en(pct, 1)}%</em>` : ""}</div>`
      + (pct != null ? `<i><em style="width:${pct.toFixed(1)}%"></em></i>` : "")
      + `<div class="muted">${e(T("Tổng cung {t} · Tối đa {m}", { t: r.total ? Fmt.big(r.total) : "—", m: r.max ? Fmt.big(r.max) : T("không giới hạn") }))}</div></div>`;
  }
  function perf(r) {
    const cells = [["1 giờ", r.pct1h], ["24 giờ", r.pct], ["7 ngày", r.pct7d], ["30 ngày", r.pct30d], ["1 năm", r.pct1y]].filter(([, v]) => Number.isFinite(v));
    return cells.length ? `<div class="perf">${cells.map(([k, v]) => `<div><span>${e(T(k))}</span><b class="${Fmt.tone(v)}">${e(Fmt.pct(v, 1))}</b></div>`).join("")}</div>` : "";
  }

  // Quick reads in the spirit of Messari's asset notes; thresholds are rules of thumb, not advice.
  function notes(r) {
    const out = [], cap = r.max || r.total;
    if (r.fdv && r.mcap && r.fdv / r.mcap >= 1.5) out.push(["warn", T("FDV gấp {x} lần vốn hoá: còn ~{p}% nguồn cung chưa lưu hành — lịch mở khoá token có thể tạo áp lực bán.", { x: Fmt.en(r.fdv / r.mcap, 1), p: Fmt.en((1 - r.mcap / r.fdv) * 100, 0) })]);
    if (r.circ && cap && r.circ / cap >= 0.9) out.push(["good", T("Đã lưu hành ≥ 90% nguồn cung — ít rủi ro pha loãng từ token mới.")]);
    if (r.circ && !r.max) out.push(["muted", T("Không có nguồn cung tối đa: token có thể lạm phát theo cơ chế phát hành.")]);
    if (r.qvol && r.mcap) { const t = r.qvol / r.mcap * 100; if (t >= 25) out.push(["warn", T("KL 24h bằng {p}% vốn hoá — đầu cơ rất mạnh, biến động cao.", { p: Fmt.en(t, 0) })]); else if (t < 1) out.push(["muted", T("KL 24h chỉ {p}% vốn hoá — thanh khoản thấp, dễ trượt giá.", { p: Fmt.en(t, 2) })]); }
    if (r.athPct != null && r.athPct <= -80) out.push(["muted", T("Đang thấp hơn đỉnh lịch sử {p}%.", { p: Fmt.en(-r.athPct, 0) })]);
    if (r.athPct != null && r.athPct > -5) out.push(["good", T("Đang sát / vượt đỉnh lịch sử (ATH).")]);
    return out.length ? `<ul class="insights">${out.map(([c, t]) => `<li class="${c}">${e(t)}</li>`).join("")}</ul>` : "";
  }

  function stats(r) {
    if (!r.last) return `<p class="pad muted">${e(Coins.ready() ? T("Không có dữ liệu giá cho mã này (không có cặp USDT trên Binance và không thuộc top 250 CoinGecko).") : T("Đang tải dữ liệu…"))}</p>`;
    const vm = r.qvol && r.mcap ? r.qvol / r.mcap * 100 : null;
    return rangeBar(r) + `<div class="stats">`
      + kv(T("Vốn hoá"), Fmt.moneyBig(r.mcap) || "—") + kv("FDV", Fmt.moneyBig(r.fdv) || "—", "", T("Định giá pha loãng hoàn toàn = giá × nguồn cung tối đa"))
      + kv(T("KL 24h"), Fmt.moneyBig(r.qvol) || "—") + kv(T("KL / vốn hoá"), vm == null ? "—" : Fmt.en(vm, 2) + "%", "", T("Tỷ lệ quay vòng: KL giao dịch 24h so với vốn hoá"))
      + kv("ATH", r.ath ? `${Fmt.money(r.ath)} (${Fmt.date(r.athDate)})` : "—") + kv(T("Từ ATH"), Fmt.pct(r.athPct, 1) || "—", Fmt.tone(r.athPct))
      + kv("ATL", r.atl ? `${Fmt.money(r.atl)} (${Fmt.date(r.atlDate)})` : "—") + kv(T("Từ ATL"), Fmt.pct(r.atlPct, 0) || "—", "up")
      + `</div>` + supply(r) + perf(r) + notes(r)
      + `<p class="src muted">${e(r.src === "binance" ? T("Giá realtime: Binance {p} · vốn hoá, nguồn cung: CoinGecko", { p: r.pair }) : T("Giá: CoinGecko (cập nhật 2 phút/lần)"))}</p>`;
  }

  function posResult(r) {
    const h = Holdings.get(r.sym), p = Pnl.position(h, r.last);
    if (!p) return "";
    return `<div class="stats">${kv(T("Giá trị"), Fmt.money(p.value))}${p.pnl != null ? kv(T("Lãi/lỗ"), `${p.pnl >= 0 ? "+" : "-"}${Fmt.money(Math.abs(p.pnl))} (${Fmt.pct(p.pnlPct)})`, Fmt.tone(p.pnl)) : ""}</div>`;
  }
  function posForm(r) {
    const h = Holdings.get(r.sym), v = x => x == null ? "" : String(x);
    return `<div class="dsec"><b>${e(T("Vị thế của bạn"))}</b><span class="muted">${e(T("lưu trong trình duyệt này"))}</span></div><div class="posform">`
      + `<label>${e(T("Số lượng"))}<input type="number" min="0" step="any" id="pQty" value="${e(v(h.qty))}" placeholder="0.5"></label>`
      + `<label>${e(T("Giá vốn TB (USD)"))}<input type="number" min="0" step="any" id="pCost" value="${e(v(h.cost))}" placeholder="${e(r.last ? String(+r.last.toPrecision(6)) : "")}"></label>`
      + `<label class="wide">${e(T("Ghi chú"))}<textarea id="pNote" rows="2" maxlength="2000">${e(h.note)}</textarea></label>`
      + `<button id="pSave" class="main">${e(T("Lưu vị thế"))}</button></div><div id="dPosRes">${posResult(r)}</div>`;
  }

  function render(r) {
    row = r;
    $("dHead").innerHTML = r ? head(r) : "";
    $("dOverview").innerHTML = r ? `<div id="dStats">${stats(r)}</div>${posForm(r)}` : "";
  }
  function live(r) {
    if (!r || !row || r.sym !== row.sym) return;
    row = r;
    $("dHead").innerHTML = head(r);
    const st = $("dStats"), pr = $("dPosRes");
    if (st) st.innerHTML = stats(r);
    if (pr) pr.innerHTML = posResult(r);
  }

  function init() {
    $("detail").addEventListener("click", ev => {
      const sym = row && row.sym;
      if (!sym) return;
      if (ev.target.id === "dStar") Watch.toggle(sym);
      if (ev.target.id === "dAlert") PersonalUI.openAlerts(sym);
      if (ev.target.id === "dCalc") CalcUI.open(sym);
      if (ev.target.closest("#dChart")) CoinChart.openDialog();
      if (ev.target.id === "pSave") {
        Holdings.set(sym, { qty: $("pQty").value, cost: $("pCost").value, note: $("pNote").value });
        $("dPosRes").innerHTML = posResult(row);
        Controls.say("good", "✔ Đã lưu vị thế {s}.", { s: sym });
      }
    });
  }

  return { init, render, live, current: () => row };
})();
