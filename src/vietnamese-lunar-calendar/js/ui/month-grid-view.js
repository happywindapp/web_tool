// Month grid (Monday first): solar day big, lunar day small ("1/10" on mùng 1), weather, holiday / tiết khí / can chi line, hoàng đạo dot.
const MonthGrid = (() => {
  const WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const esc = s => Dom.esc(s);

  const moon = jd => { const m = MoonPhase.of(jd); return `<i class="moon" title="${esc(T(m.name))}">${m.icon}</i>`; };
  const lunarLabel = l => l.d === 1 ? `${l.d}/${l.m}${l.leap ? T("n") : ""}` : String(l.d);

  // Facts for one day used by both the cell and the event list.
  function dayInfo(jd) {
    const s = LunarCal.jdToDate(jd), l = LunarCal.fromJd(jd), p = CanChi.day(jd);
    return { jd, s, l, p, god: Almanac.dayGod(l.m, p.chi), hol: Holidays.of(s.d, s.m, l, s.y), term: CanChi.solarTerm(jd).next };
  }

  function cell(info, o) {
    const { jd, s, l, god, hol, term } = info, wd = LunarCal.weekday(jd), w = o.wx && o.wx[jd];
    const cls = ["day", s.m !== o.m && "out", wd === 0 && "sun", wd === 6 && "sat", jd === o.today && "today", jd === o.sel && "sel",
      hol.some(h => h.off) && "off", l.d === 1 && "first", l.d === 15 && "full", god.good && "hd"].filter(Boolean).join(" ");
    const ev = hol.length ? T(hol[0].name) : term ? T(term.name) : o.cc ? T(CanChi.CAN[info.p.can]) + " " + T(CanChi.CHI[info.p.chi]) : "";
    const title = T("Âm {d}/{m}/{y}", { d: l.d, m: l.m + (l.leap ? T("n") : ""), y: l.y }) + " · " + T(CanChi.CAN[info.p.can]) + " " + T(CanChi.CHI[info.p.chi])
      + " · " + T(god.name) + " (" + T(god.good ? "hoàng đạo" : "hắc đạo") + ")" + hol.map(h => " · " + T(h.name)).join("") + (o.notes && o.notes.has(jd) ? " · " + T("📝 Có ghi chú") : "") + (w ? " · " + WeatherView.line(w) : "");
    return `<button type="button" class="${cls}" data-jd="${jd}" data-pane-go="1" tabindex="${jd === o.sel ? 0 : -1}" title="${esc(title)}" aria-pressed="${jd === o.sel}">`
      + `<span class="sd">${s.d}${o.notes && o.notes.has(jd) ? '<i class="nmark" aria-hidden="true">📝</i>' : ""}${o.me ? o.me(jd) : ""}</span><span class="ld">${o.moon ? moon(jd) : ""}${esc(lunarLabel(l))}</span>${god.good ? '<i class="dot" aria-hidden="true"></i>' : ""}${WeatherView.cell(w)}`
      + `<span class="ev${hol.length ? " hol" : term ? " term" : ""}">${esc(ev)}</span></button>`;
  }

  // o: { y, m, sel, today, cc, moon, wx: { [jd]: day weather } | null, notes: Set of jd having day notes, me: jd → personal mark HTML } → { html, events, lunarFrom, lunarTo }
  function build(o) {
    const first = LunarCal.jdFromDate(1, o.m, o.y), days = LunarCal.jdFromDate(1, o.m % 12 + 1, o.y + (o.m === 12 ? 1 : 0)) - first;
    const lead = (LunarCal.weekday(first) + 6) % 7, total = Math.ceil((lead + days) / 7) * 7, events = [];
    let html = WEEK.map((w, i) => `<div class="wd${i === 6 ? " sun" : i === 5 ? " sat" : ""}">${esc(T(w))}</div>`).join("");
    for (let i = 0; i < total; i++) {
      const info = dayInfo(first - lead + i);
      html += cell(info, o);
      if (info.s.m === o.m) {
        for (const h of info.hol) events.push({ jd: info.jd, d: info.s.d, name: h.name, off: h.off, lunar: h.lunar });
        if (info.term) events.push({ jd: info.jd, d: info.s.d, name: info.term.name, term: true });
      }
    }
    return { html, events, lunarFrom: LunarCal.fromJd(first), lunarTo: LunarCal.fromJd(first + days - 1) };
  }

  return { build };
})();
