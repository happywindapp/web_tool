// "Gợi ý mua / bán" section of the Market tab: per horizon, buy ideas (good price / likely to rise) and sell ideas (price high / likely to fall).
const PicksView = (() => {
  const H = [["Short", "Ngắn hạn (1–2 tuần)"], ["Medium", "Trung hạn (1–3 tháng)"], ["Long", "Dài hạn (6–12 tháng)"]];
  const WHY = {
    Short: ["Mua: điểm kỹ thuật khung ngày ≥ 15 và RSI < 70, hoặc RSI ≤ 32 (quá bán) khi xu hướng tuần còn tăng.", "Bán: điểm kỹ thuật ngày ≤ −15 (trừ khi đang quá bán mà xu hướng tuần còn tăng) hoặc RSI ≥ 75 (quá mua)."],
    Medium: ["Mua: điểm kỹ thuật khung tuần ≥ 15, ngày không xấu; cộng điểm khi giá trên MA200 và chưa quá xa MA200.", "Bán: điểm kỹ thuật tuần ≤ −15, ngày không tốt; nặng hơn khi giá dưới MA200."],
    Long: ["Mua (giá tốt): top 100, thấp hơn đỉnh ATH ≥ 40%, giá ≤ 1,2 × MA200 ngày, xu hướng tuần chưa sụp, FDV < 2 × vốn hoá.", "Bán (giá cao): giá ≥ 1,8 × MA200, hoặc sát ATH khi đã cao hơn MA200 30%, hoặc FDV ≥ 3 × vốn hoá khi giá dưới MA200."],
  };
  const R = { day: "Kỹ thuật ngày {v}", rsi: "RSI {v}", week: "Kỹ thuật tuần {v}", odds: "Lịch sử: 5 ngày sau tăng {v}% số lần", above200: "Trên MA200", below200: "Dưới MA200",
    mayer: "Giá / MA200 = {v}", ath: "Cách ATH {v}%", fdv: "FDV / vốn hoá {v}×", ret1y: "1 năm {v}%", rank: "Hạng #{v}" };
  let hz = H.some(h => h[0] === Prefs.get("mk.hz")) ? Prefs.get("mk.hz") : "Short", res = null, resAt = 0, prog = null, err = false;
  const e = s => Dom.esc(s ?? "");
  const sg = v => v > 0 ? "+" + v : String(v);

  function list(kind, title, cls) {
    const items = res ? res[kind] : [];
    return `<div class="pick-col ${cls}"><h4>${e(T(title))}</h4>` + (items.length ? `<table class="dtable picks-t">${items.map(x => `<tr data-coin="${e(x.sym)}"><td><b>${e(x.sym)}</b><div>`
      + x.reasons.map(r => `<span class="rchip">${e(T(R[r.key], { v: ["day", "week"].includes(r.key) ? sg(r.v) : r.v }))}</span>`).join("") + `</div></td>`
      + `<td>${e(Fmt.money(Coins.row(x.sym).last || x.price))}<div class="muted">${e(T("điểm {s}", { s: x.score }))}</div></td></tr>`).join("")}</table>`
      : `<p class="pad muted">${e(T("Hiện không có coin nào đạt điều kiện."))}</p>`) + `</div>`;
  }

  function html() {
    const head = `<div class="dsec"><b>${e(T("Gợi ý mua / bán (theo quy tắc)"))}</b><span class="seg">${H.map(([k, l]) => `<button data-ph="${k}"${k === hz ? ' class="on"' : ""}>${e(T(l))}</button>`).join("")}</span></div>`;
    if (!res) return head + `<p class="pad muted">${e(err ? T("Không phân tích được (thiếu dữ liệu nến / vốn hoá).") : prog ? T("Đang phân tích {d}/{n} coin…", { d: prog[0], n: prog[1] }) : T("Đang tải…"))}</p>`;
    const buy = list("buy" + hz, hz === "Long" ? "Nên mua — giá đang tốt" : "Nên mua — có thể tăng", "buy"), sell = list("sell" + hz, hz === "Long" ? "Nên bán — giá đang cao" : "Nên bán — có thể giảm", "sell");
    return head + `<div class="picks">${buy}${sell}</div>`
      + `<p class="sc-note">${e(T(WHY[hz][0]))} ${e(T(WHY[hz][1]))} ${e(T("Xét top 60 coin có cặp USDT trên Binance (bỏ stablecoin, token bọc), nến ngày 400 phiên. Chỉ là sàng lọc theo quy tắc kỹ thuật, không phải lời khuyên đầu tư — crypto biến động rất mạnh."))}</p>`;
  }

  // repaint: redraw the Market tab once data / progress changes.
  async function load(repaint) {
    if (res && Date.now() - resAt < 900e3) return;
    try { const d = await PicksData.load((a, b) => { prog = [a, b]; if (a % 6 === 0 || a === b) repaint(); }); res = d.rows.length ? CoinPicks.rank(d.rows) : null; resAt = d.at; err = !res; }
    catch (x) { console.warn("PicksView.load - analyse picks fail", x.message); err = true; }
    repaint();
  }

  // Returns true when the horizon changed.
  function act(el) { if (el.dataset.ph && H.some(h => h[0] === el.dataset.ph)) { hz = el.dataset.ph; Prefs.set("mk.hz", hz); return true; } return false; }

  return { html, load, act };
})();
