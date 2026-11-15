// “👤 Của tôi”: hộp nhập ngày giờ sinh dương lịch + giới tính (localStorage, không vào link chia sẻ), dấu 🎂 ★ ⚠ trên lịch tháng, mục “Dành cho bạn” trong Chi tiết ngày.
const Me = (() => {
  const esc = s => Dom.esc(s);
  const pad = n => String(n).padStart(2, "0");
  const RANGE = ["23–1", "1–3", "3–5", "5–7", "7–9", "9–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];
  let o, pf = null;
  const cache = new Map();
  // Reasons carry translated names, so the cache is per language.
  const eval_ = jd => { const k = I18n.lang + jd; if (!cache.has(k)) cache.set(k, PersonalDay.day(pf, jd)); return cache.get(k); };
  const cc = p => T(CanChi.CAN[p.can]) + " " + T(CanChi.CHI[p.chi]);

  // Stored value is untrusted: integers in range only.
  function valid(v) {
    if (!v || ![v.d, v.m, v.y].every(Number.isInteger) || v.y < LunarCal.MIN_YEAR || v.y > LunarCal.MAX_YEAR) return null;
    const hour = Number.isInteger(v.hour) && v.hour >= 0 && v.hour < 24 ? v.hour : undefined, minute = hour === undefined ? undefined : Number.isInteger(v.minute) ? v.minute : 0;
    return { d: v.d, m: v.m, y: v.y, hour, minute, male: !!v.male };
  }
  function set(v) { cache.clear(); pf = v ? PersonalDay.profile(v) : null; }

  // Grid mark for a day cell: 🎂 birthday, ★ very good, ⚠ be careful.
  function mark(jd) {
    if (!pf) return "";
    const r = eval_(jd);
    const bdTitle = r.birthday === "solar" ? T("Sinh nhật dương lịch") : T("Sinh nhật âm lịch");
    if (r.birthday) return `<i class="me-mark bd" title="${esc(bdTitle)}">🎂</i>`;
    if (r.verdict === "great") return `<i class="me-mark good" title="${esc(T(PersonalText.VERDICT.great))}">★</i>`;
    if (r.verdict === "careful") return `<i class="me-mark bad" title="${esc(T(PersonalText.VERDICT.careful))}">⚠</i>`;
    return "";
  }

  function section(jd) {
    if (!pf) return `<section class="me-sec empty"><p class="muted">${esc(T("Nhập ngày giờ sinh ở nút 👤 Của tôi để xem ngày này hợp hay xung với bạn và lời khuyên riêng."))}</p></section>`;
    const r = eval_(jd), c = pf.chart, n = PersonalText.NUM[r.num], s = LunarCal.jdToDate(jd);
    const best = c.kua.dirs.find(d => d.good), dir = Almanac.directions(CanChi.day(jd));
    const lines = r.reasons.map(x => `<li class="${x.good ? "good" : "bad"}">${x.good ? "✓" : "✗"} ${esc(T(PersonalText.REASON[x.key], x.params))}</li>`).join("");
    const hours = r.hours.map(h => `<span class="tag${h.star ? " good" : ""}">${h.star ? "★ " : ""}${esc(T(CanChi.CHI[h.chi]))} ${RANGE[h.chi]}h</span>`).join(" ");
    const useful = pf.bazi.useful, colors = T(BirthChart.COLORS[useful]);
    return `<section class="me-sec ${r.verdict}"><div class="wx-head"><h3>${esc(T("👤 Dành cho bạn · tuổi {cc}, mệnh {na}", { cc: cc(c.pillars.year), na: T(c.napAm) }))}</h3>`
      + `<button type="button" class="wx-more" data-me-edit>${esc(T("✎ Sửa"))}</button></div>`
      + `<p class="me-verdict"><b>${esc(T(PersonalText.VERDICT[r.verdict]))}</b> <small class="muted">${esc(T("điểm {s}", { s: I18n.num(r.score) }))}</small></p>`
      + (r.birthday ? `<p class="me-bd">${esc(T(PersonalText.ADVICE.birthday))}</p>` : "")
      + `<ul class="me-why">${lines}</ul><p>${esc(T(PersonalText.ADVICE[r.verdict]))}</p>`
      + `<p><b>${esc(T("Số ngày cá nhân {n} · {title}", { n: r.num, title: T(n[0]) }))}</b> — ${esc(T(n[1]))}</p>`
      + `<dl><dt>${esc(T("Giờ tốt cho bạn"))}</dt><dd>${hours || esc(T("Không"))}</dd>`
      + `<dt>${esc(T("Hướng"))}</dt><dd>${esc(T(PersonalText.ADVICE.dir, { dir: T(best.dir), kind: T(best.kind), tai: T(dir.tai), hy: T(dir.hy) }))}</dd>`
      + `<dt>${esc(T("Màu"))}</dt><dd>${esc(T(PersonalText.ADVICE.color, { colors }))} <small class="muted">${esc(T("(hành {el} — dụng thần)", { el: T(CanChi.ELEMENTS[useful]) }))}</small></dd></dl>`
      + `<p class="muted me-note">${esc(T("Sinh {d}/{m}/{y}{t} · luận theo can chi, ngũ hành, thần số học — tham khảo, giải trí.", { d: pad(pf.me.d), m: pad(pf.me.m), y: pf.me.y, t: pf.me.hour === undefined ? "" : " " + pad(pf.me.hour) + ":" + pad(pf.me.minute) }))}</p></section>`;
  }

  function openDialog() {
    const v = pf ? pf.me : null;
    $("meDate").value = v ? v.y + "-" + pad(v.m) + "-" + pad(v.d) : "";
    $("meTime").value = v && v.hour !== undefined ? pad(v.hour) + ":" + pad(v.minute) : "";
    $(v && !v.male ? "meFemale" : "meMale").checked = true;
    $("meDlg").showModal();
  }

  function save() {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec($("meDate").value), t = /^(\d{2}):(\d{2})/.exec($("meTime").value);
    if (!m) { $("meDate").focus(); return; }
    const v = valid({ y: +m[1], m: +m[2], d: +m[3], hour: t ? +t[1] : undefined, minute: t ? +t[2] : undefined, male: $("meMale").checked });
    if (!v) { $("meDate").focus(); return; }
    o.store.set("me", v); set(v); $("meDlg").close(); o.onChange();
  }

  // opts: { store, onChange }
  function init(opts) {
    o = opts;
    set(valid(o.store.get("me", null)));
    $("meBtn").onclick = openDialog;
    $("meSave").onclick = save;
    $("meCancel").onclick = () => $("meDlg").close();
    $("meClear").onclick = () => { o.store.set("me", null); set(null); $("meDlg").close(); o.onChange(); };
    $("detail").addEventListener("click", e => { if (e.target.closest("[data-me-edit]")) openDialog(); });
  }

  return { init, mark, section, has: () => !!pf };
})();
