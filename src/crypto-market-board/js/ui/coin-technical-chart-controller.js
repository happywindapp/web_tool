// Coin chart: Binance klines, range (1 day → all) × interval (1m → 1M), in the detail tab "Kỹ thuật" + full-screen dialog, live candle via
// kline WebSocket, 6 chart types, log / % scale, 17 indicators (checkbox picker), compare coins, drawing tools, PNG. One shared state (Prefs "chart").
const CoinChart = (() => {
  const TYPES = CoinBar.TYPES.map(t => t[0]), SCALES = CoinBar.SCALES.map(t => t[0]), IV = CoinBar.INTERVALS.map(t => t[0]), RK = CoinBar.RANGES.map(r => r[0]);
  const WARM = 250;
  let st, sym = "", active = false, dlgOpen = false, data = { key: "", bars: [], cmp: [] }, seq = 0, mini, full, unsub = null, note = null, pickOpen = false;
  const draw = ChartDraw.create();

  function clean(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    const range = RK.includes(r.range) ? r.range : "1Y", v2 = r.v === 2; // v2: saved after peaks default → off, crosses → on
    return { range, interval: CoinBar.fix(range, IV.includes(r.interval) ? r.interval : "1d"), type: TYPES.includes(r.type) ? r.type : "candle", scale: SCALES.includes(r.scale) ? r.scale : "normal",
      volume: r.volume !== false, peaks: v2 && r.peaks === true, crosses: !v2 || r.crosses !== false, v: 2, ind: Indicators.clean(r.ind), cmp: CoinParse.clean(Array.isArray(r.cmp) ? r.cmp : [], 3) };
  }
  const save = () => Prefs.set("chart", st);
  const say = (id, key, p) => { const el = $(id); el.hidden = !key; el.textContent = key ? T(key, p) : ""; };
  const msg = key => { say("miniMsg", key); say("fullMsg", key); };
  function bars() { $("miniBar").innerHTML = CoinBar.compact(st); $("fullBar").innerHTML = CoinBar.full(st, draw.tool(), pickOpen); $("fullChips").innerHTML = CoinBar.chips(st.ind); alignPick(); }
  // Open the indicator list towards the side with room (the dialog clips anything past its edge).
  function alignPick() {
    const d = $("fullBar").querySelector("details.ipick[open]"), p = d && d.querySelector(".ipop");
    if (!p || matchMedia("(max-width: 640px)").matches) return;
    const r = d.getBoundingClientRect(), right = r.left + p.offsetWidth > $("chartDlg").getBoundingClientRect().right - 8;
    p.style.left = right ? "auto" : "0"; p.style.right = right ? "0" : "auto";
  }
  function head() {
    const r = Coins.row(sym), tone = Fmt.tone(r.pct);
    $("dlgTitle").innerHTML = `<b class="${tone}">${Dom.esc(sym)}</b> <span class="muted">${Dom.esc(r.name || "")}</span>` + (r.last ? ` <b class="${tone}">${Dom.esc(Fmt.money(r.last))}</b> <span class="${tone}">${Dom.esc(Fmt.pct(r.pct))}</span>` : "");
    $("dlgClose").title = T("Đóng (Esc)");
    $("fullStatus").textContent = note ? T(note.key, note.p) : draw.tool() ? T(draw.needsTwo() ? "Bấm 2 điểm trên biểu đồ." : "Bấm 1 điểm trên biểu đồ.") : T("Kéo để cuộn, lăn chuột / chụm 2 ngón để phóng to, bấm đúp trục giá để tự co giãn.");
  }

  async function load() {
    if (!sym || (!active && !dlgOpen)) return;
    const pair = Coins.pair(sym);
    if (!pair) { data = { key: "", bars: [], cmp: [] }; [mini, full].forEach(v => v.destroy()); msg(Coins.ready() ? "Coin này không có cặp USDT trên Binance nên không có biểu đồ nến." : "Đang tải dữ liệu biểu đồ…"); return; }
    const my = ++seq, key = `${pair}|${st.range}|${st.interval}|${st.cmp.join()}`;
    if (data.key !== key) {
      msg("Đang tải dữ liệu biểu đồ…");
      try {
        const others = st.cmp.filter(c => c !== sym && Coins.pair(c)), n = Math.min(5000, CoinBar.need(st.range, st.interval) + WARM);
        const [raw, ...cmp] = await Promise.all([Spot.klines(pair, st.interval, n), ...others.map(c => Spot.klines(Coins.pair(c), st.interval, n).catch(() => []))]);
        if (my !== seq) return;
        data = { key, bars: raw, cmp: others.map((name, i) => ({ name, bars: cmp[i] })).filter(c => c.bars.length) };
      } catch (e) {
        if (my !== seq) return;
        console.warn("CoinChart.load - get klines fail", pair, e.message);
        data = { key: "", bars: [], cmp: [] }; [mini, full].forEach(v => v.destroy());
        msg("Không tải được nến từ Binance. Thử lại sau.");
        return;
      }
    }
    render(false);
    stream(pair);
  }

  // Live candle: the kline stream of the shown interval updates (or appends) the last bar of both charts.
  function stream(pair) {
    if (unsub) unsub();
    unsub = Live.sub(`${pair.toLowerCase()}@kline_${st.interval}`, d => {
      if (!d || !d.k || !data.bars.length) return;
      const b = Spot.liveBar(d.k);
      mini.updateLast(b); if (dlgOpen) full.updateLast(b);
    });
  }

  function render(keep) {
    if (!data.bars.length) { [mini, full].forEach(v => v.destroy()); msg("Không có dữ liệu nến."); return; }
    msg(null);
    const intraday = !["1d", "1w", "1M"].includes(st.interval), inds = Indicators.compute(st.ind, data.bars);
    const s = { bars: data.bars, type: st.type, scale: data.cmp.length ? "pct" : st.scale, volume: st.volume, peaks: st.peaks, crosses: st.crosses, inds, intraday, from: Math.max(0, data.bars.length - CoinBar.need(st.range, st.interval)), keep, compare: data.cmp };
    if (active) mini.render(s);
    if (dlgOpen) { full.render(s); draw.apply(full); }
  }

  function show(on, s) {
    active = on;
    if (s && s !== sym) { sym = s; draw.clear(); note = null; data.key = ""; }
    if (!on && !dlgOpen) { if (unsub) { unsub(); unsub = null; } mini.destroy(); return; }
    load();
  }

  function onBar(e) {
    const el = e.target.closest("[data-c]");
    if (!el || (e.type === "click" && /^(SELECT|INPUT)$/.test(el.tagName))) return;
    const c = el.dataset.c, v = el.dataset.v ?? el.value;
    if (c === "open") { openDialog(); return; }
    if (c === "guide") { IndGuide.open(v); return; }
    if (c === "fit") { (dlgOpen ? full : mini).fit(); return; }
    if (c === "png") { const cv = full.screenshot(); if (cv) cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `${sym}-${st.interval}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }); return; }
    if (c === "tool") { draw.setTool(v); note = null; bars(); head(); return; }
    if (c === "clearDraw") { draw.clear(); note = null; head(); render(true); return; }
    if (c === "range" && RK.includes(v)) { st.range = v; st.interval = CoinBar.fix(v, st.interval); }
    else if (c === "interval" && IV.includes(v) && CoinBar.valid(st.range, v)) st.interval = v;
    else if (c === "type" && TYPES.includes(v)) st.type = v;
    else if (c === "scale" && SCALES.includes(v)) st.scale = v;
    else if (c === "volume") st.volume = el.checked;
    else if (c === "peaks" || c === "crosses") { st[c] = el.checked; pickOpen = true; }
    else if (c === "cmp") st.cmp = CoinParse.parse(el.value).symbols.slice(0, 3);
    else if (c === "ind" && Object.hasOwn(Indicators.DEFS, v)) { st.ind = el.checked ? Indicators.add(st.ind, v) : st.ind.filter(x => x.id !== v); pickOpen = true; }
    else if (c === "rm") st.ind = st.ind.filter((_, i) => i !== +el.dataset.i);
    else if (c === "param") { const x = st.ind[+el.dataset.i]; if (!x) return; x.p = Indicators.params(x.id, { ...x.p, [el.dataset.k]: el.value }); }
    else return;
    save(); bars();
    if (["range", "interval", "cmp"].includes(c)) load(); else render(true);
  }

  function openDialog() {
    if (!sym) return;
    const dlg = $("chartDlg");
    if (!dlg.open) dlg.showModal();
    dlgOpen = true; bars(); head(); load();
  }

  function init() {
    st = clean(Prefs.get("chart"));
    mini = TechChart.create($("miniHost"), { legend: $("miniLegend"), compact: true });
    full = TechChart.create($("fullHost"), { legend: $("fullLegend"), tip: $("fullTip"), onClick: pt => { const r = draw.click(pt, data.bars); if (!r) return; note = r; head(); if (r.redraw) render(true); } });
    for (const id of ["miniBar", "fullBar", "fullChips"]) { $(id).addEventListener("click", onBar); $(id).addEventListener("change", onBar); }
    $("fullBar").addEventListener("toggle", e => { if (e.target.matches("details.ipick")) { pickOpen = e.target.open; alignPick(); } }, true);
    document.addEventListener("click", e => { const d = $("fullBar").querySelector("details.ipick[open]"); if (d && !d.contains(e.target)) { d.open = false; pickOpen = false; } });
    $("dlgClose").onclick = () => $("chartDlg").close();
    $("chartDlg").addEventListener("close", () => { dlgOpen = false; full.destroy(); draw.setTool(draw.tool()); if (!active && unsub) { unsub(); unsub = null; } });
    bars();
  }

  // Guide dialog button: show / hide every instance of one indicator.
  function toggleInd(id) {
    if (!Object.hasOwn(Indicators.DEFS, id)) return;
    st.ind = st.ind.some(x => x.id === id) ? st.ind.filter(x => x.id !== id) : Indicators.add(st.ind, id);
    save(); bars(); render(true);
  }

  return { init, show, openDialog, toggleInd, set: raw => { st = clean(raw); save(); bars(); data.key = ""; load(); }, get: () => st, relabel: () => { bars(); if (dlgOpen) head(); }, bars: () => data.bars, symbol: () => sym };
})();
