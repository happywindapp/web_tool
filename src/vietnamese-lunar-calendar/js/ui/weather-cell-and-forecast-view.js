// Thời tiết trong ô lịch (icon, mô tả, nhiệt độ, độ ẩm) và mục "Thời tiết" của Chi tiết ngày (ngày chọn, hiện tại, hôm nay + 5 ngày tới, bảng 16 ngày).
const WeatherView = (() => {
  const esc = s => Dom.esc(s);
  const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const pad = n => String(n).padStart(2, "0");
  const deg = v => v == null ? "–" : Math.round(v) + "°";
  const pct = v => v == null ? "–" : Math.round(v) + "%";
  const range = w => deg(w.tmin) + "–" + deg(w.tmax) + "C";

  // One-line text used for tooltips and the selected-day row.
  function line(w) {
    const c = WeatherText.code(w.code);
    return c.icon + " " + T(c.text) + " · " + range(w) + " · " + T("độ ẩm {v}", { v: pct(w.rh) }) + (w.pop == null ? "" : " · " + T("khả năng mưa {v}", { v: pct(w.pop) }));
  }

  function cell(w) {
    if (!w) return "";
    const c = WeatherText.code(w.code);
    return `<span class="wx"><span class="wi">${c.icon}</span><span class="wt">${esc(T(c.text))}</span>`
      + `<span class="wn"><span class="tmin">${deg(w.tmin)}–</span>${deg(w.tmax)}<span class="rh"> 💧${pct(w.rh)}</span></span></span>`;
  }

  function week(days, today) {
    let html = "";
    for (let jd = today; jd <= today + 5; jd++) {
      const w = days[jd];
      if (!w) continue;
      const c = WeatherText.code(w.code);
      html += `<button type="button" data-jd="${jd}" title="${esc(line(w))}"><small>${esc(dayLabel(jd, today))}</small>`
        + `<span class="wi">${c.icon}</span><b>${deg(w.tmax)}</b><small>${deg(w.tmin)}</small><small>💧${pct(w.rh)}</small></button>`;
    }
    return html ? `<div class="wx-week">${html}</div>` : "";
  }

  const dayLabel = (jd, today) => { const s = LunarCal.jdToDate(jd); return (jd === today ? T("Hôm nay") : T(WD[LunarCal.weekday(jd)])) + " " + pad(s.d) + "/" + pad(s.m); };
  const num = (v, unit) => v == null ? "–" : I18n.num(Math.round(v * 10) / 10) + unit;

  // Up to 16 forecast days from today with rain amount, wind, UV, sunrise/sunset.
  function table(days, today) {
    const H = ["Ngày", "Thời tiết", "Nhiệt độ", "Độ ẩm", "Mưa", "Gió", "UV", "Mặt trời"];
    let rows = "";
    for (let jd = today; days[jd]; jd++) {
      const w = days[jd], c = WeatherText.code(w.code);
      rows += `<tr><td><button type="button" class="lnk" data-jd="${jd}">${esc(dayLabel(jd, today))}</button></td><td>${c.icon} ${esc(T(c.text))}</td><td>${esc(range(w))}</td>`
        + `<td>${pct(w.rh)}</td><td>${pct(w.pop)} · ${esc(num(w.rain, " mm"))}</td><td>${esc(num(w.wind, " km/h"))}</td><td>${esc(num(w.uv, ""))}</td><td>🌅${w.rise || "–"} 🌇${w.set || "–"}</td></tr>`;
    }
    return `<div class="wx-table"><table class="hours"><thead><tr>${H.map(h => `<th>${esc(T(h))}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // st: { place, data, error, loading, more } from WeatherApp.
  function section(st, sel, today) {
    const head = `<section class="wx-sec"><div class="wx-head"><h3>${esc(T("Thời tiết · {place}", { place: st.place }))}</h3>`
      + `<button type="button" class="wx-more" data-wx-charts title="${esc(T("Biểu đồ nhiệt độ, lượng mưa, độ ẩm theo mùa, theo năm, nhiều năm"))}">${esc(T("📊 Biểu đồ thời tiết"))}</button></div>`;
    if (st.loading && !st.data) return head + `<p class="muted">${esc(T("Đang tải thời tiết…"))}</p></section>`;
    if (!st.data) return head + `<p class="bad">${esc(T("✖ Không tải được thời tiết: {msg}", { msg: st.error }))}</p></section>`;
    const { days, current: cur } = st.data, w = days[sel], s = LunarCal.jdToDate(sel);
    const rows = [];
    if (cur) rows.push(`<dt>${esc(T("Bây giờ"))}</dt><dd>${esc(WeatherText.code(cur.code).icon + " " + T(WeatherText.code(cur.code).text) + " · " + deg(cur.temp) + "C · "
      + T("cảm giác {v}", { v: deg(cur.feels) + "C" }) + " · " + T("độ ẩm {v}", { v: pct(cur.rh) }))} <small class="muted">${esc(cur.time.slice(11))}</small></dd>`);
    rows.push(`<dt>${esc(T("Ngày {d}", { d: pad(s.d) + "/" + pad(s.m) }))}</dt><dd>${w ? esc(line(w)) : `<span class="muted">${esc(T("Chưa có dữ liệu (chỉ có ~3 tháng qua và 16 ngày tới)"))}</span>`}</dd>`);
    const label = st.more ? T("Thu gọn ▴") : T("Xem thêm ngày, chi tiết ▾");
    const more = `<button type="button" class="wx-more" data-wx-more aria-expanded="${!!st.more}">${esc(label)}</button>`;
    return head + `<dl>${rows.join("")}</dl><div class="wx-head"><h4>${esc(T("Hôm nay & 5 ngày tới"))}</h4>${more}</div>${week(days, today)}`
      + (st.more ? table(days, today) : "") + "</section>";
  }

  return { cell, line, section };
})();
