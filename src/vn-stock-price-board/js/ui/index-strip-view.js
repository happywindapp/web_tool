// Index cards (VNINDEX, VN30, HNX, UPCOM): value, change, breadth and a sparkline built from the polls seen today.
const IndexStrip = (() => {
  const KEY = "web_tool.vn-stock-price-board.spark";
  let el, last = [], points = load();

  // The feed has no intraday index history → points are collected per Vietnam date while the page is open (sessionStorage).
  function load() {
    try { const s = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (s && s.day === QuoteModel.vnDate() && s.pts) return s.pts; } catch { /* blocked */ }
    return {};
  }
  function remember(list) {
    for (const x of list) {
      const m = ChartSvg.toMin(x.time), pts = points[x.code] ||= [];
      if (m < 540 || !x.value || (pts.length && pts[pts.length - 1].m >= m)) continue;
      pts.push({ m, v: x.value });
    }
    try { sessionStorage.setItem(KEY, JSON.stringify({ day: QuoteModel.vnDate(), pts: points })); } catch { /* blocked */ }
  }

  const tone = x => x.chg > 0 ? "up" : x.chg < 0 ? "down" : "ref";

  function card(x) {
    const pts = points[x.code] || [];
    const sp = ChartSvg.spark(pts.length > 1 ? pts : [{ m: 540, v: x.ref }, { m: Math.max(541, ChartSvg.toMin(x.time)), v: x.value }], x.ref);
    return `<div class="ix ${tone(x)}"><div class="ix-h"><b>${Dom.esc(x.name)}</b><span class="ix-v">${Fmt.en(x.value, 2)}</span></div>`
      + `<div class="ix-c">${Fmt.signed(x.chg)} (${Fmt.signed(x.pct)}%)</div>${sp}`
      + `<div class="ix-f"><span>${Dom.esc(T("{v} tỷ", { v: Fmt.en(x.valueMil / 1000) }))}</span>`
      + `<span class="br" title="${Dom.esc(T("Số mã tăng / đứng giá / giảm"))}"><i class="up">▲${x.up}</i> <i class="ref">■${x.same}</i> <i class="down">▼${x.down}</i></span></div></div>`;
  }

  function render(list) {
    if (list) { last = list; remember(list); }
    el.innerHTML = last.length ? last.map(card).join("") : `<div class="ix empty">${Dom.esc(T("Đang tải chỉ số…"))}</div>`;
  }

  return { init: node => { el = node; render(); }, render };
})();
