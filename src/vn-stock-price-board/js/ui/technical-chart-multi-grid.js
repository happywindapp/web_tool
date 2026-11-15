// Full chart layout 2 / 4: extra compact charts next to the main one, each with its own ticker (empty = the main ticker) and candle interval.
const ChartGrid = (() => {
  const LAYOUTS = [1, 2, 4], MAX = 3, STALE = 60e3;
  const DEFAULT = [{ sym: "", interval: "1W" }, { sym: "VNINDEX", interval: "1D" }, { sym: "", interval: "1h" }];
  // Range shown for an interval when the main chart's range does not fit it.
  const RANGE_FOR = { "5m": "1W", "15m": "1M", "30m": "3M", "1h": "3M", "1D": "1Y", "1W": "3Y", "1M": "10Y" };
  const e = s => Dom.esc(s ?? "");
  let cells = [], n = 1, mainSym = "", st = null, onEdit = () => {};

  const layout = v => LAYOUTS.includes(+v) ? +v : 1;
  function clean(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return DEFAULT.map((d, i) => {
      const x = list[i] && typeof list[i] === "object" ? list[i] : {}, sym = String(x.sym || "").trim().toUpperCase();
      return { sym: sym && WatchParse.isSymbol(sym) ? sym : (x.sym === undefined ? d.sym : ""), interval: ChartRange.INTERVALS.some(v => v.k === x.interval) ? x.interval : d.interval };
    });
  }

  const box = () => $("fullGrid");
  const symOf = c => c.cfg.sym || mainSym;
  const rangeOf = iv => st && ChartRange.valid(st.range, iv) ? st.range : RANGE_FOR[iv];

  function build() {
    cells.forEach(c => c.view.destroy());
    box().querySelectorAll(".ccell").forEach(el => el.remove());
    cells = [];
    for (let i = 0; i < n - 1; i++) {
      const cfg = st.cells[i], el = document.createElement("div");
      el.className = "ccell"; el.dataset.cell = i;
      el.innerHTML = `<div class="ccell-bar"><input type="text" data-g="sym" value="${e(cfg.sym)}" placeholder="${e(mainSym)}" title="${e(T("Mã hoặc chỉ số (để trống = mã đang xem)"))}" spellcheck="false" autocomplete="off">`
        + `<select data-g="interval" title="${e(T("Khung nến"))}">${ChartRange.INTERVALS.map(v => `<option value="${v.k}"${v.k === cfg.interval ? " selected" : ""}>${v.k}</option>`).join("")}</select>`
        + `<span class="ccell-name"></span></div><div class="cbox"><div class="clegend"></div><div class="chost"></div><p class="cmsg" hidden></p></div>`;
      box().appendChild(el);
      cells.push({ cfg, el, key: "", drawn: "", at: 0, bars: [], view: TechChart.create(el.querySelector(".chost"), { legend: el.querySelector(".clegend"), compact: true }) });
    }
  }

  function msg(c, key) { const m = c.el.querySelector(".cmsg"); m.hidden = !key; m.textContent = key ? T(key) : ""; }

  async function load(c, force) {
    const sym = symOf(c), iv = c.cfg.interval, rk = rangeOf(iv), key = `${sym}|${rk}|${iv}`;
    if (!sym || (!force && c.key === key && Date.now() - c.at < STALE)) { draw(c); return; }
    if (c.key !== key) { c.bars = []; msg(c, "Đang tải dữ liệu biểu đồ…"); }
    c.key = key; c.at = Date.now();
    try {
      const w = ChartRange.windowOf(rk, iv), raw = await History.load(sym, w.res, w.from, w.to);
      if (c.key !== key || !cells.includes(c)) return;
      c.bars = ChartRange.shape(raw, iv);
    } catch (err) { console.warn("ChartGrid.load - get OHLC history fail", sym, err); if (c.key === key) c.bars = []; }
    draw(c);
  }

  function draw(c) {
    const name = c.el.querySelector(".ccell-name"), sym = symOf(c), b = c.bars, last = b[b.length - 1], prev = b[b.length - 2];
    if (!b.length) { c.view.destroy(); name.textContent = sym; if (c.key) msg(c, "Không có dữ liệu cho khoảng thời gian / khung nến này."); return; }
    msg(c, null);
    const pct = prev && prev.close ? (last.close / prev.close - 1) * 100 : 0;
    name.innerHTML = `<b>${e(sym)}</b> ${TechChart.fmtPrice(last.close)} <span class="${pct > 0 ? "up" : pct < 0 ? "down" : "ref"}">${Fmt.signed(pct)}%</span>`;
    const intra = ChartRange.intraday(c.cfg.interval);
    // keep: same data drawn before → keep the user's zoom / scroll.
    const keep = c.drawn === c.key; c.drawn = c.key;
    c.view.render({ bars: b, type: st.type, scale: st.scale === "pct" ? "normal" : st.scale, volume: st.volume, peaks: false, crosses: false, intraday: intra, keep, compare: [],
      inds: Indicators.compute(st.ind.filter(x => Indicators.DEFS[x.id].pane === "main" && (!Indicators.DEFS[x.id].intraday || intra)), b), from: ChartRange.firstVisible(b, rangeOf(c.cfg.interval)) });
  }

  // Called on every main render while the dialog is open: rebuild cells when the layout changed, then load / redraw each.
  function sync(state, sym) {
    st = state;
    const want = layout(state.layout), symChanged = sym !== mainSym;
    mainSym = sym;
    box().dataset.n = want;
    if (want !== n || cells.length !== want - 1 || cells.some((c, i) => c.cfg !== state.cells[i])) { n = want; build(); }
    else if (symChanged) cells.forEach(c => { c.el.querySelector('[data-g="sym"]').placeholder = sym; });
    cells.forEach(c => load(c, false));
  }

  function destroy() { cells.forEach(c => c.view.destroy()); box().querySelectorAll(".ccell").forEach(el => el.remove()); cells = []; n = 1; box().dataset.n = 1; }

  function init(edited) {
    onEdit = edited;
    box().addEventListener("change", ev => {
      const el = ev.target.closest("[data-g]"), cellEl = el && el.closest(".ccell"), c = cellEl && cells[+cellEl.dataset.cell];
      if (!c) return;
      if (el.dataset.g === "interval") c.cfg.interval = el.value;
      else {
        const s = el.value.trim().toUpperCase();
        if (s && !WatchParse.isSymbol(s)) { el.value = c.cfg.sym; return; }
        c.cfg.sym = el.value = s;
      }
      onEdit();
      load(c, true);
    });
  }

  return { LAYOUTS, layout, clean, sync, destroy, init, tick: () => cells.forEach(c => { if (Date.now() - c.at >= STALE) load(c, false); }) };
})();
