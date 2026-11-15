// "Khuyến nghị" tab: backtest table of the important crosses on this ticker (SignalBacktest) — how often each fired and what price did next.
const SignalBacktestView = (() => {
  const e = s => Dom.esc(s ?? "");
  const day = t => new Date(t * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");
  const pct = v => `<span class="${v > 0 ? "up" : v < 0 ? "down" : ""}">${Fmt.signed(v, 1)}%</span>`;

  function cell(s) {
    if (!s) return `<td class="muted">—</td>`;
    const w = s.win === null ? "" : ` <span class="bt-win ${s.n >= 5 && s.win >= 60 ? "ok" : s.n >= 5 && s.win <= 40 ? "no" : ""}">${Fmt.en(s.win, 0)}%</span>`;
    return `<td>${pct(s.avg)}${w}</td>`;
  }

  // Signal with a direction, ≥ 5 samples, highest hit rate after 20 sessions.
  function best(rows) {
    const c = rows.filter(r => r.h[20] && r.h[20].win !== null && r.h[20].n >= 5).sort((a, b) => b.h[20].win - a.h[20].win)[0];
    return c && c.h[20].win >= 55 ? c : null;
  }

  function html(r) {
    if (!r) return "";
    const H = SignalBacktest.H, b = best(r.rows);
    const head = `<tr><th>${e(T("Tín hiệu"))}</th><th>${e(T("Số lần"))}</th>${H.map(h => `<th>${e(T("Sau {n} phiên", { n: h }))}</th>`).join("")}<th>${e(T("Lần gần nhất"))}</th></tr>`;
    const rows = r.rows.map(x => `<tr><td><i class="bt-dot ${x.tone}">●</i> ${e(T(ChartCrossUI.TITLE[x.kind]))}</td><td>${x.n}</td>${H.map(h => cell(x.h[h])).join("")}<td>${day(x.last)}</td></tr>`).join("");
    const base = `<tr class="bt-base"><td>${e(T("Mọi phiên (tham chiếu)"))}</td><td>—</td>${H.map(h => r.base[h] ? `<td>${pct(r.base[h].avg)} <span class="muted">${e(T("tăng {p}%", { p: Fmt.en(r.base[h].up, 0) }))}</span></td>` : "<td>—</td>").join("")}<td></td></tr>`;
    const sum = b ? T("Với mã này, tín hiệu đáng tin nhất là “{s}”: đúng hướng {w}% số lần sau 20 phiên ({n} lần).", { s: T(ChartCrossUI.TITLE[b.kind]), w: Fmt.en(b.h[20].win, 0), n: b.h[20].n })
      : T("Chưa có tín hiệu nào đúng hướng ổn định (≥ 55% sau 20 phiên, ≥ 5 lần) với mã này — đừng dựa vào một tín hiệu đơn lẻ.");
    const span = T("Dữ liệu ngày {a} – {b} · SMA 20/50, RSI 14, MACD 12-26-9, Stoch 14, ADX 14, SAR.", { a: day(r.from), b: day(r.to) });
    const note = T("Ô = lãi / lỗ trung bình sau N phiên kể từ giá đóng cửa ngày có tín hiệu · % = tỷ lệ lần giá đi đúng hướng tín hiệu (xanh ≥ 60%, đỏ ≤ 40%, cần ≥ 5 lần). Chưa trừ phí, thuế; quá khứ không bảo đảm tương lai.");
    return `<div class="dsec"><b>${e(T("Kiểm chứng tín hiệu (backtest {y} năm)", { y: SignalBacktest.YEARS }))}</b></div><p class="pad">${e(sum)} <span class="muted">${e(span)}</span></p>`
      + (r.rows.length ? `<div class="fscroll"><table class="dtable bt"><thead>${head}</thead><tbody>${rows}${base}</tbody></table></div>` : `<p class="muted pad">${e(T("Không có giao cắt nào trong giai đoạn này."))}</p>`)
      + `<p class="muted pad">${e(note)}</p>`;
  }

  return { html };
})();
