// Nội dung hộp "Biểu đồ thời tiết": thẻ số liệu + cấu hình biểu đồ cho 3 chế độ Theo mùa / Theo năm / Nhiều năm.
const WxChartsView = (() => {
  const esc = s => Dom.esc(s);
  const pad = n => String(n).padStart(2, "0");
  const num = v => (v == null ? "–" : I18n.num(Math.round(v * 10) / 10));
  const deg = v => num(v) + "°C", mm = v => num(v) + " mm", pct = v => num(v) + "%";
  const sign = v => (v == null ? "–" : (v > 0 ? "+" : "") + num(v));
  const dmy = d => pad(d.d) + "/" + pad(d.m) + "/" + d.y;
  const SEASONS = [["Mùa xuân", [2, 3, 4]], ["Mùa hạ", [5, 6, 7]], ["Mùa thu", [8, 9, 10]], ["Mùa đông", [11, 12, 1]]];
  const mon = m => (I18n.lang === "en" ? new Date(2000, m - 1, 1).toLocaleString("en", { month: "short" }) : T("Th{m}", { m }));

  // Đông = 11, 12 of year y + 1 of year y + 1.
  const inSeason = (d, y, s) => (s === 3 ? (d.y === y && d.m >= 11) || (d.y === y + 1 && d.m === 1) : d.y === y && SEASONS[s][1].includes(d.m));
  const card = (label, value, sub = "") => `<div><small>${esc(label)}</small><b>${esc(value)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}</div>`;
  const chart = title => `<h4>${esc(title)}</h4><div class="wxc" data-chart></div>`;

  // partial: period not finished yet ⇒ totals are not comparable with whole periods.
  function cards(sum, cmp, partial) {
    return `<div class="wxc-stats">${card(T("Nhiệt độ TB"), deg(sum.tavg), cmp ? T("{d}°C so với TB", { d: sign(sum.tavg - cmp.tavg) }) : "")}`
      + card(T("Nóng nhất"), deg(sum.hot && sum.hot.tmax), sum.hot ? dmy(sum.hot) : "") + card(T("Lạnh nhất"), deg(sum.cold && sum.cold.tmin), sum.cold ? dmy(sum.cold) : "")
      + card(T("Tổng lượng mưa"), mm(sum.rain), partial ? T("chưa hết giai đoạn ({n} ngày)", { n: sum.n }) : cmp && cmp.rain ? T("{p}% so với TB", { p: num(sum.rain / cmp.rain * 100) }) : "")
      + card(T("Số ngày mưa (≥ 1 mm)"), String(sum.rainy)) + card(T("Độ ẩm TB"), pct(sum.rh)) + "</div>";
  }

  const dayTip = d => `<b>${esc(dmy(d))}</b><br>${esc(T("Cao/thấp"))}: ${esc(deg(d.tmax))} / ${esc(deg(d.tmin))}<br>${esc(T("Mưa"))}: ${esc(mm(d.rain))} · ${esc(T("Độ ẩm"))}: ${esc(pct(d.rh))}`;
  const monthStarts = list => list.map((d, i) => (d.d === 1 || i === 0 ? i : -1)).filter(i => i >= 0);
  const tempSpec = list => ({ labels: list.map(d => pad(d.d) + "/" + pad(d.m)), xticks: monthStarts(list), unit: { left: "°C" }, tip: i => dayTip(list[i]),
    series: [{ type: "band", cls: "c-band", lo: list.map(d => d.tmin), hi: list.map(d => d.tmax) }, { type: "line", name: T("Cao nhất"), cls: "c-max", v: list.map(d => d.tmax) },
      { type: "line", name: T("Thấp nhất"), cls: "c-min", v: list.map(d => d.tmin) }] });

  // Average of the same period in the other loaded years that have it (nearly) complete.
  function baseline(days, pick, minDays) {
    const years = [...new Set(days.map(d => d.y))], sums = years.map(y => WxStats.summary(days.filter(d => pick(d, y)))).filter(s => s.n >= minDays);
    return sums.length ? { tavg: WxStats.avg(sums.map(s => s.tavg)), rain: WxStats.avg(sums.map(s => s.rain)), n: sums.length } : null;
  }

  function season(days, o) {
    const list = days.filter(d => inSeason(d, o.y, o.s)), name = T(SEASONS[o.s][0]);
    if (!list.length) return { html: `<p class="muted">${esc(T("Chưa có dữ liệu cho giai đoạn này."))}</p>`, specs: [] };
    const cmp = baseline(days.filter(d => !inSeason(d, o.y, o.s)), (d, y) => inSeason(d, y, o.s), 85);
    const sum = WxStats.summary(list);
    return { html: cards(sum, cmp, sum.n < 85) + (cmp ? `<p class="muted wxc-note">${esc(T("So với trung bình {name} của {n} năm khác trong dữ liệu.", { name, n: cmp.n }))}</p>` : "")
      + chart(T("Nhiệt độ hằng ngày · {name} {y}", { name, y: o.y })) + chart(T("Lượng mưa & độ ẩm hằng ngày")),
      specs: [tempSpec(list), { labels: list.map(d => pad(d.d) + "/" + pad(d.m)), xticks: monthStarts(list), unit: { left: "mm", right: "%" }, tip: i => dayTip(list[i]),
        series: [{ type: "bar", name: T("Lượng mưa"), cls: "c-rain", v: list.map(d => d.rain) }, { type: "line", name: T("Độ ẩm"), cls: "c-rh", axis: "right", v: list.map(d => d.rh) }] }] };
  }

  function year(days, o) {
    const list = days.filter(d => d.y === o.y);
    if (!list.length) return { html: `<p class="muted">${esc(T("Chưa có dữ liệu cho giai đoạn này."))}</p>`, specs: [] };
    const ms = WxStats.monthly(list), cmp = baseline(days.filter(d => d.y !== o.y), (d, y) => d.y === y, 360);
    const mTip = i => { const m = ms[i]; return `<b>${esc(mon(m.m) + "/" + m.y)}</b><br>${esc(T("Cao/thấp TB"))}: ${esc(deg(m.tmax))} / ${esc(deg(m.tmin))}<br>${esc(T("Mưa"))}: ${esc(mm(m.rain))} · ${esc(T("{n} ngày mưa", { n: m.rainy }))}<br>${esc(T("Độ ẩm"))}: ${esc(pct(m.rh))}`; };
    const labels = ms.map(m => mon(m.m));
    const sum = WxStats.summary(list);
    return { html: cards(sum, cmp, sum.n < 360) + chart(T("Nhiệt độ hằng ngày · năm {y}", { y: o.y })) + chart(T("Theo tháng: nhiệt độ TB & lượng mưa")) + chart(T("Theo tháng: độ ẩm & số ngày mưa")),
      specs: [tempSpec(list),
        { labels, unit: { left: "°C", right: "mm" }, tip: mTip, series: [{ type: "bar", name: T("Lượng mưa"), cls: "c-rain", axis: "right", v: ms.map(m => m.rain) },
          { type: "line", name: T("Cao nhất TB"), cls: "c-max", v: ms.map(m => m.tmax) }, { type: "line", name: T("Thấp nhất TB"), cls: "c-min", v: ms.map(m => m.tmin) }] },
        { labels, unit: { left: "%", right: T("ngày") }, tip: mTip, series: [{ type: "bar", name: T("Số ngày mưa"), cls: "c-rainy", axis: "right", v: ms.map(m => m.rainy) },
          { type: "line", name: T("Độ ẩm TB"), cls: "c-rh", v: ms.map(m => m.rh) }] }] };
  }

  function multi(days, o) {
    const ys = WxStats.yearly(days).filter(r => r.n >= 360 && r.y < new Date().getFullYear()).slice(-o.span);
    if (ys.length < 2) return { html: `<p class="muted">${esc(T("Chưa có dữ liệu cho giai đoạn này."))}</p>`, specs: [] };
    const tr = WxStats.trend(ys.map(r => r.y), ys.map(r => r.tavg)), by = k => ys.reduce((a, b) => (b[k] > a[k] ? b : a)), lo = k => ys.reduce((a, b) => (b[k] < a[k] ? b : a));
    const clim = WxStats.climatology(days.filter(d => d.y >= ys[0].y && d.y <= ys[ys.length - 1].y)), span = ys[0].y + "–" + ys[ys.length - 1].y;
    const yTip = i => { const r = ys[i]; return `<b>${r.y}</b><br>${esc(T("Nhiệt độ TB"))}: ${esc(deg(r.tavg))}<br>${esc(T("Mưa"))}: ${esc(mm(r.rain))} · ${esc(T("{n} ngày mưa", { n: r.rainy }))}`; };
    const html = `<div class="wxc-stats">${card(T("Xu hướng nhiệt độ"), T("{d}°C / 10 năm", { d: sign(tr.slope * 10) }), span)}`
      + card(T("Năm nóng nhất"), String(by("tavg").y), deg(by("tavg").tavg)) + card(T("Năm mát nhất"), String(lo("tavg").y), deg(lo("tavg").tavg))
      + card(T("Năm mưa nhiều nhất"), String(by("rain").y), mm(by("rain").rain)) + card(T("Năm mưa ít nhất"), String(lo("rain").y), mm(lo("rain").rain))
      + card(T("Mưa TB mỗi năm"), mm(WxStats.avg(ys.map(r => r.rain)))) + "</div>"
      + chart(T("Nhiệt độ trung bình năm & xu hướng")) + chart(T("Lượng mưa năm & số ngày mưa")) + chart(T("Khí hậu trung bình theo tháng · {span}", { span }));
    return { html, specs: [
      { labels: ys.map(r => String(r.y)), unit: { left: "°C" }, tip: yTip, series: [{ type: "band", cls: "c-band", lo: ys.map(r => r.tmin), hi: ys.map(r => r.tmax) },
        { type: "line", name: T("Nhiệt độ TB năm"), cls: "c-mean", v: ys.map(r => r.tavg) }, { type: "line", name: T("Xu hướng"), cls: "c-trend", dash: true, v: ys.map(r => tr.at(r.y)) }] },
      { labels: ys.map(r => String(r.y)), unit: { left: "mm", right: T("ngày") }, tip: yTip, series: [{ type: "bar", name: T("Lượng mưa năm"), cls: "c-rain", v: ys.map(r => r.rain) },
        { type: "line", name: T("Số ngày mưa"), cls: "c-rainy", axis: "right", v: ys.map(r => r.rainy) }] },
      { labels: clim.map(c => mon(c.m)), unit: { left: "°C", right: "mm" }, tip: i => { const c = clim[i]; return `<b>${esc(mon(i + 1))}</b><br>${esc(T("Cao/thấp TB"))}: ${esc(deg(c.tmax))} / ${esc(deg(c.tmin))}<br>${esc(T("Mưa TB"))}: ${esc(mm(c.rain))} · ${esc(T("Độ ẩm"))}: ${esc(pct(c.rh))}`; },
        series: [{ type: "bar", name: T("Mưa TB tháng"), cls: "c-rain", axis: "right", v: clim.map(c => c.rain) }, { type: "band", cls: "c-band", lo: clim.map(c => c.tmin), hi: clim.map(c => c.tmax) },
          { type: "line", name: T("Cao nhất TB"), cls: "c-max", v: clim.map(c => c.tmax) }, { type: "line", name: T("Thấp nhất TB"), cls: "c-min", v: clim.map(c => c.tmin) }] }] };
  }

  // Season index of a month (Jan belongs to the previous year's Đông).
  const seasonOf = (m, y) => (m === 1 ? { s: 3, y: y - 1 } : { s: Math.floor((m - 2) / 3) % 4, y });

  return { season, year, multi, seasonOf, SEASONS };
})();
