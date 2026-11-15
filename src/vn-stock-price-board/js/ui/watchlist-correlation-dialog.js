// 🔗 Correlation dialog: daily-return correlation matrix of up to 20 ★ watchlist tickers + VNINDEX over 3 months / 6 months / 1 year.
const CorrelationUI = (() => {
  const MAX = 20, BENCH = "VNINDEX", PERIODS = [["3M", 92, "3 tháng"], ["6M", 183, "6 tháng"], ["1Y", 366, "1 năm"]];
  let period = PERIODS.some(p => p[0] === Prefs.get("corrPeriod")) ? Prefs.get("corrPeriod") : "6M", seq = 0;
  const e = s => Dom.esc(s ?? "");
  const dlg = () => $("toolDlg");
  const r2 = r => r === null ? "—" : Fmt.en(r, 2);
  // Positive = moves together (orange, concentration), negative = hedges (blue).
  const bg = r => r === null ? "" : `background:${r >= 0 ? `rgb(234 88 12 / ${(r * 0.8).toFixed(2)})` : `rgb(37 99 235 / ${(-r * 0.8).toFixed(2)})`}`;

  function head() {
    return `<div class="dlg-head"><b>🔗 ${e(T("Tương quan giá danh mục"))}</b><select id="corrPeriod" title="${e(T("Khoảng thời gian"))}">`
      + PERIODS.map(([k, , l]) => `<option value="${k}"${k === period ? " selected" : ""}>${e(T(l))}</option>`).join("")
      + `</select><button data-x="close" title="${e(T("Đóng (Esc)"))}">✕</button></div>`;
  }

  function show(body) {
    dlg().dataset.kind = "corr";
    dlg().innerHTML = head() + body;
    if (!dlg().open) dlg().showModal();
  }

  function result(x, skipped) {
    const grid = `<div class="fscroll"><table class="dtable corr"><thead><tr><th></th>${x.syms.map(s => `<th>${e(s)}</th>`).join("")}</tr></thead><tbody>`
      + x.syms.map((s, i) => `<tr><th>${e(s)}</th>${x.m[i].map((r, j) => `<td style="${i === j ? "" : bg(r)}"${i === j ? ' class="muted"' : ""}>${r2(r)}</td>`).join("")}</tr>`).join("")
      + `</tbody></table></div>`;
    const pair = p => `<li><b>${e(p.a)} – ${e(p.b)}</b> ${r2(p.r)}</li>`;
    const level = x.avg === null ? "" : T(x.avg >= 0.6 ? "Các mã đi cùng nhau rất sát — danh mục tập trung rủi ro, nên thêm mã khác ngành." : x.avg >= 0.35 ? "Mức tương quan trung bình — đa dạng hoá ở mức vừa." : "Tương quan thấp — danh mục được đa dạng hoá tốt.");
    const avg = x.avg === null ? "" : T("Tương quan trung bình giữa các mã: {r}.", { r: r2(x.avg) });
    const skip = skipped.length ? `<p class="muted pad">${e(T("Bỏ qua (không đủ dữ liệu): {s}", { s: skipped.join(", ") }))}</p>` : "";
    return `<p class="pad"><b>${e(avg)}</b> ${e(level)}</p>${grid}`
      + (x.pairs.length ? `<div class="corr-pairs"><div><b class="down">${e(T("Đi cùng nhau nhất"))}</b><ul>${x.pairs.slice(0, 3).map(pair).join("")}</ul></div>`
        + `<div><b class="up">${e(T("Bù trừ nhau tốt nhất"))}</b><ul>${x.pairs.slice(-3).reverse().map(pair).join("")}</ul></div></div>` : "")
      + skip + `<p class="muted pad">${e(T("Hệ số tương quan Pearson của % thay đổi giá ngày, chỉ tính các phiên cả hai mã cùng có giá (≥ {n} phiên): 1 = luôn cùng chiều, 0 = không liên quan, −1 = ngược chiều. Hàng / cột {b} cho biết mã đi theo thị trường chung đến mức nào.", { n: Correlation.MIN, b: BENCH }))}</p>`;
  }

  async function open() {
    const syms = Watch.all().filter(s => !Feed.isFuture(s)).slice(0, MAX), my = ++seq;
    if (syms.length < 2) { show(`<p class="muted pad">${e(T("Cần ít nhất 2 mã trong ★ Danh mục để tính tương quan."))}</p>`); return; }
    show(`<p class="muted pad">${e(T("Đang tải giá {n} mã…", { n: syms.length + 1 }))}</p>`);
    const days = PERIODS.find(p => p[0] === period)[1], now = Math.floor(Date.now() / 1000), all = [BENCH, ...syms], bars = new Map();
    let next = 0;
    const worker = async () => {
      while (next < all.length) {
        const s = all[next++];
        try { bars.set(s, await History.load(s, "D", now - days * 86400, now)); } catch (err) { console.warn("CorrelationUI.open - get daily bars fail", s, err); }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    if (my !== seq || !dlg().open || dlg().dataset.kind !== "corr") return;
    const ok = all.filter(s => (bars.get(s) || []).length > Correlation.MIN), skipped = all.filter(s => !ok.includes(s));
    if (ok.length < 2) { show(`<p class="muted pad">${e(T("Không tải được dữ liệu giá (VNDirect). Thử lại sau."))}</p>`); return; }
    show(result(Correlation.matrix(ok.map(s => ({ sym: s, bars: bars.get(s) })), ok[0] === BENCH), skipped));
    if (Watch.all().length > MAX) dlg().insertAdjacentHTML("beforeend", `<p class="muted pad">${e(T("Chỉ tính {n} mã đầu tiên của danh mục.", { n: MAX }))}</p>`);
  }

  function init() {
    $("corrBtn").onclick = open;
    dlg().addEventListener("change", ev => {
      if (ev.target.id !== "corrPeriod") return;
      period = ev.target.value; Prefs.set("corrPeriod", period); open();
    });
  }

  return { init, open };
})();
