// Tab SIM phong thủy — pane "Luận giải": quẻ chủ/hỗ/biến (vẽ 6 hào), Thể – Dụng, tứ trụ + dụng thần, bát tinh cặp số, cửu tinh, ý nghĩa con số, gợi ý chọn SIM.
const SimAnalysisView = (() => {
  const { esc, tag, cc, dl } = HoroView.ui;
  const el = i => T(CanChi.ELEMENTS[i]);
  const det = (title, body, open) => `<details class="sec"${open ? " open" : ""}><summary>${esc(title)}</summary>${body}</details>`;
  const para = text => `<p>${esc(text)}</p>`;
  const ratingCls = r => r === "Hung" ? "bad" : r === "Bình" ? "" : "good";
  const digitsOf = e => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => SimNumber.DIGIT_EL[d] === e);
  const { REL } = SimExplain;

  // Lines are stored bottom→top; drawn top→bottom, the moving line is highlighted.
  const draw = (h, moving) => `<div class="hex" aria-hidden="true">${h.lines.map((x, i) => `<i class="${x ? "yang" : "yin"}${i === moving - 1 ? " mv" : ""}"></i>`).reverse().join("")}</div>`;
  const hexCard = (label, h, moving) => `<div class="hex-card">${draw(h, moving)}<div><small class="muted">${esc(T(label))}</small>`
    + `<b>${esc(T("Quẻ {no}: {name}", { no: h.no, name: SimScoreView.hexName(h) }))}</b>`
    + `<span>${esc(T("{up} ({ui}) trên {low} ({li})", { up: T(h.upper.name), ui: T(h.upper.image), low: T(h.lower.name), li: T(h.lower.image) }))} ${tag(T(h.rating), ratingCls(h.rating))}</span>`
    + `<small>${esc(T(h.meaning))}</small></div></div>`;

  function hexSection(r) {
    const h = r.hex;
    return hexCard("Quẻ chủ — bản chất SIM", h.main, h.moving) + hexCard("Quẻ hỗ — diễn biến", h.mutual, 0) + hexCard("Quẻ biến — kết cục", h.changed, 0)
      + para(T("Cách gieo: 5 số đầu cộng {a} → {a} mod 8 = {ra} → thượng quái {up}; 5 số cuối cộng {b} → {b} mod 8 = {rb} → hạ quái {low}; tổng {s} mod 6 = {m} → hào {m} động.",
        { a: h.sumUp, ra: h.sumUp % 8, up: T(h.main.upper.name), b: h.sumLow, rb: h.sumLow % 8, low: T(h.main.lower.name), s: h.total, m: h.moving }))
      + para(T(REL[h.rel.key]));
  }

  function baziSection(r, chart) {
    if (!chart) return para(T("Nhập ngày sinh để xem tứ trụ, dụng thần và chấm thêm 2 tiêu chí hợp mệnh."));
    const b = r.bazi, max = Math.max(...b.strengths) || 1, P = b.pillars, dm = P.day;
    const rows = [["Năm", P.year], ["Tháng", P.month], ["Ngày", dm], ["Giờ", P.hour]].map(([k, q]) =>
      `<tr><td>${esc(T(k))}</td><td><b>${esc(cc(q))}</b></td><td>${q ? esc(el(CanChi.CAN_EL[q.can]) + " / " + el(CanChi.CHI_EL[q.chi])) : ""}</td></tr>`).join("");
    const roleCls = role => role === "dụng thần" || role === "hỷ thần" ? "good" : role === "kỵ thần" ? "bad" : "";
    const bars = b.strengths.map((n, i) => `<div class="el-row sim-el"><span>${esc(el(i))}</span><span class="el-bar"><i class="el-${i}" style="width:${Math.round(n / max * 100)}%"></i></span>`
      + `<b>${esc(I18n.num(n))}</b>${tag(T(b.role[i]), roleCls(b.role[i]))}</div>`).join("");
    return para(T("Tứ trụ bát tự: năm đổi ở Lập xuân, tháng theo tiết khí (có thể khác tab Tử vi, nơi tính theo năm/tháng âm lịch)."))
      + `<table class="hours"><tbody>${rows}</tbody></table><div class="el-chart">${bars}</div>`
      + para(T("Nhật chủ {can} ({el}) {state}: hành cùng loại và hành sinh ra nó chiếm {pct}% lực (chi tháng tính gấp đôi).",
        { can: T(CanChi.CAN[dm.can]), el: el(b.dayEl), state: T(b.strong ? "vượng" : "nhược"), pct: Math.round(b.ratio * 100) }))
      + para(T(b.strong ? "Mệnh vượng nên cần hành tiết chế (hành nó sinh ra, hành nó khắc, hành khắc nó); chọn hành yếu nhất trong số đó làm dụng thần."
        : "Mệnh nhược nên cần hành cùng loại hoặc hành sinh ra nó; hành yếu hơn trong hai hành đó là dụng thần."))
      + para(T("Dụng thần {u}, hỷ thần {h}, kỵ thần {k}. SIM hành {sim} → {role}.", { u: el(b.useful), h: el(b.favor), k: el(b.avoid), sim: el(r.el), role: T(b.role[r.el]) }));
  }

  function pairSection(r) {
    if (!r.pairs.length) return para(T("Không có cặp số nào (dãy chỉ gồm số 0 và 5)."));
    return para(T("Bỏ qua số 0 và 5 (chỉ làm ẩn hoặc tăng lực), ghép từng cặp số liền nhau: {good}/{n} cặp cát.", { good: r.goodPairs, n: r.pairs.length }))
      + `<ul class="arrows">${r.pairs.map(p => `<li><b class="num">${p.pair}</b> ${tag(T(p.star.name), p.star.good ? "good" : "bad")} <small>${esc(T(p.star.text))}</small></li>`).join("")}</ul>`;
  }

  function digitSection(r, digits) {
    const seen = [...new Set(digits)].sort((a, b) => a - b);
    const tags = r.folk.tags.map(t => tag(T(t.key, t.params), t.good ? "good" : "bad")).join(" ");
    return (tags ? `<p>${tags}</p>` : para(T("Đuôi số không thuộc dạng số đẹp hay số kiêng phổ biến.")))
      + `<ul class="arrows">${seen.map(d => `<li>${esc(T(SimText.DIGIT[d]))}</li>`).join("")}</ul>`;
  }

  function adviceSection(r) {
    const b = r.bazi, roots = e => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => SimNumber.DIGIT_EL[x] === e).join(", ");
    return dl([["Hành nên có", esc(el(b.useful) + " · " + el(b.favor))], ["Số nên nhiều", esc(digitsOf(b.useful).concat(digitsOf(b.favor)).join(", "))],
      ["Tổng rút gọn nên là", esc(roots(b.useful) + " (" + el(b.useful) + ")")], ["Số nên hạn chế", esc(digitsOf(b.avoid).join(", ") + " (" + el(b.avoid) + ")")]])
      + para(T("Ưu tiên quẻ chủ Cát/Đại cát, Dụng sinh Thể, âm dương 5/5 hoặc 4/6, nhiều cặp Sinh Khí – Thiên Y – Diên Niên."));
  }

  function render(box, ctx) {
    const { res: r, chart, num: n } = ctx;
    box.innerHTML = det(T("Quẻ Kinh Dịch (Mai Hoa)"), hexSection(r), true)
      + det(T("Tứ trụ bát tự & dụng thần"), baziSection(r, chart), true)
      + det(T("Bát tinh – năng lượng cặp số"), pairSection(r))
      + det(T("Cửu tinh đồ pháp"), para(T("Vận {p} Huyền Không (20 năm/vận, vận 9: 2024–2043): sao {v} {vn} vượng khí, {s} sinh khí, {f} {fn} thoái khí. SIM này: {state}.",
        { p: r.star.period, v: r.star.prosper, vn: T(SimText.NINE_STAR[r.star.prosper]), s: r.star.rising.map(d => d + " " + T(SimText.NINE_STAR[d])).join(", "),
          f: r.star.fading, fn: T(SimText.NINE_STAR[r.star.fading]), state: T(r.star.key) })))
      + det(T("Ý nghĩa các con số & đuôi số"), digitSection(r, n.digits))
      + (chart ? det(T("Gợi ý chọn SIM hợp mệnh"), adviceSection(r)) : "")
      + `<p class="muted disclaimer">${esc(T("Luận giải theo bảng tra dân gian và thần số học, chỉ mang tính tham khảo, giải trí — không thay cho quyết định của bạn."))}</p>`;
  }

  return { render };
})();
