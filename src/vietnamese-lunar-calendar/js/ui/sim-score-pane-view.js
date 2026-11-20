// Tab SIM phong thủy — pane "Chấm điểm": số + tổng điểm/10, dải chữ số (âm dương, ngũ hành), tổng kết, 8 tiêu chí kèm kết quả, ý nghĩa, cách tính.
const SimScoreView = (() => {
  const { esc, tag } = HoroView.ui;
  const el = i => T(CanChi.ELEMENTS[i]);
  const num = x => I18n.num(Math.round(x * 100) / 100);
  const hexName = h => I18n.lang === "en" ? T(h.name) + " (" + h.name + ")" : h.name;
  const kCls = k => k === null ? "" : k >= 0.75 ? "good" : k < 0.4 ? "bad" : "";
  const verdictCls = v => v === "Rất tốt" || v === "Tốt" ? "good" : v === "Chưa hợp" ? "bad" : "";
  const { NAME, HOW } = SimExplain;

  function result(c, r, chart) {
    const needBirth = T("Cần ngày sinh");
    switch (c.id) {
      case "yinyang": return T("{even} số chẵn (âm) · {odd} số lẻ (dương)", { even: c.yy.even, odd: c.yy.odd })
        + (c.yy.wantEven === null ? "" : " · " + T(c.yy.wantEven ? "can năm dương nên cần nghiêng âm" : "can năm âm nên cần nghiêng dương"));
      case "natal": return c.nat ? T("SIM hành {sim} · mệnh {menh} ({el})", { sim: el(r.el), menh: T(chart.napAm), el: el(chart.el) }) + " — " + T(c.nat.key) : needBirth;
      case "useful": return r.bazi ? T("SIM hành {sim} là {role} · dụng thần {u}, hỷ thần {h}", { sim: el(r.el), role: T(r.bazi.role[r.el]), u: el(r.bazi.useful), h: el(r.bazi.favor) }) : needBirth;
      case "main": return hexName(r.hex.main) + " · " + T(r.hex.main.rating);
      case "mutual": return hexName(r.hex.mutual) + " · " + T(r.hex.mutual.rating);
      case "tidung": return T("Thể {the} ({te}) · Dụng {dung} ({de}) — {rel}", { the: T(r.hex.the.name), te: el(r.hex.the.el), dung: T(r.hex.dung.name), de: el(r.hex.dung.el), rel: T(r.hex.rel.key) });
      case "nine": return T("Vận {p}: số vượng {v} · sinh khí {s} — {state}", { p: c.star.period, v: c.star.prosper, s: c.star.rising.join(", "), state: T(c.star.key) });
      default: return T("{nut} nút · {good}/{n} cặp số cát", { nut: r.nut, good: r.goodPairs, n: r.pairs.length })
        + r.folk.tags.map(t => " · " + T(t.key, t.params)).join("");
    }
  }

  function criterion(c, r, chart) {
    const pct = c.pts === null ? 0 : Math.round(c.pts / c.max * 100);
    const pts = c.pts === null ? "—" : num(c.pts) + "/" + num(c.max);
    return `<div class="crit ${c.pts === null ? "off" : ""}"><div class="crit-head"><b>${esc(T(NAME[c.id]))}</b>${tag(pts, kCls(c.k))}</div>`
      + `<span class="el-bar"><i class="crit-${kCls(c.k) || "mid"}" style="width:${pct}%"></i></span>`
      + `<p>${esc(result(c, r, chart))}</p><p class="crit-why">${esc(SimExplain.why(c, r))}</p><small class="muted">${esc(T("Cách tính: {how}", { how: T(HOW[c.id]) }))}</small></div>`;
  }

  function summaryBlock(r) {
    const s = SimExplain.summary(r), none = T("không có");
    return `<section class="sim-summary"><h3>${esc(T("Tổng kết"))}</h3><p><b>${esc(s.advice)}</b></p><dl>`
      + `<dt>${esc(T("Điểm mạnh"))}</dt><dd>${esc(s.strong || none)}</dd><dt>${esc(T("Cần cân nhắc"))}</dt><dd>${esc(s.weak || none)}</dd></dl></section>`;
  }

  function digitsStrip(digits) {
    const yy = d => d % 2 ? T("dương") : T("âm");
    return `<div class="sim-digits">` + digits.map(d => `<span><b>${d}</b><i class="el-${SimNumber.DIGIT_EL[d]}"></i>`
      + `<small>${esc(el(SimNumber.DIGIT_EL[d]))}</small><small>${esc(yy(d))}</small></span>`).join("") + `</div>`;
  }

  function render(box, ctx) {
    const { num: n, res: r, chart, carrier } = ctx;
    const owner = chart ? T("{sex} · sinh {date} · tuổi {cc} · mệnh {menh}", { sex: T(ctx.male ? "Nam giới" : "Nữ giới"), date: HoroView.ui.dmy(ctx.birth) + (ctx.time ? " " + ctx.time : ""),
      cc: HoroView.ui.cc(chart.pillars.year), menh: T(chart.napAm) }) : T("Chưa nhập ngày sinh: chỉ chấm các tiêu chí của riêng dãy số, quy về thang 10.");
    box.innerHTML = `<div class="horo-hero sim-hero"><div><b class="sim-no">${esc(SimNumber.pretty(n.text))}</b>`
      + `<span>${esc(carrier || T("Không rõ nhà mạng"))} · ${esc(T("tổng {sum} · {nut} nút", { sum: r.sum, nut: r.nut }))}</span><small class="muted">${esc(owner)}</small></div>`
      + `<div class="sim-total"><b>${esc(I18n.num(r.score))}</b><span>/10</span>${tag(T(r.verdict), verdictCls(r.verdict))}${r.capped ? tag(T("Quẻ chủ Hung"), "bad") : ""}</div></div>`
      + digitsStrip(n.digits) + summaryBlock(r)
      + `<section><h3>${esc(T("Chấm điểm 8 tiêu chí"))}</h3>${r.criteria.map(c => criterion(c, r, chart)).join("")}`
      + `<p class="muted">${esc(T("Tổng {total}/{max} điểm → {score}/10.", { total: num(r.total), max: num(r.max), score: I18n.num(r.raw) }))}</p>`
      + (r.capped ? `<p>${tag(T("Quẻ chủ Hung"), "bad")} ${esc(T("Điểm bị giới hạn ở {cap}/10: các trang xem SIM đều coi quẻ chủ là yếu tố quyết định, quẻ hung thì không nên dùng dù tiêu chí khác cao.", { cap: I18n.num(r.score) }))}</p>` : "")
      + `</section>`
      + `<p class="muted disclaimer">${esc(T("Chấm theo phương pháp phổ biến của các trang xem SIM phong thủy (Kinh Dịch Mai Hoa, ngũ hành, tứ trụ, cửu tinh, dân gian) — chỉ mang tính tham khảo, giải trí."))}</p>`;
  }

  const empty = box => { box.innerHTML = `<p class="muted">${esc(T("Nhập số SIM (và ngày sinh chủ SIM nếu có) rồi bấm “Chấm điểm SIM”."))}<span class="demo-picker"> ${esc(T("Hoặc chọn một mẫu."))}</span></p>`; };

  return { render, empty, hexName };
})();
