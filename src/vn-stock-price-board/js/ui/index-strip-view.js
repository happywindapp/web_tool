// Index cards (VNINDEX, VN30, HNX, UPCOM): value, traded value / volume / foreign net, two-session intraday chart with hover readout, breadth + phase.
const IndexStrip = (() => {
  let el, last = [], hover = null;
  const charts = {}, counts = {};
  const e = s => Dom.esc(s ?? "");
  const tone = v => v > 0 ? "up" : v < 0 ? "down" : "ref";

  // Ceiling / floor counts are not in the index feed → counted from the board when its tab holds that basket (kept until the next count).
  function countFrom(ctx) {
    if (!ctx || !ctx.quotes) return;
    const qs = [...ctx.quotes.values()].filter(q => q.type === "S" && q.last), all = MarketTabs.is(ctx.tab);
    const set = (name, list) => { counts[name] = { ceil: list.filter(q => QuoteModel.tone(q.last, q) === "ceil").length, floor: list.filter(q => QuoteModel.tone(q.last, q) === "floor").length }; };
    if (ctx.tab === "VN30") set("VN30", qs);
    for (const [name, ex] of [["VNINDEX", "HOSE"], ["HNX", "HNX"], ["UPCOM", "UPCOM"]]) if (all || ctx.tab === ex.toLowerCase()) set(name, qs.filter(q => q.ex === ex));
  }

  // Latest session = today → VPS reference + the live value appended; otherwise the previous session's close is the reference.
  function series(x) {
    const ss = (IndexData.get(x.name).ss || []).map(s => ({ ...s, pts: s.pts.slice() })), lastS = ss[ss.length - 1];
    if (lastS && lastS.day === IndexCardSvg.vnDay(Date.now() / 1000)) {
      const m = ChartSvg.toMin(x.time), tail = lastS.pts[lastS.pts.length - 1];
      if (x.value && m > tail.m && m <= 900) lastS.pts.push({ t: tail.t + (m - tail.m) * 60, m, v: x.value, vol: 0 });
      return { ss, ref: x.ref };
    }
    return { ss, ref: ss.length > 1 ? ss[ss.length - 2].pts[ss[ss.length - 2].pts.length - 1].v : x.ref };
  }

  function card(x) {
    const { ss, ref } = series(x), c = IndexCardSvg.chart(ss, ref, "ixg" + x.code), fx = IndexData.get(x.name).fx, cf = counts[x.name], n = v => cf ? String(v) : "–";
    charts[x.name] = c.pts;
    const gt = T("GT {v} tỷ", { v: Fmt.en(x.valueMil / 1000, 0) }), kl = T("KL {v}", { v: Fmt.big(x.vol) || "0" });
    const nn = fx ? T("NN ròng {v} tỷ", { v: Fmt.signed(fx.net / 1e9, 0) }) : "", nnTip = fx ? T("Khối ngoại mua − bán ròng phiên {d}", { d: fx.date.split("-").reverse().join("/") }) : "";
    const open = T("Mở biểu đồ kỹ thuật toàn màn hình của {s}", { s: x.name }), ph = Controls.phaseLabel();
    return `<div class="ix ${tone(x.chg)}" data-ix="${e(x.name)}" role="button" tabindex="0" title="${e(open)}">`
      + `<div class="ix-h"><b>${e(x.name)} <span class="ix-go">▸</span></b><span class="ix-v">${Fmt.en(x.value, 2)}</span><span class="ix-c">${Fmt.signed(x.chg)} ${Fmt.signed(x.pct)}%</span></div>`
      + `<div class="ix-m"><span>${e(gt)}</span><span>${e(kl)}</span>${fx ? `<span class="${tone(fx.net)}" title="${e(nnTip)}">${e(nn)}</span>` : ""}</div>`
      + `<div class="ixw">${c.svg}<div class="ixtip" hidden></div></div>`
      + `<div class="ix-f"><span class="br" title="${e(T("Trần · tăng · đứng giá · giảm · sàn"))}"><i class="ceil">⤒${n(cf?.ceil)}</i> <i class="up">↑${x.up}</i> <i class="ref">—${x.same}</i> <i class="down">↓${x.down}</i> <i class="floor">⤓${n(cf?.floor)}</i></span><span>${e(ph)}</span></div></div>`;
  }

  function render(list, ctx) {
    if (list) { last = list; countFrom(ctx); IndexData.refresh(list.map(x => x.name), () => render()); }
    el.innerHTML = last.length ? last.map(card).join("") : `<div class="ix empty">${e(T("Đang tải chỉ số…"))}</div>`;
    if (hover) show(hover.name, hover.fx);
  }

  // Hover readout: nearest minute to the pointer → crosshair + time · value · volume box.
  function show(name, fx) {
    const w = el.querySelector(`.ix[data-ix="${name}"] .ixw`), pts = charts[name];
    if (!w || !pts || !pts.length) return;
    const x = fx * IndexCardSvg.W, p = pts.reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a), g = w.querySelector(".ixh"), tip = w.querySelector(".ixtip");
    g.setAttribute("visibility", "visible"); g.querySelector("line").setAttribute("x1", p.x); g.querySelector("line").setAttribute("x2", p.x);
    g.querySelector("circle").setAttribute("cx", p.x); g.querySelector("circle").setAttribute("cy", p.y);
    const d = new Date(p.day * 864e5), date = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    tip.innerHTML = `<span>${e(T("Thời gian"))}</span><b>${IndexCardSvg.hm(p.m)}, ${date}</b><span>${e(T("Chỉ số"))}</span><b>${Fmt.en(p.v, 2)}</b><span>${e(T("Khối lượng"))}</span><b>${Fmt.big(p.vol) || "0"}</b>`;
    tip.hidden = false;
    const left = p.x / IndexCardSvg.W * w.clientWidth;
    tip.style.left = `${left > w.clientWidth / 2 ? Math.max(0, left - tip.offsetWidth - 8) : left + 8}px`;
  }

  // Click / Enter on a card → full chart of that index (dchart serves VNINDEX, VN30, HNX, UPCOM under these names).
  function init(node) {
    el = node; render();
    const open = ev => { const c = ev.target.closest("[data-ix]"); if (c && Object.values(QuoteModel.INDEX_CODES).includes(c.dataset.ix)) ChartCtl.openDialog(c.dataset.ix); };
    el.addEventListener("click", open);
    el.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(ev); } });
    el.addEventListener("pointermove", ev => {
      const w = ev.target.closest(".ixw"), c = w && w.closest("[data-ix]");
      if (!c || ev.pointerType === "touch") return;
      const r = w.getBoundingClientRect();
      hover = { name: c.dataset.ix, fx: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) };
      show(hover.name, hover.fx);
    });
    el.addEventListener("pointerout", ev => {
      if (!hover || (ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest(".ixw"))) return;
      hover = null;
      el.querySelectorAll(".ixh").forEach(g => g.setAttribute("visibility", "hidden"));
      el.querySelectorAll(".ixtip").forEach(t => { t.hidden = true; });
    });
  }

  return { init, render, find: name => last.find(x => x.name === name) || null };
})();
