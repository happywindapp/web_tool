// "Khuyến nghị" tab: on-demand replay of the tool's own trade plan over history (PlanBacktest) — per-horizon results table, cached 30 min per ticker.
const PlanBacktestView = (() => {
  const TITLE = { short: "Hôm nay (T+0 → T+3)", medium: "Trung hạn (1–3 tháng)", long: "Dài hạn (≥ 1 năm)" };
  const REASON = { target: "Chốt lời", stop: "Dừng lỗ", time: "Hết hạn giữ" };
  const cache = new Map();
  let seq = 0, busy = "", status = "";
  const e = s => Dom.esc(s ?? "");
  const day = t => t ? new Date(t * 1000).toISOString().slice(0, 10).split("-").reverse().join("/") : "—";
  const pct = (x, d = 1) => x == null ? "—" : `<span class="${x > 0 ? "up" : x < 0 ? "down" : ""}">${e(Fmt.signed(x * 100, d))}%</span>`;
  const hit = sym => { const c = cache.get(sym); return c && Date.now() - c.at < 30 * 60e3 ? c.res : null; };

  function table(res) {
    const R = res.results, cols = R.map(r => `<th>${e(T(TITLE[r.id]))}</th>`).join("");
    const row = (label, f) => `<tr><td>${e(T(label))}</td>${R.map(r => `<td>${f(r)}</td>`).join("")}</tr>`;
    const share = (a, b) => b ? `${a} <span class="muted">(${Fmt.en(a / b * 100, 0)}%)</span>` : "—";
    return `<div class="fscroll"><table class="dtable bt plan-bt"><thead><tr><th></th>${cols}</tr></thead><tbody>`
      + row("Giai đoạn", r => r.from ? `${day(r.from)} → ${day(r.to)}` : "—")
      + row("Khuyến nghị mua (mô phỏng / tổng)", r => `${r.buyCalls} / ${r.buyAll}`)
      + row("Vào được lệnh", r => share(r.entered, r.buyCalls))
      + row("Tỷ lệ thắng (sau phí, thuế)", r => share(r.wins, r.entered))
      + row("Lãi trung bình / lệnh", r => pct(r.avg, 2))
      + row("Lệnh tệ nhất", r => pct(r.worst))
      + row("Lãi gộp các lệnh", r => pct(r.compound))
      + row("Mua & giữ cùng kỳ", r => pct(r.bh))
      + row("Sụt giảm tối đa", r => pct(r.maxDD))
      + row("Giữ trung bình (phiên)", r => r.avgDays == null ? "—" : Fmt.en(r.avgDays, 1))
      + row("Chốt lời · dừng lỗ · hết hạn", r => r.entered ? `${r.targets} · ${r.stops} · ${r.entered - r.targets - r.stops}` : "—")
      + row("Khuyến nghị bán: giá thấp hơn sau kỳ", r => r.sellCalls ? `${share(r.sellHits, r.sellCalls)} · ${pct(r.sellAvg)}` : "—")
      + row("Trung lập (chờ)", r => `${r.neutral}`) + `</tbody></table></div>`;
  }

  function trades(r) {
    if (!r.trades.length) return "";
    const th = ["Khuyến nghị", "Vào", "Giá vào", "Giá ra", "Kết thúc", "Phiên", "Lãi / lỗ"].map(h => `<th>${e(T(h))}</th>`).join("");
    const rows = r.trades.map(t => `<tr><td>${day(t.at)}</td><td>${day(t.t0)}</td><td>${Fmt.en(t.entry, 2)}</td><td>${Fmt.en(t.exit, 2)}</td><td>${e(T(REASON[t.reason]))}</td><td>${t.days}</td><td>${pct(t.ret, 2)}</td></tr>`).join("");
    return `<details class="pad"><summary>${e(T("Lệnh gần nhất — {h} ({n})", { h: T(TITLE[r.id]), n: r.trades.length }))}</summary><div class="fscroll"><table class="dtable"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  // Section markup for the ticker: button, progress line, results (if cached).
  function html(sym) {
    const res = hit(sym), run = busy === sym, w = PlanBacktest.RULES, c = PlanBacktest.COST, label = res ? T("▶ Chạy lại kiểm chứng") : T("▶ Kiểm chứng quá khứ");
    const head = `<div class="dsec"><b>${e(T("Kiểm chứng quá khứ"))}</b> <span class="muted">${e(T("phát lại khuyến nghị của tool trên lịch sử, không nhìn trước tương lai"))}</span></div>`
      + `<p class="pad"><button class="main" data-act="planBt"${run ? " disabled" : ""}>${e(label)}</button> <span class="muted" id="planBtStatus">${e(run ? status : res ? T("Đã chạy {n} lần phát lại trong {s} giây.", { n: res.steps, s: Fmt.en(res.secs, 1) }) : "")}</span></p>`;
    if (!res) return `<div id="planBt">${head}</div>`;
    return `<div id="planBt">${head}${table(res)}${res.results.map(trades).join("")}`
      + `<p class="muted pad">${e(T("Quy tắc: khuyến nghị mua → chờ giá chạm vùng mua trong {a} / {b} / {c} phiên (hôm nay / trung / dài hạn), vào ở giá thấp hơn của giá mở cửa và đỉnh vùng mua; cổ phiếu về tài khoản T+2 mới được bán; thoát khi chạm dừng lỗ hoặc chốt lời (mục tiêu 1), nếu không thì sau {d} / {f} / {g} phiên. Cùng phiên chạm cả dừng lỗ và chốt lời tính là dừng lỗ; gap qua mức thì khớp ở giá mở cửa. Phí mua {x}%, bán {y}% (gồm thuế 0,1%), không tính trượt giá; mỗi lệnh dùng toàn bộ vốn, các lệnh không chồng nhau.", { a: w.short.entry, b: w.medium.entry, c: w.long.entry, d: w.short.hold, f: w.medium.hold, g: w.long.hold, x: Fmt.en(c.buy * 100, 2), y: Fmt.en(c.sell * 100, 2) }))}</p>`
      + `<p class="muted pad">${e(T("Khuyến nghị bán: so giá đóng cửa sau {a} / {b} / {c} phiên với giá lúc khuyến nghị. Hôm nay / trung hạn phát lại mỗi phiên trong ~2 năm gần nhất, dài hạn mỗi tuần trên toàn bộ lịch sử ({n} phiên). Dài hạn chỉ dùng mốc MA250 vì không có giá hợp lý / mục tiêu CTCK theo thời gian; không áp biên độ trần / sàn của từng phiên. Quá khứ không đảm bảo tương lai, không phải tư vấn đầu tư.", { a: w.short.win, b: w.medium.win, c: w.long.win, n: res.bars }))}</p></div>`;
  }

  const paint = sym => { const el = $("planBt"); if (el && el.isConnected) el.outerHTML = html(sym); };

  // bars: completed daily bars of sym; ex: exchange for price steps.
  async function start(sym, bars, ex) {
    if (busy === sym) return;
    const tok = ++seq;
    if (!bars || bars.length < PlanBacktest.START + 50) { busy = ""; status = ""; paint(sym); const s = $("planBtStatus"); if (s) s.textContent = T("Chưa đủ lịch sử giá (cần ≥ {n} phiên) để kiểm chứng.", { n: PlanBacktest.START + 50 }); return; }
    busy = sym; status = T("Đang phát lại lịch sử… {p}%", { p: 0 }); paint(sym);
    try {
      const t0 = performance.now();
      const res = await PlanBacktest.run(bars, ex, { cancelled: () => tok !== seq, onProgress: f => { status = T("Đang phát lại lịch sử… {p}%", { p: Fmt.en(f * 100, 0) }); const s = $("planBtStatus"); if (s) s.textContent = status; } });
      if (!res || tok !== seq) return;
      res.secs = (performance.now() - t0) / 1000;
      cache.set(sym, { at: Date.now(), res });
    } catch (err) {
      console.warn("PlanBacktestView.start - backtest fail", sym, err.message);
      if (tok === seq) { busy = ""; paint(sym); const s = $("planBtStatus"); if (s) s.textContent = T("Không chạy được kiểm chứng."); }
      return;
    }
    if (tok !== seq) return;
    busy = ""; paint(sym);
  }

  return { html, start, cancel: () => { seq++; busy = ""; } };
})();
