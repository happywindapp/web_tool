// "Khuyến nghị" tab head: the tool's own buy / sell timing, buy zone · take-profit · stop for today / medium / long term, and other key notes.
const TradePlanView = (() => {
  const e = s => Dom.esc(s ?? "");
  const f2 = v => Number.isFinite(v) ? Fmt.en(v, 2) : "—";
  const sp = v => Number.isFinite(v) ? Fmt.signed(v, 1) + "%" : "—";
  const ACTION = { buy: "Mua", buyDip: "Canh mua khi điều chỉnh", probe: "Mua thăm dò", hold: "Nắm giữ, chưa mua đuổi", watch: "Quan sát, chờ phá vỡ",
    avoid: "Đứng ngoài", sellRally: "Bán khi hồi", sell: "Bán / hạ tỷ trọng" };
  const WHY = {
    buy: "Xu hướng tuần và ngày cùng tăng, chưa quá mua — có thể mua trong vùng giá bên dưới, ưu tiên nhịp chỉnh trong phiên.",
    buyDip: "Xu hướng tuần tăng nhưng khung ngày đang điều chỉnh — chờ giá về vùng hỗ trợ rồi có tín hiệu quay lên mới mua.",
    probe: "Khung tuần đi ngang, khung ngày bắt đầu tăng — mua thăm dò tỷ trọng nhỏ, mua thêm khi giá vượt kháng cự tuần.",
    hold: "Xu hướng tăng nhưng RSI ngày đã quá mua — người đang có hàng tiếp tục nắm giữ, người chưa có chờ điều chỉnh, không mua đuổi.",
    watch: "Cả tuần và ngày đều đi ngang — chờ giá phá vỡ khỏi vùng tích luỹ (kèm khối lượng) rồi mới hành động.",
    avoid: "Xu hướng chưa ủng hộ (đi ngang / giảm, có thể quá bán) — đứng ngoài, chờ tín hiệu đảo chiều rõ ràng.",
    sellRally: "Xu hướng tuần giảm, khung ngày chỉ đang hồi kỹ thuật — tận dụng nhịp hồi để bán / hạ tỷ trọng, không mua mới.",
    sell: "Xu hướng tuần và ngày cùng giảm — ưu tiên bán / hạ tỷ trọng, chưa bắt đáy.",
  };

  function timingHtml(t, D, W, today, med, sigs) {
    const buyWhen = [
      today && T("Vùng mua hôm nay {a} – {b}; đặt lệnh giới hạn (LO) gần {a} thay vì mua đuổi.", { a: f2(today.lo), b: f2(today.hi) }),
      med && T("Trung hạn: mua dần khi giá về {a} – {b} (hỗ trợ khung tuần) và có nến rút chân / MACD ngày cắt lên.", { a: f2(med.lo), b: f2(med.hi) }),
      Number.isFinite(D.resistance) && T("Mua theo đà khi giá đóng cửa vượt {r} (đỉnh 20 phiên) với khối lượng > trung bình 20 phiên.", { r: f2(D.resistance) }),
    ].filter(Boolean);
    const sellWhen = [
      today && T("Chốt lời ngắn hạn từng phần ở {a}{b}.", { a: f2(today.t1), b: today.t2 ? " → " + f2(today.t2) : "" }),
      med && T("Cắt lỗ khi giá đóng cửa dưới {s} (kế hoạch trung hạn) — không bình quân giá xuống.", { s: f2(med.stop) }),
      W && Number.isFinite(W.support) && T("Bán khi khung tuần thủng hỗ trợ {s} hoặc MACD tuần cắt xuống đường tín hiệu.", { s: f2(W.support) }),
    ].filter(Boolean);
    const sig = sigs.length ? `<ul class="checks">${sigs.slice(0, 6).map(x => `<li><i class="${x.tone === "warn" ? "na" : x.tone === "up" ? "ok" : "no"}">●</i> ${e(T(ChartCrossUI.TITLE[x.kind]))} — ${e(x.ago ? T("{n} phiên trước", { n: x.ago }) : T("phiên gần nhất"))}</li>`).join("")}</ul>`
      : `<p class="muted pad">${e(T("Không có giao cắt quan trọng trong 10 phiên gần nhất."))}</p>`;
    const frames = T("Tuần: {w} · Ngày: {d}", { w: W ? T(W.label) + " " + Fmt.signed(W.score, 0) : "—", d: T(D.label) + " " + Fmt.signed(D.score, 0) });
    const list = (title, items, cls) => `<div class="tcard"><b class="${cls}">${e(title)}</b><ul class="checks">${items.map(s => `<li>${e(s)}</li>`).join("")}</ul></div>`;
    return `<div class="dsec"><b>${e(T("Khuyến nghị thời điểm mua / bán"))}</b></div>`
      + `<p class="pad tsum"><span class="tag ${t.tone}">${e(T(ACTION[t.action]))}</span> ${e(T(WHY[t.action]))}`
      + ` <span class="muted">${e(frames)}</span></p>`
      + `<div class="tcards">${list(T("Khi nào mua"), buyWhen, "up")}${list(T("Khi nào bán"), sellWhen, "down")}`
      + `<div class="tcard"><b>${e(T("Tín hiệu giao cắt 10 phiên gần nhất"))}</b>${sig}</div></div>`;
  }

  function priceTable(rows, down) {
    const foot = down ? T("Xu hướng đang giảm: vùng mua chỉ dùng khi có tín hiệu đảo chiều; người đang có hàng ưu tiên cột Chốt lời / Dừng lỗ.")
      : T("Lãi / lỗ tính từ giữa vùng mua; R:R = lãi kỳ vọng ÷ rủi ro tới mức dừng lỗ, nên ≥ 2.");
    const cell = x => x ? `<td><b>${f2(x.lo)} – ${f2(x.hi)}</b></td><td class="up">${f2(x.t1)}${x.t2 ? ` → ${f2(x.t2)}` : ""}</td><td class="down">${f2(x.stop)}</td>`
      + `<td><span class="up">${sp(x.upPct)}</span> / <span class="down">${sp(x.stopPct)}</span>${Number.isFinite(x.rr) ? ` · R:R ${Fmt.en(x.rr, 1)}` : ""}</td>` : `<td colspan="4" class="muted">${e(T("chưa đủ dữ liệu"))}</td>`;
    return `<div class="dsec"><b>${e(T("Khuyến nghị giá mua / bán (nghìn đồng)"))}</b></div><div class="fscroll"><table class="dtable plan"><thead><tr><th>${e(T("Kỳ"))}</th><th>${e(T("Vùng mua"))}</th>`
      + `<th>${e(T("Chốt lời"))}</th><th>${e(T("Dừng lỗ"))}</th><th>${e(T("Lãi / lỗ tiềm năng"))}</th></tr></thead><tbody>`
      + rows.map(([name, how, x]) => `<tr><td><b>${e(T(name))}</b><div class="muted">${e(how)}</div></td>${cell(x)}</tr>`).join("") + `</tbody></table></div>`
      + `<p class="muted pad">${e(foot)}</p>`;
  }

  function notes(x) {
    const out = [], add = (tone, text) => out.push(`<li><i class="${tone}">${tone === "ok" ? "▲" : tone === "no" ? "▼" : "•"}</i> ${e(text)}</li>`);
    if (Number.isFinite(x.pos)) add("na", T("Tỷ trọng gợi ý tối đa ~{p}% vốn cho kế hoạch trung hạn (rủi ro 1% vốn, dừng lỗ {s}).", { p: Fmt.en(x.pos, 0), s: sp(x.med.stopPct) }));
    if (Number.isFinite(x.liq)) add(x.liq < 1 ? "no" : "ok", T(x.liq < 1 ? "Thanh khoản thấp ({v} tỷ/phiên): khó mua bán khối lượng lớn — dùng lệnh giới hạn, chia nhỏ lệnh." : "Thanh khoản {v} tỷ/phiên (TB 20 phiên).", { v: Fmt.en(x.liq, 1) }));
    if (x.L && x.L.vol > 45) add("no", T("Biến động cao ({v}%/năm): giảm tỷ trọng, chấp nhận dừng lỗ rộng hơn.", { v: Fmt.en(x.L.vol, 0) }));
    if (Number.isFinite(x.fair)) add(x.fairUp >= 15 ? "ok" : x.fairUp <= -10 ? "no" : "na", T("Giá hợp lý TB {f} ({u} so với giá hiện tại).", { f: f2(x.fair), u: sp(x.fairUp) }));
    if (x.pe && Number.isFinite(x.pe.percentile) && (x.pe.percentile >= 80 || x.pe.percentile <= 20)) add(x.pe.percentile >= 80 ? "no" : "ok", T(x.pe.percentile >= 80 ? "P/E cao hơn {p}% số ngày trong 5 năm — đắt so với lịch sử." : "P/E chỉ cao hơn {p}% số ngày trong 5 năm — rẻ so với lịch sử.", { p: Fmt.en(x.pe.percentile, 0) }));
    if (x.alt && x.alt.zone === "distress") add("no", T("Altman Z {z}: vùng rủi ro tài chính — hạn chế nắm giữ dài hạn.", { z: Fmt.en(x.alt.z, 2) }));
    if (x.pio && x.pio.known >= 6 && (x.pio.score <= 3 || x.pio.score >= 7)) add(x.pio.score >= 7 ? "ok" : "no", T(x.pio.score >= 7 ? "Piotroski {s}/9: sức khỏe tài chính tốt." : "Piotroski {s}/9: sức khỏe tài chính yếu.", { s: x.pio.score }));
    if (x.L && x.L.fromHi52 > -3) add("na", T("Sát đỉnh 52 tuần ({h}): chờ vượt đỉnh có khối lượng hoặc mua khi điều chỉnh.", { h: f2(x.L.hi52) }));
    if (x.L && x.L.fromLo52 < 5) add("no", T("Sát đáy 52 tuần ({l}): chưa có tín hiệu tạo đáy thì chưa bắt đáy.", { l: f2(x.L.lo52) }));
    if (x.t.conflict) add("na", T("Khung ngày và tuần ngược chiều — giảm khối lượng giao dịch, chờ hai khung đồng thuận."));
    if (x.cons) add(x.cons.up > x.cons.down ? "ok" : x.cons.down > x.cons.up ? "no" : "na", T("Đồng thuận CTCK 12 tháng: {b} mua · {h} trung lập · {s} bán; mục tiêu TB {a} ({u}).", { b: x.cons.up, h: x.cons.mid, s: x.cons.down, a: f2(x.cons.avg), u: sp(x.cons.upPct) }));
    if (x.cons && x.cons.up > x.cons.down && x.t.tone === "down") add("na", T("CTCK nghiêng về mua nhưng kỹ thuật đang giảm — nếu mua theo cơ bản nên giải ngân nhiều đợt."));
    add("na", T(x.band ? "Hôm nay: sàn {f} · tham chiếu {r} · trần {c}. Cổ phiếu mua hôm nay về tài khoản chiều T+2 mới bán được." : "Cổ phiếu mua hôm nay về tài khoản chiều T+2 mới bán được.", x.band || {}));
    return `<div class="dsec"><b>${e(T("Lưu ý quan trọng khác"))}</b></div><ul class="checks pad">${out.join("")}</ul>`;
  }

  // d = { list (analyst calls), tech (OutlookView.load), val (ValTab.load | null) }; q = live quote of the symbol (or null).
  function html(d, q) {
    const tech = d.tech;
    if (!tech || tech.empty || !tech.D) return "";
    const D = tech.D, W = tech.W, L = tech.L, price = q && (q.last || q.ref) || D.close, ex = q && q.ex;
    const band = q && q.ceil && q.floor ? { ceil: q.ceil, floor: q.floor, f: f2(q.floor), r: f2(q.ref), c: f2(q.ceil) } : null;
    const v = d.val && (d.val.years.length || Object.keys(d.val.r).length) ? ValTab.compute(d.val, price) : null, fair = v ? v.fair.average : null;
    const cons = consensus(d.list, price), t = TradePlan.timing(D, W);
    const today = TradePlan.fromFrame(D, ex, band), med = TradePlan.fromFrame(W, ex, null), long = TradePlan.longTerm(L, fair, cons && cons.avg, ex);
    const rows = [["Hôm nay (T+0 → T+3)", T("Pivot ngày {p} · ATR {a}", { p: f2(D.pivots.p), a: f2(D.atr) }), today],
      ["Trung hạn (1–3 tháng)", W ? T("Pivot tuần {p} · ATR tuần {a}", { p: f2(W.pivots.p), a: f2(W.atr) }) : "", med],
      ["Dài hạn (≥ 1 năm)", [Number.isFinite(fair) && T("Giá hợp lý {f}", { f: f2(fair) }), cons && T("mục tiêu CTCK {a}", { a: f2(cons.avg) }), Number.isFinite(L.ma250) && "MA250 " + f2(L.ma250)].filter(Boolean).join(" · "), long]];
    return `<div class="dsec"><b>${e(T("Khuyến nghị của tool (tự tính)"))}</b></div>` + timingHtml(t, D, W, today, med, TradePlan.recent(tech.bars || []))
      + priceTable(rows, t.tone === "down")
      + notes({ t, med, pos: med && TradePlan.position(med.stopPct, L.vol), liq: TradePlan.liquidity(tech.bars || []), L, fair, fairUp: fair ? (fair / price - 1) * 100 : null,
        pe: v && v.band.pe, alt: v && v.alt, pio: v && v.pio, cons, band })
      + `<p class="muted pad">${e(T("Khuyến nghị do tool tự tính theo quy tắc từ giá lịch sử, chỉ báo kỹ thuật, định giá và giá mục tiêu CTCK — không phải tư vấn đầu tư; luôn tự quyết định và quản lý rủi ro."))}</p>`;
  }

  // Analyst calls from the last 12 months: counts by side and their average target.
  function consensus(list, price) {
    const since = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), recent = (list || []).filter(x => (x.reportDate || "") >= since && +x.targetPrice > 0);
    if (!recent.length) return null;
    const side = x => { const c = String(x.type || "").toUpperCase(); return /BUY|OUTPERFORM|OVERWEIGHT|ADD|ACCUM/.test(c) ? 1 : /SELL|UNDER|REDUCE/.test(c) ? -1 : 0; };
    const avg = recent.reduce((s, x) => s + +x.targetPrice, 0) / recent.length;
    return { up: recent.filter(x => side(x) > 0).length, mid: recent.filter(x => !side(x)).length, down: recent.filter(x => side(x) < 0).length, avg, upPct: price ? (avg / price - 1) * 100 : null };
  }

  return { html, consensus };
})();
