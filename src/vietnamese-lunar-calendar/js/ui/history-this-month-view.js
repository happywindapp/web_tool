// Lịch sử thế giới / Việt Nam trong tháng đang xem: sự kiện xếp theo ngày, trùng ngày đang chọn thì tô đậm, bấm ngày để chọn ngày đó.
const HistoryView = (() => {
  const esc = s => Dom.esc(s);
  const yearText = y => (y < 0 ? T("{y} TCN", { y: -y }) : String(y));

  function block(title, list, o) {
    const items = list.filter(e => e.m === o.m).sort((a, b) => a.d - b.d || a.y - b.y);
    if (!items.length) return "";
    const li = e => {
      const jd = LunarCal.jdFromDate(e.d, e.m, o.y), date = e.d + "/" + e.m + "/" + yearText(e.y);
      const head = LunarCal.jdToDate(jd).m === e.m ? `<button type="button" class="lnk" data-jd="${jd}" data-pane-go="1">${esc(date)}</button>` : `<b>${esc(date)}</b>`;
      return `<li${e.d === o.day ? ' class="on"' : ""}>${head} ${esc(T(e.text))}</li>`;
    };
    return `<section class="hist"><h3>${esc(T(title, { m: o.m }))}</h3><ul>${items.map(li).join("")}</ul></section>`;
  }

  // o: { y, m, day } — day = selected solar day when it is in the displayed month.
  const render = o => block("Lịch sử thế giới · tháng {m}", HistoryWorld, o) + block("Lịch sử Việt Nam · tháng {m}", HistoryVietnam, o);

  return { render };
})();
