// Technical chart controller: one shared state (Prefs "chart") for the detail-pane mini chart and the full-screen dialog.
const ChartCtl = (() => {
  const TYPES = ["candle", "ha", "bar", "line", "area", "baseline"], SCALES = ["normal", "log", "pct"];
  let st, sym = "", quote = null, data = { key: "", bars: [], cmp: null }, seq = 0, mini, full, dlgOpen = false, note = null;
  const draw = ChartDraw.create();

  function clean(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const range = ChartRange.RANGES.some(x => x.k === r.range) ? r.range : "1Y";
    return { range, interval: ChartRange.fix(range, ChartRange.INTERVALS.some(x => x.k === r.interval) ? r.interval : "1D"),
      type: TYPES.includes(r.type) ? r.type : "candle", scale: SCALES.includes(r.scale) ? r.scale : "normal",
      volume: r.volume !== false, compare: r.compare === true, ind: Indicators.clean(r.ind) };
  }
  const save = () => Prefs.set("chart", st);

  function say(id, key, p) { const el = $(id); el.hidden = !key; el.textContent = key ? T(key, p) : ""; }
  function msg(key) { say("miniMsg", key); say("fullMsg", key); }
  function bars() {
    $("miniBar").innerHTML = ChartBar.compact(st);
    $("fullBar").innerHTML = ChartBar.full(st, draw.tool());
    $("fullChips").innerHTML = ChartBar.chips(st.ind);
  }
  function head() {
    const q = quote && quote.sym === sym ? quote : null, tone = q ? QuoteModel.tone(q.last || q.ref, q) : "";
    $("dlgTitle").innerHTML = `<b class="${tone}">${Dom.esc(sym)}</b> <span class="muted">${Dom.esc(Universe.name(sym, I18n.lang))}</span>`
      + (q ? ` <b class="${tone}">${Fmt.price(q.last || q.ref)}</b> <span class="${tone}">${Fmt.chg(q, q.chg)} ${Fmt.pct(q, q.pct)}</span>` : "");
    $("dlgClose").title = T("Đóng (Esc)");
    $("fullStatus").textContent = note ? T(note.key, note.p) : draw.tool() ? T(draw.needsTwo() ? "Bấm 2 điểm trên biểu đồ." : "Bấm 1 điểm trên biểu đồ.") : T("Kéo để cuộn, lăn chuột / chụm 2 ngón để phóng to, bấm đúp trục giá để tự co giãn.");
  }

  async function load() {
    if (!sym) return;
    const my = ++seq, key = `${sym}|${st.range}|${st.interval}|${st.compare}`;
    if (data.key !== key) {
      msg("Đang tải dữ liệu biểu đồ…");
      try {
        const w = ChartRange.windowOf(st.range, st.interval);
        const [raw, cmp] = await Promise.all([History.load(sym, w.res, w.from, w.to), st.compare ? History.load("VNINDEX", w.res, w.from, w.to) : null]);
        if (my !== seq) return;
        data = { key, bars: ChartRange.shape(raw, st.interval), cmp: cmp ? ChartRange.shape(cmp, st.interval) : null };
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
    const s = { bars: data.bars, type: st.type, scale: st.compare ? "pct" : st.scale, volume: st.volume, inds, intraday: intra, keep,
      from: ChartRange.firstVisible(data.bars, st.range), compare: data.cmp ? { name: "VNINDEX", bars: data.cmp } : null };
    mini.render(s);
    if (dlgOpen) { full.render(s); draw.apply(full); }
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
    if (!q || q.sym !== sym) return;
    quote = q;
    if (dlgOpen) head();
    if (st.interval !== "1D" || !q.last || !data.bars.length) return;
    const d = QuoteModel.vnDate(), time = Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6)) / 1000;
    const bar = { time, open: q.open || q.last, high: Math.max(q.high, q.last), low: Math.min(q.low || q.last, q.last), close: q.last, volume: q.totVol * 10 };
    mini.updateLast(bar);
    if (dlgOpen) full.updateLast(bar);
  }

  function openDialog() {
    if (!sym) return;
    dlgOpen = true; note = null;
    $("chartDlg").showModal();
    bars(); head();
    requestAnimationFrame(() => render(false));
  }

  function act(c, el) {
    const v = el.dataset.v ?? el.value;
    if (c === "range") { st.range = v; st.interval = ChartRange.fix(v, st.interval); }
    else if (c === "interval") { if (!ChartRange.valid(st.range, v)) return; st.interval = v; }
    else if (c === "type" || c === "scale") st[c] = v;
    else if (c === "volume" || c === "compare") st[c] = el.checked;
    else if (c === "add") { if (!Object.hasOwn(Indicators.DEFS, v)) return; st.ind = Indicators.add(st.ind, v); }
    else if (c === "param") { const x = st.ind[+el.dataset.i]; if (!x) return; x.p = Indicators.params(x.id, { ...x.p, [el.dataset.k]: el.value }); }
    else if (c === "rm") st.ind.splice(+el.dataset.i, 1);
    else if (c === "tool") { draw.setTool(v); note = null; bars(); head(); return; }
    else if (c === "clearDraw") { draw.clear(); note = null; head(); render(true); return; }
    else if (c === "fit") { full.fit(); return; }
    else if (c === "png") { png(); return; }
    else if (c === "open") { openDialog(); return; }
    else return;
    save(); bars();
    if (["range", "interval", "compare"].includes(c)) load(); else render(true);
  }

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
    st = clean(Prefs.get("chart", {}));
    mini = TechChart.create($("miniHost"), { legend: $("miniLegend"), compact: true });
    full = TechChart.create($("fullHost"), { legend: $("fullLegend"), onClick: pt => { const r = draw.click(pt, data.bars); if (!r) return; note = r; head(); if (r.redraw) render(true); } });
    [$("miniChart"), $("chartDlg")].forEach(wire);
    $("dlgClose").onclick = () => $("chartDlg").close();
    $("chartDlg").addEventListener("close", () => { dlgOpen = false; full.destroy(); draw.setTool(draw.tool()); });
    const redraw = () => { if (data.bars.length) render(true); };
    $("theme").addEventListener("change", redraw);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
    I18n.onChange(() => { bars(); if (dlgOpen) head(); });
    bars();
  }

  return { init, setSymbol, onQuote, openDialog, get: () => st, set: raw => { st = clean(raw); save(); bars(); data.key = ""; load(); } };
})();
