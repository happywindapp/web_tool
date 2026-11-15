// Đồng hồ kim SVG: mặt 12 giờ + vành 24 giờ chia 12 canh (Tý…Hợi, tô giờ hoàng đạo hôm nay, canh hiện tại), cung ngày/đêm theo mọc–lặn, dòng giờ can chi.
const AnalogClock = (() => {
  const C = 70, esc = s => Dom.esc(s);
  const RANGE = ["23–1", "1–3", "3–5", "5–7", "7–9", "9–11", "11–13", "13–15", "15–17", "17–19", "19–21", "21–23"];
  const pt = (r, deg) => { const a = deg * Math.PI / 180; return (C + r * Math.sin(a)).toFixed(2) + " " + (C - r * Math.cos(a)).toFixed(2); };
  // Ring sector between radii r1 < r2 from angle a0 to a1 (degrees clockwise from 12 o'clock).
  const sector = (r1, r2, a0, a1) => `M${pt(r2, a0)}A${r2} ${r2} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${pt(r2, a1)}L${pt(r1, a1)}A${r1} ${r1} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${pt(r1, a0)}Z`;
  const arc = (r, a0, a1) => `M${pt(r, a0)}A${r} ${r} 0 ${((a1 - a0 + 360) % 360) > 180 ? 1 : 0} 1 ${pt(r, a1)}`;
  const hm = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? +m[1] + m[2] / 60 : null; };
  const today = () => { const d = new Date(); return LunarCal.jdFromDate(d.getDate(), d.getMonth() + 1, d.getFullYear()); };
  const chiNow = d => Math.floor((d.getHours() + 1) / 2) % 12;

  const ticks = Array.from({ length: 60 }, (_, i) => `<path class="${i % 5 ? "tk" : "tk big"}" d="M${pt(i % 5 ? 43 : 39, i * 6)}L${pt(46, i * 6)}"/>`).join("");
  const nums = [[12, 0], [3, 90], [6, 180], [9, 270]].map(([n, a]) => { const [x, y] = pt(33, a).split(" "); return `<text class="num" x="${x}" y="${+y + 3.5}">${n}</text>`; }).join("");

  // sun: { rise, set } "HH:MM" of today from the weather data, or null.
  function svg(sun) {
    const dayChi = CanChi.day(today()).chi;
    let ring = "";
    for (let i = 0; i < 12; i++) {
      const a0 = (i * 2 - 1) * 15, a1 = a0 + 30, good = Almanac.hourGod(dayChi, i).good, [x, y] = pt(58, i * 30).split(" ");
      ring += `<path class="cz${good ? " hd" : ""}" data-chi="${i}" d="${sector(51, 65, a0, a1)}"/><text class="cl${T(CanChi.CHI[i]).length > 5 ? " long" : ""}" x="${x}" y="${+y + 2.3}">${esc(T(CanChi.CHI[i]))}</text>`;
    }
    const r = hm(sun && sun.rise), s = hm(sun && sun.set);
    const day = r != null && s != null ? `<path class="night" d="${arc(48.5, s * 15, r * 15 + 360)}"/><path class="dayarc" d="${arc(48.5, r * 15, s * 15)}"/>` : "";
    return `<svg class="aclock" viewBox="0 0 140 140" role="button" aria-label="clock"><title>${esc(T("Bấm để đặt báo thức / đếm ngược"))}</title>${ring}<circle class="face" cx="${C}" cy="${C}" r="47"/>${day}${ticks}${nums}`
      + `<path class="now24" d="M${pt(66, 0)}L${pt(70, -3)}L${pt(70, 3)}Z"/>`
      + `<line class="hh" x1="${C}" y1="${C + 6}" x2="${C}" y2="${C - 25}"/><line class="mh" x1="${C}" y1="${C + 8}" x2="${C}" y2="${C - 36}"/>`
      + `<line class="sh" x1="${C}" y1="${C + 10}" x2="${C}" y2="${C - 41}"/><circle class="pin" cx="${C}" cy="${C}" r="2.6"/></svg>`
      + `<div class="clock-cc"></div>`;
  }

  function update(root = document) {
    const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h24 = d.getHours() + m / 60, i = chiNow(d);
    for (const c of root.querySelectorAll(".aclock")) {
      c.querySelector(".hh").setAttribute("transform", `rotate(${(h24 % 12) * 30} ${C} ${C})`);
      c.querySelector(".mh").setAttribute("transform", `rotate(${m * 6} ${C} ${C})`);
      c.querySelector(".sh").setAttribute("transform", `rotate(${s * 6} ${C} ${C})`);
      c.querySelector(".now24").setAttribute("transform", `rotate(${h24 * 15} ${C} ${C})`);
      c.querySelectorAll(".cz").forEach(p => p.classList.toggle("now", +p.dataset.chi === i));
      const cc = c.nextElementSibling, good = Almanac.hourGod(CanChi.day(today()).chi, i).good;
      if (cc && cc.classList.contains("clock-cc")) {
        const text = T("Giờ {chi} ({range}h)", { chi: T(CanChi.CHI[i]), range: RANGE[i] }) + " · " + T(good ? "hoàng đạo" : "hắc đạo");
        if (cc.textContent !== text) { cc.textContent = text; cc.className = "clock-cc " + (good ? "good" : "bad"); }
      }
    }
  }

  return { svg, update };
})();
