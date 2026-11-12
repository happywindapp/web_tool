// Tab Tử vi: shared render helpers + pane "Vận hạn" (2 năm, 12 tháng tới, 10 năm tới); pane "Bản mệnh" lives in HoroProfile.
const HoroView = (() => {
  const esc = s => Dom.esc(s);
  const cc = p => p ? T(CanChi.CAN[p.can]) + " " + T(CanChi.CHI[p.chi]) : T("Không rõ giờ");
  const chi = c => T(CanChi.CHI[c]);
  const tag = (text, cls = "") => `<span class="tag ${cls}">${esc(text)}</span>`;
  const row = (label, html) => `<dt>${esc(T(label))}</dt><dd>${html}</dd>`;
  const dl = rows => "<dl>" + rows.map(([label, html]) => row(label, html)).join("") + "</dl>";
  const sec = (title, body) => `<section><h3>${esc(T(title))}</h3>${body}</section>`;
  const pad = n => String(n).padStart(2, "0");
  const dmy = s => pad(s.d) + "/" + pad(s.m) + "/" + s.y;
  const verdictCls = v => v === "Tốt" || v === "Khá" ? "good" : v === "Cần thận trọng" ? "bad" : "";
  const numLine = (n, label) => label ? `<b class="num">${n}</b> ${esc(T(label))}` : "—";

  function yearCard(f, num) {
    if (f.unborn) return `<div class="year-card"><b>${esc(T("Năm {y}", { y: f.lunarYear }))}</b> <span class="muted">${esc(T("Chưa sinh."))}</span></div>`;
    const items = [[T("Sao chiếu mệnh"), T(f.star.name), HoroText.STAR[f.star.name], f.star.pts > 0 ? "good" : f.star.pts < 0 ? "bad" : ""],
      [T("Ngũ hành năm"), T(f.napAm) + " · " + T(f.rel.key), HoroText.FACTOR[f.rel.key], f.rel.pts > 0 ? "good" : f.rel.pts < 0 ? "bad" : ""]];
    if (f.thaiTue) items.push([T("Thái Tuế"), T(f.thaiTue.key), HoroText.FACTOR[f.thaiTue.key], f.thaiTue.pts > 0 ? "good" : "bad"]);
    if (f.tamTai) items.push([T("Tam Tai"), T("Phạm Tam Tai"), HoroText.FACTOR["Tam Tai"], "bad"]);
    items.push([T("Kim Lâu"), f.kimLau ? T(f.kimLau) : T("Không phạm"), f.kimLau ? HoroText.FACTOR["Kim Lâu"] : "", f.kimLau ? "bad" : "good"]);
    items.push([T("Hoang Ốc"), T(f.hoangOc.name), HoroText.FACTOR[f.hoangOc.good ? "Hoang Ốc tốt" : "Hoang Ốc xấu"], f.hoangOc.good ? "good" : "bad"]);
    const py = num.personalYear(f.lunarYear);
    items.push([T("Năm cá nhân"), String(py), HoroText.PERSONAL_YEAR[py], ""]);
    return `<div class="year-card"><div class="year-head"><b>${esc(T("Năm {y} · {cc}", { y: f.lunarYear, cc: cc(f.pair) }))}</b><span class="muted">${esc(T("{a} tuổi âm", { a: f.age }))}</span>`
      + `${tag(T(f.verdict) + " (" + (f.score > 0 ? "+" : "") + f.score + ")", verdictCls(f.verdict))}</div><p>${esc(T(HoroText.VERDICT[f.verdict]))}</p><dl>`
      + items.map(([k, v, text, cls]) => `<dt>${esc(k)}</dt><dd>${tag(v, cls)}${text ? ` <small>${esc(T(text))}</small>` : ""}</dd>`).join("") + `</dl></div>`;
  }

  function fortune(box, ctx) {
    const { chart, num, year, today } = ctx;
    const months = YearFortune.months(chart, Math.max(today, chart.jd), num);
    const mrows = months.map(m => `<tr class="${m.pts > 0 ? "hd" : ""}"><td><b>${esc(T("Tháng {m}/{y}", { m: m.m + (m.leap ? T("n") : ""), y: m.y }))}</b> <small>${esc(dmy(LunarCal.jdToDate(m.start)))}</small></td><td>${esc(cc(m.pair))}</td>`
      + `<td>${tag(T(m.kind), m.pts > 0 ? "good" : m.pts < 0 ? "bad" : "")}</td><td>${m.personalMonth ? numLine(m.personalMonth, HoroText.NUMBER[m.personalMonth]) : ""}</td></tr>`).join("");
    const far = Array.from({ length: 10 }, (_, i) => YearFortune.forYear(chart, year + 2 + i)).filter(f => !f.unborn);
    const frows = far.map(f => `<tr><td><b>${f.lunarYear}</b> <small>${esc(cc(f.pair))}</small></td><td>${f.age}</td><td>${esc(T(f.star.name))}</td>`
      + `<td>${[f.tamTai && T("Tam Tai"), f.kimLau && T("Kim Lâu"), !f.hoangOc.good && T("Hoang Ốc")].filter(Boolean).map(x => tag(x, "bad")).join(" ")}</td>`
      + `<td>${tag(T(f.verdict), verdictCls(f.verdict))}</td></tr>`).join("");
    box.innerHTML = sec("Năm nay & năm sau", yearCard(YearFortune.forYear(chart, year), num) + yearCard(YearFortune.forYear(chart, year + 1), num))
      + sec("Tương lai gần: 12 tháng âm tới", `<table class="hours"><tbody>${mrows}</tbody></table>`)
      + sec("Tương lai xa: 10 năm tiếp theo", `<table class="hours"><thead><tr><th>${esc(T("Năm"))}</th><th>${esc(T("Tuổi âm"))}</th><th>${esc(T("Sao"))}</th><th>${esc(T("Hạn"))}</th><th>${esc(T("Đánh giá"))}</th></tr></thead><tbody>${frows}</tbody></table>`)
      + `<p class="muted disclaimer">${esc(T("Luận giải theo bảng tra dân gian và thần số học, chỉ mang tính tham khảo, giải trí — không thay cho quyết định của bạn."))}</p>`;
  }

  const empty = box => { box.innerHTML = `<p class="muted">${esc(T("Nhập ngày sinh rồi bấm “Xem tử vi”, hoặc chọn một hồ sơ mẫu."))}</p>`; };

  return { fortune, empty, ui: { esc, cc, chi, tag, dl, numLine, dmy } };
})();
