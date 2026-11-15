// "Đa biểu đồ" tab: 2–4 compact Binance candle charts side by side (coin + interval per cell), live via kline streams. State in Prefs "multi".
const MultiChartView = (() => {
  const IVS = [["15m", "15m"], ["1h", "1h"], ["4h", "4h"], ["1d", "1D"], ["1w", "1W"]], IV = IVS.map(x => x[0]), DEF = ["BTC", "ETH", "SOL", "BNB"], N = 4, BARS = 300, SHOW = 90;
  const e = s => Dom.esc(s ?? "");
  const tk = new Map();
  let host = null, st = null, cells = [], timer = 0, themeWatch = null;

  function clean(raw) {
    const r = raw && typeof raw === "object" ? raw : {}, saved = Array.isArray(r.cells) ? r.cells : [], base = [...new Set([...Watch.all(), ...DEF])].slice(0, N);
    return { layout: r.layout === "1x2" ? "1x2" : "2x2", cells: base.map((d, i) => ({ sym: saved[i] && CoinParse.isSymbol(saved[i].sym) ? saved[i].sym : d, iv: saved[i] && IV.includes(saved[i].iv) ? saved[i].iv : "4h" })) };
  }
  const save = () => Prefs.set("multi", st);
  const count = () => st.layout === "1x2" ? 2 : N;
  const opts = (list, cur) => list.map(([v, l]) => `<option value="${v}"${v === cur ? " selected" : ""}>${e(l)}</option>`).join("");

  function bar() {
    host.querySelector(".mc-bar").innerHTML = `<label class="chk">${e(T("Bố cục"))} <select data-mc="layout">${opts([["2x2", "2×2"], ["1x2", "1×2"]], st.layout)}</select></label>`
      + `<label class="chk"><select data-mc="sync" title="${e(T("Đặt cùng một khung nến cho mọi ô"))}"><option value="">${e(T("Đồng bộ khung nến…"))}</option>${opts(IVS, "")}</select></label>`
      + `<span class="muted">${e(T("Gõ mã coin vào ô để đổi; bấm giá để xem chi tiết coin."))}</span>`;
  }

  function cellHtml(i) {
    return `<div class="mc-cell" data-i="${i}"><div class="mc-head"><input class="mc-sym" data-mc="sym" data-i="${i}" type="text" autocomplete="off" spellcheck="false" maxlength="20">`
      + `<button class="mc-info" data-coin=""></button><select data-mc="iv" data-i="${i}">${opts(IVS, "")}</select><button class="mc-full" data-mc="full" data-i="${i}">⤢</button></div>`
      + `<div class="mc-box cbox"><div class="chost"></div><p class="cmsg" hidden></p></div></div>`;
  }
  function titles() {
    cells.forEach(c => { c.el.querySelector(".mc-sym").title = T("Mã coin, ví dụ BTC"); c.el.querySelector(".mc-full").title = T("Mở biểu đồ đầy đủ (chỉ báo, công cụ vẽ)"); c.el.querySelector(".mc-info").title = T("Xem chi tiết coin"); });
  }

  function head(i) {
    const c = cells[i], { sym } = st.cells[i], t = tk.get(Coins.pair(sym)), row = Coins.row(sym);
    const last = c.last ?? (t && t.last) ?? row.last, pct = t && t.open && last ? (last / t.open - 1) * 100 : row.pct, tone = Fmt.tone(pct);
    c.info.dataset.coin = sym;
    c.info.innerHTML = last ? `<b class="${tone}">${e(Fmt.money(last))}</b> <span class="${tone}">${e(Fmt.pct(pct, 1))}</span>` : "";
  }
  function msg(i, key) { const p = cells[i].el.querySelector(".cmsg"); p.hidden = !key; p.textContent = key ? T(key) : ""; }

  function stop(i) { const c = cells[i]; c.seq++; if (c.unsub) { c.unsub(); c.unsub = null; } c.chart.destroy(); c.last = null; c.args = null; }
  const recolor = () => cells.forEach(c => { if (c.args) c.chart.render(c.args); });

  async function start(i) {
    const c = cells[i]; stop(i);
    const my = c.seq, { sym, iv } = st.cells[i], pair = Coins.pair(sym);
    c.el.querySelector(".mc-sym").value = sym; c.el.querySelector("[data-mc=iv]").value = iv; head(i);
    if (!pair) {
      if (Coins.spotBases().length) msg(i, "Coin này không có cặp USDT trên Binance nên không có biểu đồ nến.");
      else { msg(i, "Đang tải dữ liệu biểu đồ…"); setTimeout(() => { if (host && my === c.seq) start(i); }, 1000); }
      return;
    }
    msg(i, "Đang tải dữ liệu biểu đồ…");
    let bars;
    try { bars = await Spot.klines(pair, iv, BARS); }
    catch (x) { if (my === c.seq) { console.warn("MultiChartView.start - get klines fail", pair, x.message); msg(i, "Không tải được nến từ Binance. Thử lại sau."); } return; }
    if (my !== c.seq || !host) return;
    if (!bars.length) { msg(i, "Không có dữ liệu nến."); return; }
    msg(i, null);
    c.last = bars[bars.length - 1].close;
    c.args = { bars, type: "candle", scale: "normal", volume: true, inds: [], peaks: false, crosses: false, intraday: iv !== "1d" && iv !== "1w", from: Math.max(0, bars.length - SHOW), keep: false, compare: [] };
    c.chart.render(c.args);
    c.unsub = Live.sub(`${pair.toLowerCase()}@kline_${iv}`, d => { if (!d || !d.k) return; const b = Spot.liveBar(d.k); c.chart.updateLast(b); c.last = b.close; head(i); });
    head(i); tickersSoon();
  }

  async function tickers() {
    const pairs = [...new Set(st.cells.slice(0, count()).map(c => Coins.pair(c.sym)).filter(Boolean))];
    if (!pairs.length || !host) return;
    try { (await Spot.tickers(pairs)).forEach(t => tk.set(t.pair, t)); } catch (x) { console.warn("MultiChartView.tickers - get 24h tickers fail", x.message); }
    if (host) cells.forEach((_, i) => head(i));
  }
  const tickersSoon = Dom.debounce(tickers, 200);

  function layout() {
    host.querySelector(".mc-grid").className = `mc-grid mc-${st.layout}`;
    cells.forEach((c, i) => { const on = i < count(); c.el.hidden = !on; if (on && !c.on) start(i); else if (!on && c.on) stop(i); c.on = on; });
  }

  function onChange(ev) {
    const el = ev.target.closest("[data-mc]");
    if (!el) return;
    const k = el.dataset.mc, i = +el.dataset.i;
    if (k === "layout") { st.layout = el.value === "1x2" ? "1x2" : "2x2"; layout(); }
    else if (k === "sync") { if (!IV.includes(el.value)) return; st.cells.forEach(c => { c.iv = el.value; }); el.value = ""; cells.forEach((c, j) => { if (c.on) start(j); }); }
    else if (k === "sym" && cells[i]) {
      const s = CoinParse.parse(el.value).symbols[0];
      if (!s) { el.value = st.cells[i].sym; return; }
      st.cells[i].sym = s; start(i);
    } else if (k === "iv" && cells[i] && IV.includes(el.value)) { st.cells[i].iv = el.value; start(i); }
    else return;
    save();
  }
  function onClick(ev) {
    const b = ev.target.closest("[data-mc=full]");
    const s = b && cells[+b.dataset.i] && st.cells[+b.dataset.i].sym;
    if (s && Coins.pair(s)) { Board.select(s, false); DetailTabs.show("chart"); CoinChart.openDialog(); }
  }

  function mount(el) {
    host = el; st = clean(Prefs.get("multi"));
    el.innerHTML = `<div class="mc-bar"></div><div class="mc-grid">${Array.from({ length: N }, (_, i) => cellHtml(i)).join("")}</div>`;
    cells = [...el.querySelectorAll(".mc-cell")].map(div => ({ el: div, info: div.querySelector(".mc-info"), chart: TechChart.create(div.querySelector(".chost"), { compact: true }), seq: 0, unsub: null, last: null, on: false }));
    bar(); titles(); layout();
    el.addEventListener("change", onChange); el.addEventListener("click", onClick);
    timer = setInterval(tickers, 30000);
    themeWatch = new MutationObserver(recolor); themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }
  function unmount() {
    if (host) { host.removeEventListener("change", onChange); host.removeEventListener("click", onClick); cells.forEach((_, i) => stop(i)); }
    clearInterval(timer); if (themeWatch) themeWatch.disconnect(); host = null; cells = [];
  }
  function relabel() { if (!host) return; bar(); titles(); cells.forEach((_, i) => head(i)); }

  return { id: "multi", label: "Đa biểu đồ", wide: true, mount, unmount, relabel, onTicks: () => { if (host) cells.forEach((_, i) => head(i)); } };
})();
