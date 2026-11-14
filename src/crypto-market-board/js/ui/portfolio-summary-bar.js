// ★ watchlist header bar: total value of your holdings, P&L vs average cost, allocation stripe (top 8 + others).
const PortfolioBar = (() => {
  const COLORS = ["#f7931a", "#627eea", "#14b8a6", "#eab308", "#a855f7", "#ef4444", "#22c55e", "#3b82f6"];
  const e = s => Dom.esc(s ?? "");

  // rows: watchlist rows (with .hold) or null to hide.
  function render(rows) {
    const el = $("pfBar");
    const held = rows ? rows.filter(r => r.hold && r.hold.qty > 0 && r.last > 0) : [];
    el.hidden = !held.length;
    if (!held.length) { el.innerHTML = ""; return; }
    const s = Pnl.summary(held.map(r => ({ sym: r.sym, qty: r.hold.qty, cost: r.hold.cost, price: r.last })));
    const top = s.alloc.slice(0, 8), rest = s.alloc.slice(8).reduce((t, a) => t + a.share, 0);
    const bars = top.map((a, i) => `<i style="width:${a.share.toFixed(2)}%;background:${COLORS[i]}" title="${e(a.sym)} ${Fmt.en(a.share, 1)}%"></i>`).join("")
      + (rest > 0 ? `<i style="width:${rest.toFixed(2)}%;background:var(--muted)" title="${e(T("Khác"))} ${Fmt.en(rest, 1)}%"></i>` : "");
    const legend = top.slice(0, 4).map((a, i) => `<span style="color:${COLORS[i]}">■</span> ${e(a.sym)} ${Fmt.en(a.share, 0)}%`).join(" ");
    el.innerHTML = `<span>${e(T("Vị thế của bạn"))}: <b>${e(Fmt.moneyBig(s.value))}</b></span>`
      + (s.pnl != null ? `<span>${e(T("Lãi/lỗ"))}: <b class="${Fmt.tone(s.pnl)}">${s.pnl >= 0 ? "+" : "-"}${e(Fmt.moneyBig(Math.abs(s.pnl)))} (${e(Fmt.pct(s.pnlPct))})</b></span>` : "")
      + `<span class="alloc">${bars}</span><span class="muted">${legend}</span>`
      + `<span class="muted">${e(T("Chỉ lưu trong trình duyệt này"))}</span>`;
  }

  return { render };
})();
