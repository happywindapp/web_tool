// Technical chart controller: one shared state (Prefs "chart") for the detail-pane mini chart and the full-screen dialog.
const ChartCtl = (() => {
  const TYPES = ["candle", "ha", "bar", "line", "area", "baseline"], SCALES = ["normal", "log", "pct"];
  let st, sym = "", active = false, quote = null, data = { key: "", bars: [], cmp: null }, seq = 0, mini, full, dlgOpen = false, note = null, home = null;
  const draw = ChartDraw.create();

  function clean(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const range = ChartRange.RANGES.some(x => x.k === r.range) ? r.range : "1Y";
    return { range, interval: ChartRange.fix(range, ChartRange.INTERVALS.some(x => x.k === r.interval) ? r.interval : "1D"),
      type: TYPES.includes(r.type) ? r.type : "candle", scale: SCALES.includes(r.scale) ? r.scale : "normal",
      volume: r.volume !== false, peaks: r.peaks === true, crosses: r.crosses !== false, ind: Indicators.clean(r.ind),
      layout: ChartGrid.layout(r.layout), cells: ChartGrid.clean(r.cells),
      // Up to 5 overlay tickers; older saves / links carried compare: true for VNINDEX only.
      cmp: WatchParse.clean(Array.isArray(r.cmp) ? r.cmp : r.compare === true ? ["VNINDEX"] : [], 5) };
  }
  const save = () => Prefs.set("chart", st);

  function say(id, key, p) { const el = $(id); el.hidden = !key; el.textContent = key ? T(key, p) : ""; }
  function msg(key) { say("miniMsg", key); say("fullMsg", key); }
  function bars() {
    $("miniBar").innerHTML = ChartBar.compact(st);
    // Keep the indicator menu open while ticking several boxes (the toolbar is rebuilt on every change).
    const open = !!$("fullBar").querySelector("details.indmenu[open]");
    $("fullBar").innerHTML = ChartBar.full(st, draw.tool());
    if (open) $("fullBar").querySelector("details.indmenu").open = true;
    $("fullChips").innerHTML = ChartBar.chips(st.ind);
  }
  function head() {
    const q = quote && quote.sym === sym ? quote : null, tone = q ? QuoteModel.tone(q.last || q.ref, q) : "";
    const ix = IndexStrip.find(sym), ixTone = ix ? (ix.chg > 0 ? "up" : ix.chg < 0 ? "down" : "ref") : "";
    $("dlgTitle").innerHTML = `<b class="${tone}">${Dom.esc(sym)}</b> <span class="muted">${Dom.esc(Universe.name(sym, I18n.lang))}</span>`
      + (q ? ` <b class="${tone}">${Fmt.price(q.last || q.ref)}</b> <span class="${tone}">${Fmt.chg(q, q.chg)} ${Fmt.pct(q, q.pct)}</span>` : "")
      + (!q && ix ? ` <b class="${ixTone}">${Fmt.en(ix.value, 2)}</b> <span class="${ixTone}">${Fmt.signed(ix.chg)} (${Fmt.signed(ix.pct)}%)</span>` : "");
    $("dlgClose").title = T("Đóng (Esc)");
    $("fullStatus").textContent = note ? T(note.key, note.p) : draw.tool() ? T(draw.needsTwo() ? "Bấm 2 điểm trên biểu đồ." : "Bấm 1 điểm trên biểu đồ.") : T("Kéo để cuộn, lăn chuột / chụm 2 ngón để phóng to, bấm đúp trục giá để tự co giãn.")
      + (full.scrolls() ? " " + T("Nhiều khung chỉ báo: lăn chuột trên khung chỉ báo hoặc vuốt dọc để cuộn xem hết.") : "");
  }

  // Only fetch while the chart is on screen (detail tab "Kỹ thuật" or the dialog).
  async function load() {
    if (!sym || (!active && !dlgOpen)) return;
    const my = ++seq, key = `${sym}|${st.range}|${st.interval}|${st.cmp.join()}`;
    if (data.key !== key) {
      msg("Đang tải dữ liệu biểu đồ…");
      try {
        const w = ChartRange.windowOf(st.range, st.interval);
        const others = st.cmp.filter(c => c !== sym);
        const [raw, ...cmp] = await Promise.all([History.load(sym, w.res, w.from, w.to), ...others.map(c => History.load(c, w.res, w.from, w.to).catch(() => []))]);
        if (my !== seq) return;
        data = { key, bars: ChartRange.shape(raw, st.interval), cmp: others.map((name, i) => ({ name, bars: ChartRange.shape(cmp[i], st.interval) })).filter(c => c.bars.length) };
      } catch (e) {
        if (my !== seq) return;
        console.warn("ChartCtl.load - get OHLC history fail", sym, e);
        data = { key: "", bars: [], cmp: null };
        [mini, full].forEach(v => v.destroy());
        msg("Không tải được dữ liệu biểu đồ (VNDirect). Thử lại sau.");
        return;
      }
    }
    render(false);
  }

  function render(keep) {
    if (!data.bars.length) { [mini, full].forEach(v => v.destroy()); msg("Không có dữ liệu cho khoảng thời gian / khung nến này."); return; }
    msg(null);
    const intra = ChartRange.intraday(st.interval);
    const inds = Indicators.compute(st.ind.filter(x => !Indicators.DEFS[x.id].intraday || intra), data.bars);
    const s = { bars: data.bars, type: st.type, scale: data.cmp && data.cmp.length ? "pct" : st.scale, volume: st.volume, peaks: st.peaks, crosses: st.crosses, inds, intraday: intra, keep,
      from: ChartRange.firstVisible(data.bars, st.range), compare: data.cmp || [] };
    mini.render(s);
    if (dlgOpen) { full.render(s); draw.apply(full); head(); ChartGrid.sync(st, sym); }
  }

  function setSymbol(s) {
    $("miniChart").hidden = !s;
    if (s === sym) return;
    sym = s; draw.clear(); note = null;
    if (dlgOpen) head();
    load();
  }

  // Board poll → refresh the header and the last daily candle with the live quote.
  function onQuote(q) {
    if (dlgOpen) ChartGrid.tick();
    if (!q || q.sym !== sym) return;
    quote = q;
    if (dlgOpen) head();
    if (st.interval !== "1D" || !q.last || !data.bars.length) return;
    const d = QuoteModel.vnDate(), time = Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6)) / 1000;
    const bar = { time, open: q.open || q.last, high: Math.max(q.high, q.last), low: Math.min(q.low || q.last, q.last), close: q.last, volume: q.totVol * 10 };
    mini.updateLast(bar);
    if (dlgOpen) full.updateLast(bar);
  }

  // s: another symbol (an index card) shown only while the dialog is open; closing returns to the selected ticker.
  function openDialog(s) {
    if (s && s !== sym) { home = sym; setSymbol(s); }
    if (!sym) return;
    dlgOpen = true; note = null;
    $("chartDlg").showModal();
    bars(); head();
    // Data may not be loaded yet (mini chart only loads while its tab is open) → load() fetches if needed, then renders.
    requestAnimationFrame(load);
  }

  function act(c, el) {
    const v = el.dataset.v ?? el.value;
    if (c === "range") { st.range = v; st.interval = ChartRange.fix(v, st.interval); }
    else if (c === "interval") { if (!ChartRange.valid(st.range, v)) return; st.interval = v; }
    else if (c === "type" || c === "scale") st[c] = v;
    else if (c === "layout") st.layout = ChartGrid.layout(v);
    else if (["volume", "peaks", "crosses"].includes(c)) st[c] = el.checked;
    else if (c === "cmp") st.cmp = WatchParse.parse(el.value).symbols.slice(0, 5);
    else if (c === "toggleInd") { if (!Object.hasOwn(Indicators.DEFS, v)) return; st.ind = el.checked ? Indicators.add(st.ind, v) : st.ind.filter(x => x.id !== v); }
    else if (c === "indHelp") { IndGuide.open(v, guideHooks); return; }
    else if (c === "param") { const x = st.ind[+el.dataset.i]; if (!x) return; x.p = Indicators.params(x.id, { ...x.p, [el.dataset.k]: el.value }); }
    else if (c === "rm") st.ind.splice(+el.dataset.i, 1);
    else if (c === "tool") { draw.setTool(v); note = null; bars(); head(); return; }
    else if (c === "clearDraw") { draw.clear(); note = null; head(); render(true); return; }
    else if (c === "fit") { full.fit(); return; }
    else if (c === "png") { png(); return; }
    else if (c === "open") { openDialog(); return; }
    else return;
    save(); bars();
    if (["range", "interval", "cmp"].includes(c)) load(); else render(true);
  }

  const guideHooks = { on: id => st.ind.some(x => x.id === id), toggle: (id, show) => act("toggleInd", { dataset: { v: id }, checked: show }) };

  function png() {
    const canvas = full.screenshot();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png"); a.download = `${sym}-${st.interval}-${QuoteModel.vnDate()}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function wire(box) {
    box.addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (b && !b.disabled) act(b.dataset.c, b); });
    box.addEventListener("change", e => { const el = e.target.closest("[data-c]"); if (el && el.tagName !== "BUTTON") act(el.dataset.c, el); });
  }

  function init() {
    // The menu may sit near the dialog's right edge → flip the panel to open leftwards instead of being clipped.
    $("fullBar").addEventListener("toggle", e => {
      const d = e.target;
      if (!d.matches || !d.matches("details.indmenu") || !d.open) return;
      const pn = d.querySelector(".indpanel");
      // Phone toolbar scrolls sideways and would clip the panel → pin it under the button across the screen.
      if (matchMedia("(max-width: 640px)").matches) {
        Object.assign(pn.style, { position: "fixed", top: `${d.querySelector("summary").getBoundingClientRect().bottom + 4}px`, left: "8px", right: "8px", width: "auto", maxWidth: "none" });
        return;
      }
      pn.style.left = "0"; pn.style.right = "auto";
      if (pn.getBoundingClientRect().right > $("chartDlg").getBoundingClientRect().right - 8) { pn.style.left = "auto"; pn.style.right = "0"; }
    }, true);
    document.addEventListener("click", e => { const m = $("fullBar").querySelector("details.indmenu[open]"); if (m && !m.contains(e.target) && !e.composedPath().includes($("indHelpDlg"))) m.open = false; });
    IndGuide.init();
    ChartGrid.init(save);
    // Every visit opens at 1 year × 1D; type / scale / indicators are remembered, share links still set their own range.
    st = clean({ ...Prefs.get("chart", {}), range: "1Y", interval: "1D" });
    mini = TechChart.create($("miniHost"), { legend: $("miniLegend"), compact: true });
    full = TechChart.create($("fullHost"), { legend: $("fullLegend"), tip: $("fullTip"), onClick: pt => { const r = draw.click(pt, data.bars); if (!r) return; note = r; head(); if (r.redraw) render(true); } });
    [$("miniChart"), $("chartDlg")].forEach(wire);
    $("dlgClose").onclick = () => $("chartDlg").close();
    $("chartDlg").addEventListener("close", () => {
      dlgOpen = false; full.destroy(); ChartGrid.destroy(); draw.setTool(draw.tool());
      if (home !== null) { const h = home; home = null; setSymbol(h); }
    });
    const redraw = () => { if (data.bars.length) render(true); };
    $("theme").addEventListener("change", redraw);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
    I18n.onChange(() => { bars(); if (dlgOpen) head(); });
    bars();
  }

  const setActive = v => { active = v; if (v) load(); };

  return { init, setSymbol, setActive, onQuote, openDialog, get: () => st, set: raw => { st = clean(raw); save(); bars(); data.key = ""; load(); } };
})();
