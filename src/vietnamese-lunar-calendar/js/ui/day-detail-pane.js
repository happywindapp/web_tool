// Day detail pane: solar/lunar hero, can chi + nạp âm, ngày tốt xấu, 12 giờ (thần + Lý Thuần Phong), xuất hành, tuổi xung, đếm ngày.
const DayDetail = (() => {
  const esc = s => Dom.esc(s);
  const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const HOURS = ["23–1", "1–3", "3–5", "5–7", "7–9", "9–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];
  const cc = p => T(CanChi.CAN[p.can]) + " " + T(CanChi.CHI[p.chi]);
  const tag = (text, cls = "") => `<span class="tag ${cls}">${esc(text)}</span>`;
  const verdict = good => tag(T(good ? "tốt" : "xấu"), good ? "good" : "bad");
  const row = (label, value) => `<dt>${esc(T(label))}</dt><dd>${value}</dd>`;
  const moonRow = m => esc(m.icon + " " + T(m.name)) + ` <small class="muted">${esc(T("tuổi trăng {a} ngày (lúc 20h)", { a: I18n.num(Math.round(m.age * 10) / 10) }))}</small>`;
  const pad = n => String(n).padStart(2, "0");
  const dmy = s => pad(s.d) + "/" + pad(s.m) + "/" + s.y;

  function moment(localJd) {
    const total = Math.round((localJd + 0.5) * 1440), day = Math.floor(total / 1440), mins = total - day * 1440, s = LunarCal.jdToDate(day);
    return T("≈{hm} ngày {d}", { hm: pad(Math.floor(mins / 60)) + ":" + pad(mins % 60), d: pad(s.d) + "/" + pad(s.m) });
  }

  // Next lunar New Year strictly after jd (or jd itself when it is mùng 1 Tết).
  function nextTet(jd, l) {
    let y = l.y + (l.m === 1 && l.d === 1 && !l.leap ? 0 : 1);
    if (y > LunarCal.MAX_YEAR) return null;
    return { y, jd: LunarCal.toJd(1, 1, y, false) };
  }

  function hero(jd, s, l) {
    const wd = LunarCal.weekday(jd);
    const month = T(l.leap ? "Tháng {m} nhuận" : "Tháng {m}", { m: l.m }) + " (" + T(l.monthLen === 30 ? "đủ" : "thiếu") + ")";
    return `<div class="hero"><div class="side solar"><small>${esc(T("Dương lịch"))}</small><b class="big${wd === 0 ? " sun" : ""}">${s.d}</b>`
      + `<span>${esc(T(WEEKDAYS[wd]))}</span><span>${esc(T("Tháng {m} năm {y}", { m: s.m, y: s.y }))}</span></div>`
      + `<div class="side lunar"><small>${esc(T("Âm lịch"))}</small><b class="big">${l.d}</b>`
      + `<span>${esc(month)}</span>`
      + `<span>${esc(T("Năm {name}", { name: cc(CanChi.year(l.y)) }) + " · " + l.y)}</span></div>`
      + `<div class="side clock-side">${AnalogClock.svg()}</div></div>`;
  }

  function hoursTable(jd, p, l) {
    let html = `<table class="hours"><thead><tr><th>${esc(T("Giờ"))}</th><th>${esc(T("Can chi"))}</th><th>${esc(T("Thần"))}</th><th>${esc(T("Lý Thuần Phong"))}</th></tr></thead><tbody>`;
    for (let h = 0; h < 12; h++) {
      const g = Almanac.hourGod(p.chi, h), ltp = Almanac.lyThuanPhong(l.m, l.d, h);
      html += `<tr class="${g.good ? "hd" : ""}"><td><b>${esc(T(CanChi.CHI[h]))}</b> <small>${HOURS[h]}h</small></td><td>${esc(cc(CanChi.hour(jd, h)))}</td>`
        + `<td>${esc(T(g.name))} ${g.good ? tag(T("hoàng đạo"), "good") : ""}</td><td>${esc(T(ltp.name))} ${verdict(ltp.good)}</td></tr>`;
    }
    return html + "</tbody></table>";
  }

  // add: { notes, weather } HTML — notes above the quote, weather after the knowledge link.
  function render(box, jd, today, add = {}) {
    const s = LunarCal.jdToDate(jd), l = LunarCal.fromJd(jd), p = CanChi.day(jd), mp = CanChi.month(l.m, l.y), yp = CanChi.year(l.y);
    const god = Almanac.dayGod(l.m, p.chi), term = CanChi.solarTerm(jd), truc = Almanac.truc(p.chi, term.idx), star = Almanac.mansion(jd);
    const km = Almanac.khongMinh(l.m, l.d), dir = Almanac.directions(p), rel = Almanac.dayRelation(p), hol = Holidays.of(s.d, s.m, l, s.y), taboo = Almanac.taboos(l.d, l.m);
    const na = q => esc(cc(q)) + ` <small class="muted">${esc(T(CanChi.napAm(q).name))}</small>`;
    const tags = [tag(T(god.name) + " · " + T(god.good ? "Hoàng đạo" : "Hắc đạo"), god.good ? "good" : "bad"),
      ...hol.map(h => tag(T(h.name), h.off ? "hol off" : "hol")), ...taboo.map(t => tag(T(t), "bad")),
      jd === today ? tag(T("Hôm nay"), "today") : tag(T(jd > today ? "Sau hôm nay {n} ngày" : "Trước hôm nay {n} ngày", { n: I18n.num(Math.abs(jd - today)) }))];
    const tet = nextTet(jd, l);
    const hoang = [...Array(12).keys()].filter(h => Almanac.hourGod(p.chi, h).good).map(h => `${esc(T(CanChi.CHI[h]))} <small>(${HOURS[h]}h)</small>`).join(", ");

    box.innerHTML = hero(jd, s, l) + `<div class="tags">${tags.join("")}</div>` + (add.notes || "") + DailyReads.html(jd) + (add.weather || "")
      + `<section><h3>${esc(T("Can chi & ngũ hành"))}</h3><dl>`
      + row("Năm", na(yp)) + row("Tháng", na(mp)) + row("Ngày", na(p)) + row("Giờ đầu ngày", esc(cc(CanChi.hour(jd, 0))))
      + row("Ngũ hành ngày", esc(T(rel.rule) + " (" + T(rel.canEl) + " – " + T(rel.chiEl) + "): " + T(rel.label)))
      + row("Tiết khí", esc(T(term.name)) + ` <small class="muted">${esc(T("từ {a} đến {b}", { a: moment(term.start), b: moment(term.end) }))}</small>`
        + (term.next ? " " + tag(T("{name} bắt đầu hôm nay", { name: T(term.next.name) }), "term") : ""))
      + row("Tuần trăng", moonRow(MoonPhase.of(jd)))
      + `</dl></section><section><h3>${esc(T("Ngày tốt xấu"))}</h3><dl>`
      + row("Giờ hoàng đạo", hoang)
      + row("Trực", esc(T(truc.name)) + `<br><small><b>${esc(T("Nên:"))}</b> ${esc(T(truc.good))}<br><b>${esc(T("Kỵ:"))}</b> ${esc(T(truc.bad))}</small>`)
      + row("Nhị thập bát tú", esc(T(star.name)) + " " + verdict(star.good))
      + row("Khổng Minh", esc(T(km.name)) + " " + verdict(km.good))
      + row("Ngày kỵ", taboo.length ? taboo.map(t => esc(T(t))).join(", ") : `<span class="muted">${esc(T("Không"))}</span>`)
      + `</dl></section><section><h3>${esc(T("Xuất hành & tuổi xung"))}</h3><dl>`
      + row("Hỷ thần", esc(T(dir.hy))) + row("Tài thần", esc(T(dir.tai)))
      + row("Hắc thần", dir.hac ? esc(T(dir.hac)) : `<span class="muted">${esc(T("Lên trời — không kỵ hướng nào"))}</span>`)
      + row("Tuổi xung ngày", Almanac.clashes(p).map(q => esc(cc(q))).join(", "))
      + row("Tuổi xung tháng", Almanac.clashes(mp).map(q => esc(cc(q))).join(", ") || `<span class="muted">${esc(T("Không"))}</span>`)
      + `</dl></section><section><h3>${esc(T("Giờ trong ngày"))}</h3>${hoursTable(jd, p, l)}</section>`
      + (tet ? `<p class="muted count">${esc(T("Còn {n} ngày đến Tết Nguyên Đán {y} ({date}).", { n: I18n.num(tet.jd - jd), y: tet.y, date: dmy(LunarCal.jdToDate(tet.jd)) }))}</p>` : "");
    AnalogClock.update(box);
  }

  // One-line summary for the status bar.
  function summary(jd) {
    const s = LunarCal.jdToDate(jd), l = LunarCal.fromJd(jd);
    return T("Dương {s} ({wd}) = Âm {l} · ngày {cc}", { s: dmy(s), wd: T(WEEKDAYS[LunarCal.weekday(jd)]), l: pad(l.d) + "/" + pad(l.m) + (l.leap ? T("n") : "") + "/" + l.y, cc: cc(CanChi.day(jd)) });
  }

  return { render, summary };
})();
