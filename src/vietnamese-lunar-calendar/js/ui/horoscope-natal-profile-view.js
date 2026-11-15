// Pane "Bản mệnh": tổng quan, tứ trụ + cân bằng ngũ hành + nhật chủ, mệnh nạp âm, con giáp, cung hoàng đạo, ngày sinh theo lịch, bát trạch, thần số học.
const HoroProfile = (() => {
  const { esc, cc, chi, tag, dl, numLine, dmy } = HoroView.ui;
  const pad = n => String(n).padStart(2, "0");
  const det = (title, body, open) => `<details class="sec"${open ? " open" : ""}><summary>${esc(title)}</summary>${body}</details>`;
  const para = text => `<p>${esc(text)}</p>`;
  const el = i => T(CanChi.ELEMENTS[i]);

  function balance(c) {
    const b = NatalExtra.elementBalance(c.pillars), max = Math.max(...b.counts) || 1;
    const bars = b.counts.map((n, i) => `<div class="el-row"><span>${esc(el(i))}</span><span class="el-bar"><i class="el-${i}" style="width:${Math.round(n / max * 100)}%"></i></span><b>${n}</b></div>`).join("");
    const fix = i => T("Cách bổ sung: màu {colors}, hướng {dirs}.", { colors: T(BirthChart.COLORS[i]), dirs: T(HoroDetail.ELEMENT[i].dirs) });
    const summary = T("Hành vượng: {strong}.", { strong: b.strong.map(el).join(", ") }) + " " + (b.missing.length ? "" : T("Đủ cả 5 hành — ngũ hành khá cân bằng."));
    const strong = b.strong.map(i => T(NatalExplain.STRONG[i])), weak = b.missing.map(i => T(NatalExplain.WEAK[i]) + " " + fix(i));
    return `<div class="el-chart">${bars}</div>` + para(summary) + strong.concat(weak).map(para).join("");
  }

  // Short portrait combining age, nạp âm imagery, day master and kua.
  function portrait(c, yp, dm, name) {
    return para(T("{who} tuổi {cc} ({animal}), mệnh {na} thuộc hành {el}, nhật chủ {dm}, cung mệnh {kua} ({group} tứ mệnh).", { who: name || T("Bạn"),
      cc: cc(yp), animal: T(HoroDetail.ANIMAL_NAME[yp.chi]), na: T(c.napAm), el: el(c.el), dm: T(CanChi.CAN[dm.can]), kua: T(c.kua.name), group: T(c.kua.group) }))
      + para(T("Hình tượng mệnh: {text}", { text: T(NatalExplain.NAP_AM[CanChi.NAP_AM.indexOf(c.napAm)]) }));
  }

  const PILLARS = ["Năm", "Tháng", "Ngày", "Giờ"];
  const pillarMeaning = () => `<ul class="arrows">${PILLARS.map((k, i) => `<li><b>${esc(T("Trụ {k}", { k: T(k) }))}</b>: ${esc(T(NatalExplain.PILLAR[i]))}</li>`).join("")}</ul>`;
  const compatRow = (names, key) => esc(names) + `<br><small class="muted">${esc(T(NatalExplain.COMPAT[key]))}</small>`;

  function birthGrid(birth) {
    const g = NatalExtra.birthGrid(birth), order = [3, 6, 9, 2, 5, 8, 1, 4, 7];
    const cells = order.map(n => `<span class="${g.counts[n] ? "" : "empty"}">${g.counts[n] ? String(n).repeat(g.counts[n]) : "·"}</span>`).join("");
    const arrows = g.arrows.map(a => { const [fullName, fullText, emptyName, emptyText] = HoroDetail.ARROW[a.key];
      return `<li>${tag(T(a.full ? fullName : emptyName), a.full ? "good" : "bad")} ${esc(T(a.full ? fullText : emptyText))}</li>`; }).join("");
    return `<div class="birth-grid" data-i18n-skip>${cells}</div>`
      + (g.missing.length ? para(T("Số vắng trong ngày sinh: {list}.", { list: g.missing.join(", ") })) : "")
      + (arrows ? `<ul class="arrows">${arrows}</ul>` : para(T("Không có mũi tên đặc biệt trong biểu đồ ngày sinh.")));
  }

  function render(box, ctx) {
    const { chart: c, num, name, birth, time } = ctx, l = c.lunar, yp = c.pillars.year, dm = c.pillars.day;
    const z = HoroDetail.ZODIAC[NatalExtra.zodiac(birth.d, birth.m)], zi = NatalExtra.zodiac(birth.d, birth.m);
    const zEl = HoroDetail.ZODIAC_ELEMENT[zi % 4], zMode = HoroDetail.ZODIAC_MODE[zi % 3];
    const best = HoroDetail.ZODIAC.filter((_, j) => j !== zi && j % 4 === zi % 4).map(s => T(s.name)), good = HoroDetail.ZODIAC.filter((_, j) => j % 4 === (zi % 4 + 2) % 4).map(s => T(s.name));
    const ed = HoroDetail.ELEMENT[c.el], animal = HoroDetail.ANIMAL[yp.chi], n = num.name;
    const term = CanChi.solarTerm(c.jd), god = Almanac.dayGod(l.m, CanChi.day(c.jd).chi), truc = Almanac.truc(CanChi.day(c.jd).chi, term.idx), star = Almanac.mansion(c.jd);
    const lunarText = pad(l.d) + "/" + pad(l.m) + (l.leap ? T("n") : "") + "/" + l.y;
    const sub = T(c.male ? "Nam giới" : "Nữ giới") + " · " + T("sinh {date}", { date: dmy(birth) + (time ? " " + time : "") }) + " · " + T("âm lịch {date}", { date: lunarText });
    const notes = [l.y !== birth.y ? T("Sinh trước Tết nên tuổi tính theo năm âm {y}.", { y: l.y }) : "", c.late ? T("Sinh giờ Tý muộn (23–24h): trụ ngày tính sang hôm sau.") : ""].filter(Boolean);
    const pillarRows = [["Năm", yp], ["Tháng", c.pillars.month], ["Ngày", dm], ["Giờ", c.pillars.hour]].map(([k, q]) =>
      `<tr><td>${esc(T(k))}</td><td><b>${esc(cc(q))}</b></td><td>${q ? esc(el(CanChi.CAN_EL[q.can]) + " / " + el(CanChi.CHI_EL[q.chi])) : ""}</td><td>${q ? esc(T(CanChi.napAm(q).name)) : ""}</td></tr>`).join("");
    const dirs = `<table class="hours"><tbody>${c.kua.dirs.map(d => `<tr class="${d.good ? "hd" : ""}"><td><b>${esc(T(d.dir))}</b></td><td>${esc(T(d.kind))}</td><td>${esc(T(HoroText.DIRECTION[d.kind]))}</td><td>${tag(d.good ? T("tốt") : T("xấu"), d.good ? "good" : "bad")}</td></tr>`).join("")}</tbody></table>`;
    const pin = num.pinnacles.map((p, i) => `<tr><td>${esc(T("Chặng {i}", { i: i + 1 }))}</td><td>${esc(p.to === null ? T("từ {a} tuổi", { a: p.from }) : T("{a}–{b} tuổi", { a: p.from, b: p.to }))}</td><td><b class="num">${p.n}</b></td><td>${esc(T(HoroText.NUMBER[p.n]))}</td></tr>`).join("");

    box.innerHTML = `<div class="horo-hero"><b>${esc(name || T("(chưa nhập tên)"))}</b><span>${esc(sub)}</span>` + notes.map(x => `<small class="muted">${esc(x)}</small>`).join("") + `</div>`
      + det(T("Tổng quan"), dl([["Tuổi", esc(cc(yp) + " · " + T(HoroDetail.ANIMAL_NAME[yp.chi]))], ["Mệnh", esc(T(c.napAm) + " (" + el(c.el) + ")")],
        ["Cung hoàng đạo", esc(z.sym + " " + T(z.name))], ["Nhật chủ", esc(T(CanChi.CAN[dm.can]))], ["Cung mệnh", esc(T(c.kua.name))], ["Số chủ đạo", numLine(num.lifePath, HoroText.NUMBER[num.lifePath])]]) + portrait(c, yp, dm, name), true)
      + det(T("Tứ trụ & cân bằng ngũ hành"), `<table class="hours"><thead><tr><th>${esc(T("Trụ"))}</th><th>${esc(T("Can chi"))}</th><th>${esc(T("Can / Chi"))}</th><th>${esc(T("Nạp âm"))}</th></tr></thead><tbody>${pillarRows}</tbody></table>`
        + pillarMeaning() + balance(c) + para(T("Nhật chủ (can ngày sinh) {can}: {text}", { can: T(CanChi.CAN[dm.can]), text: T(HoroDetail.DAY_MASTER[dm.can]) })), true)
      + det(T("Mệnh {name} ({el})", { name: T(c.napAm), el: el(c.el) }), para(T(NatalExplain.NAP_AM[CanChi.NAP_AM.indexOf(c.napAm)])) + dl([["Tính cách", esc(T(HoroText.ELEMENT[c.el]))], ["Điểm mạnh", esc(T(ed.strengths))], ["Điểm yếu", esc(T(ed.weaknesses))],
        ["Nghề hợp", esc(T(ed.careers))], ["Sức khỏe cần chú ý", esc(T(ed.health))], ["Hướng hợp", esc(T(ed.dirs))],
        ["Màu hợp", esc(c.colors.good.map(x => T(x)).join(" · "))], ["Màu kỵ", esc(T(c.colors.bad))], ["Số hợp", esc(c.numbers.join(", "))]]), true)
      + det(T("Tuổi {animal} (12 con giáp)", { animal: T(CanChi.CHI[yp.chi]) }), para(T(animal.traits)) + para(T(animal.advice))
        + dl([["Tam hợp", compatRow(c.compat.tamHop.map(chi).join(", "), "tamHop")], ["Lục hợp", compatRow(chi(c.compat.lucHop), "lucHop")],
          ["Xung", compatRow(chi(c.compat.xung), "xung")], ["Hại", compatRow(chi(c.compat.hai), "hai")]]))
      + det(T("Cung hoàng đạo: {name}", { name: z.sym + " " + T(z.name) }), dl([["Ngày", esc(z.dates)], ["Nguyên tố", esc(T(zEl))], ["Tính chất", esc(T(zMode))], ["Hành tinh chủ quản", esc(T(z.planet))],
        ["Tính cách", esc(T(z.traits))], ["Điểm mạnh", esc(T(z.strengths))], ["Điểm yếu", esc(T(z.weaknesses))], ["Tình yêu", esc(T(z.love))], ["Sự nghiệp", esc(T(z.career))],
        ["Hợp nhất", esc(best.join(", "))], ["Cũng hợp", esc(good.join(", "))]]))
      + det(T("Ngày sinh theo lịch vạn niên"), dl([["Ngày", tag(T(god.name) + " · " + T(god.good ? "Hoàng đạo" : "Hắc đạo"), god.good ? "good" : "bad")], ["Trực", esc(T(truc.name))],
        ["Nhị thập bát tú", esc(T(star.name)) + " " + tag(star.good ? T("tốt") : T("xấu"), star.good ? "good" : "bad")], ["Tiết khí", esc(T(term.name))]])
        + para(T(god.good ? "Sinh ngày hoàng đạo: dân gian cho là được phù trợ, gặp nhiều thuận lợi." : "Sinh ngày hắc đạo: dân gian khuyên sống cẩn trọng, chăm tu dưỡng để hóa giải.")))
      + det(T("Phong thủy bát trạch"), para(T("Cung mệnh {name} ({el}) — {group} tứ mệnh", { name: T(c.kua.name), el: T(c.kua.el), group: T(c.kua.group) }))
        + para(T(NatalExplain.KUA_GROUP[c.kua.group]))
        + para(T("Nên chọn hướng nhà, bàn làm việc, đầu giường theo 4 hướng tốt; tránh 4 hướng xấu.")) + dirs)
      + det(T("Thần số học"), dl([["Số chủ đạo", numLine(num.lifePath, HoroText.NUMBER[num.lifePath]) + "<br><small>" + esc(T(HoroText.LIFE_PATH[num.lifePath])) + "</small>"],
        ["Nghề hợp", esc(T(HoroDetail.CAREER[num.lifePath]))], ["Số ngày sinh", numLine(num.birthDay, HoroText.NUMBER[num.birthDay])],
        ...(n ? [["Tên (bỏ dấu)", esc(n.plain)], ["Số sứ mệnh", numLine(n.expression, HoroText.NUMBER[n.expression])], ["Số linh hồn", numLine(n.soul, HoroText.NUMBER[n.soul])], ["Số nhân cách", numLine(n.personality, HoroText.NUMBER[n.personality])]]
          : [["Theo tên", '<span class="muted">' + esc(name ? T("Tên không có chữ cái Latin để tính thần số học.") : T("Nhập họ tên để xem số sứ mệnh, linh hồn, nhân cách.")) + "</span>"]])])
        + `<h4>${esc(T("Biểu đồ ngày sinh"))}</h4>` + birthGrid(birth))
      + det(T("Cả đời: 4 đỉnh cao"), `<table class="hours"><tbody>${pin}</tbody></table>`)
      + `<p class="muted disclaimer">${esc(T("Luận giải theo bảng tra dân gian và thần số học, chỉ mang tính tham khảo, giải trí — không thay cho quyết định của bạn."))}</p>`;
  }

  return { render };
})();
