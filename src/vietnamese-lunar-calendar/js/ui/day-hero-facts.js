// Thông tin thêm đầu Chi tiết ngày: tuần/ngày + cung hoàng đạo, tuần trăng + đếm rằm/mùng 1, thanh tiến độ năm · lễ dương gần nhất · tiết khí.
const HeroFacts = (() => {
  const esc = s => Dom.esc(s);
  const pad = n => String(n).padStart(2, "0");

  // ISO-8601 week: the week belongs to the year of its Thursday.
  function isoWeek(jd) {
    const thu = jd - (LunarCal.weekday(jd) + 6) % 7 + 3, y = LunarCal.jdToDate(thu).y;
    return Math.floor((thu - LunarCal.jdFromDate(1, 1, y)) / 7) + 1;
  }
  const yearSpan = y => ({ first: LunarCal.jdFromDate(1, 1, y), len: LunarCal.jdFromDate(1, 1, y + 1) - LunarCal.jdFromDate(1, 1, y) });

  function solar(jd) {
    const s = LunarCal.jdToDate(jd), { first, len } = yearSpan(s.y), z = HoroDetail.ZODIAC[NatalExtra.zodiac(s.d, s.m)];
    return `<span class="hf">${esc(T("Tuần {w} · ngày {n}/{len}", { w: isoWeek(jd), n: jd - first + 1, len }))}</span>`
      + `<span class="hf">${esc(z.sym + " " + T(z.name))}</span>`;
  }

  // Next Rằm / Mùng 1 counted from jd (shown in the strip under the cards).
  function nextFull(jd) {
    const l = LunarCal.fromJd(jd);
    return l.d === 15 ? T("Hôm nay là Rằm") : l.d === 1 ? T("Hôm nay là Mùng 1")
      : l.d < 15 ? T("Còn {n} ngày tới Rằm", { n: 15 - l.d }) : T("Còn {n} ngày tới Mùng 1", { n: l.monthLen - l.d + 1 });
  }

  function lunar(jd, good) {
    const m = MoonPhase.of(jd);
    return `<span class="hf">${esc(m.icon + " " + T(m.short))}</span>`
      + `<span class="hf badge ${good ? "good" : "bad"}">${esc(good ? "✓ " + T("Hoàng đạo") : "✗ " + T("Hắc đạo"))}</span>`;
  }

  // Next solar-calendar holiday strictly after jd (within ~13 months).
  function nextHoliday(jd) {
    for (let k = jd + 1; k <= jd + 400; k++) {
      const s = LunarCal.jdToDate(k), h = Holidays.of(s.d, s.m, LunarCal.fromJd(k), s.y).find(x => !x.lunar);
      if (h) return { jd: k, s, name: h.name };
    }
    return null;
  }

  function strip(jd) {
    const s = LunarCal.jdToDate(jd), { first, len } = yearSpan(s.y), done = jd - first + 1, pct = Math.round(done / len * 1000) / 10;
    const h = nextHoliday(jd), t = CanChi.solarTerm(jd), nextName = CanChi.TERMS[(t.idx + 1) % 24];
    const days = Math.max(0, Math.ceil(t.end - (jd + 0.5)));
    const term = t.next ? T("{name} bắt đầu hôm nay", { name: T(t.next.name) }) : T("{name} · còn {n} ngày → {next}", { name: T(t.name), n: days, next: T(nextName) });
    return `<div class="hero-strip"><div class="yb" title="${esc(T("Năm {y}: {p}% · còn {n} ngày", { y: s.y, p: I18n.num(pct), n: len - done }))}">`
      + `<span class="yb-label">${esc(T("Năm {y}: {p}% · còn {n} ngày", { y: s.y, p: I18n.num(pct), n: len - done }))}</span><span class="yb-bar"><i style="width:${pct}%"></i></span></div>`
      + (h ? `<button type="button" class="lnk hs" data-jd="${h.jd}">🎉 ${esc(T("Còn {n} ngày → {date} {name}", { n: h.jd - jd, date: pad(h.s.d) + "/" + pad(h.s.m), name: T(h.name) }))}</button>` : "")
      + `<div class="hs-row"><span class="hs">🌿 ${esc(term)}</span><span class="hs">${LunarCal.fromJd(jd).d === 1 || LunarCal.fromJd(jd).d > 15 ? "🌑" : "🌕"} ${esc(nextFull(jd))}</span></div></div>`;
  }

  return { solar, lunar, strip, isoWeek };
})();
