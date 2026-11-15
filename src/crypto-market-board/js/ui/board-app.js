// App state: tabs (price tables + analytic views), data loading / refresh cadence, realtime wiring, selection, share payload.
// Analytic view contract: { id, label, wide, mount(el), unmount(), relabel() }; elements with data-coin="SYM" inside open that coin.
const Board = (() => {
  const tab = (id, label, v = null) => ({ id, label: v ? v.label : label, view: v });
  const TABS = [tab("watch", "★ Danh mục"), tab("market", "", MarketView), tab("screener", "", ScreenerView), tab("multi", "", MultiChartView), tab("corr", "", CorrView), tab("top100", "Top 100"), tab("top", "Top 250"), tab("trending", "Trending"), tab("exchanges", "", ExchangesView),
    tab("network", "Mạng lưới"), tab("spot", "Spot Binance"), tab("futures", "Phái sinh"), tab("defi", "", DefiView), tab("onchain", "", OnchainView), tab("wallet", "", WalletView)];
  const TAB_IDS = new Set(TABS.map(t => t.id));
  const S = { tab: "watch", sel: "BTC", fut: [], futAt: 0, futErr: null, view: null, missing: [], bad: [], geckoErr: null, loading: true };
  let opts = {}, filterText = "", futTimer = 0;
  const view = id => (TABS.find(t => t.id === id) || {}).view || null;

  // Tickers the socket must follow: current table + strip coins + selected coin + armed alerts.
  function syncLive() {
    const base = [...Strip.COINS, S.sel, ...Alerts.symbols()];
    const list = S.tab === "watch" ? [...Watch.all(), ...base] : S.tab === "top" ? [...Coins.list().map(g => g.sym), ...base] : TabSources.has(S.tab) ? [...TabSources.syms(S.tab), ...base] : base;
    Live.want(S.tab === "spot", [...new Set(list.map(Coins.pair).filter(Boolean))]);
  }

  function rows() {
    if (S.tab === "futures") return S.fut.map(f => ({ ...f, name: Coins.name(f.sym) })).sort((a, b) => b.qvol - a.qvol);
    const syms = S.tab === "watch" ? Watch.all() : S.tab === "top" ? [...new Set(Coins.list().map(g => g.sym))] : TabSources.has(S.tab) ? TabSources.syms(S.tab) : Coins.spotBases();
    const out = [];
    for (const sym of syms) {
      const r = Coins.row(sym);
      if (S.tab === "spot" && !r.last) continue;
      if (S.tab === "watch") { r.hold = Holdings.get(sym); r.pos = Pnl.position(r.hold, r.last); }
      out.push(r);
    }
    return S.tab === "spot" ? out.sort((a, b) => (b.spotQvol || 0) - (a.spotQvol || 0)) : out;
  }
  function filtered(list) {
    const toks = filterText.toUpperCase().split(/[\s,;|]+/).filter(Boolean);
    return toks.length ? list.filter(r => toks.some(t => r.sym.startsWith(t) || (t.length > 2 && (r.name || "").toUpperCase().includes(t)))) : list;
  }

  function draw(force = false) {
    if (S.view) { Controls.count(); return; }
    const all = rows(), list = filtered(all), cols = BoardCols.visible(S.tab, { ...opts, pos: opts.pos && Holdings.any() });
    S.missing = S.tab === "watch" && Coins.ready() && !S.loading ? Watch.all().filter(s => !Coins.known(s)) : [];
    PortfolioBar.render(S.tab === "watch" && opts.pos ? all : null);
    if (list.length) BoardView.render(list, cols, force);
    else if (S.tab === "watch" && !Watch.all().length) BoardView.message(T("Danh mục trống — gõ mã coin vào ô “Lọc / thêm coin” rồi bấm ★ Thêm."));
    else if (S.loading) BoardView.message(T("Đang tải dữ liệu…"));
    else if (all.length) BoardView.message(T("Không có coin khớp bộ lọc “{q}”.", { q: filterText }));
    else BoardView.message(S.tab === "futures" && S.futErr ? T("Không tải được dữ liệu phái sinh Binance — đang thử lại.") : T("Không có dữ liệu."));
    Controls.count(list.length, all.length);
  }

  function onTicks() {
    if (!S.view) draw(); else if (S.view.onTicks) S.view.onTicks();
    Strip.render();
    DetailView.live(Coins.row(S.sel));
    const al = Alerts.symbols();
    if (al.length) { const hits = Alerts.check(new Map(al.map(s => [s, Coins.row(s)]))); if (hits.length) PersonalUI.onHits(hits); }
    Controls.status();
  }

  async function loadFutures() {
    clearTimeout(futTimer);
    if (S.tab !== "futures") return;
    try { S.fut = await Futures.board(Coins.hasSpot); S.futAt = Date.now(); S.futErr = null; }
    catch (e) { console.warn("loadFutures - get futures board fail", e.message); S.futErr = e; }
    S.loading = false;
    if (S.tab === "futures") { draw(); futTimer = setTimeout(loadFutures, opts.rate === "off" ? 600e3 : 15000); }
  }

  function setTab(tab) {
    S.tab = TAB_IDS.has(tab) ? tab : "watch";
    Prefs.set("tab", S.tab);
    if (S.view) { S.view.unmount(); S.view = null; }
    const v = view(S.tab);
    $("boardBox").hidden = !!v; $("marketView").hidden = !v;
    $("work").classList.toggle("wide", !!(v && v.wide));
    Controls.tabChanged(S.tab);
    if (v) { $("marketView").innerHTML = ""; S.view = v; v.mount($("marketView")); Controls.count(); }
    else { BoardView.message(T("Đang tải dữ liệu…")); draw(true); }
    if (S.tab === "futures") { S.loading = !S.fut.length; loadFutures(); }
    subBar();
    if (TabSources.has(S.tab)) TabSources.load(S.tab, () => { subBar(); syncLive(); draw(); });
    syncLive();
    Controls.status();
  }

  function subBar() { const html = TabSources.bar(S.tab); $("subBar").innerHTML = html; $("subBar").hidden = !html; }
  function onSubBar(e) { if ((e.type === "change") === (e.target.tagName === "SELECT") && TabSources.act(e.target)) setTab(S.tab); }

  function select(sym, fromUser) {
    if (!CoinParse.isSymbol(sym)) return;
    const changed = sym !== S.sel;
    S.sel = sym;
    Prefs.set("sel", sym);
    BoardView.select(sym);
    if (changed) syncLive();
    DetailView.render(Coins.row(sym));
    DetailTabs.setSymbol(sym);
    if (fromUser) PhoneLayout.show(1);
  }

  // Slow sources: CoinGecko top 250 (2 min), global stats + Fear & Greed (5 min), VND rate (10 min).
  async function refreshGecko() {
    try { await Coins.loadGecko(); S.geckoErr = null; }
    catch (e) { console.warn("refreshGecko - get coingecko markets fail", e.message); S.geckoErr = e; }
    S.loading = false;
    if (S.tab === "top") syncLive();
    draw(); Strip.render(); DetailView.live(Coins.row(S.sel)); Controls.status();
  }
  async function refreshRate() {
    try { Currency.setRate(await Gecko.vndRate()); } catch (e) { console.warn("refreshRate - get USDT/VND fail", e.message); }
    Strip.render(); if (Currency.code === "VND") draw(true);
  }

  async function boot() {
    setInterval(() => { if (!document.hidden && opts.rate !== "off") refreshGecko(); }, 120e3);
    setInterval(() => { if (!document.hidden) Strip.loadSlow(); }, 300e3);
    setInterval(refreshRate, 600e3);
    Strip.loadSlow(); refreshRate();
    try { await Coins.loadPairs(); } catch (e) { console.warn("boot - load binance pairs fail", e.message); }
    syncLive(); draw();
    select(S.sel, false);
    await refreshGecko();
  }

  function onWatchChange() {
    BoardView.refreshStars();
    DetailView.render(Coins.row(S.sel));
    if (S.tab === "watch") { syncLive(); draw(); }
    Controls.status();
  }

  // Sample / share link / ?data=: { tab?, watch?, opts?, sort?, sym?, dtab?, chart?, bad?, error? }
  function applyIncoming(res) {
    if (!res) return false;
    if (res.error) { Controls.say("bad", "Link chia sẻ hoặc mẫu không hợp lệ — giữ nguyên danh mục hiện tại."); return false; }
    if (res.opts) setOpts(Controls.writeOpts(res.opts), false);
    if (res.sort) BoardView.setSort(res.sort);
    if (res.chart) CoinChart.set(res.chart);
    if (res.dtab) DetailTabs.show(res.dtab);
    if (res.watch) Watch.replace(res.watch);
    S.bad = res.bad || [];
    if (res.sym) select(res.sym, false);
    setTab(res.tab || (res.watch ? "watch" : S.tab));
    if (res.sym) PhoneLayout.show(1);
    return true;
  }

  function setOpts(o, redraw = true) {
    opts = o; Prefs.set("opts", o);
    Currency.set(o.cur); Live.setRate(o.rate);
    if (redraw) { draw(true); Strip.render(); DetailView.render(Coins.row(S.sel)); if (S.view) S.view.relabel(); }
  }

  const setFilter = Dom.debounce(v => { filterText = v; draw(); }, 150);
  const payload = () => ({ tab: S.tab, watch: Watch.all(), opts, sort: BoardView.getSort(), sym: S.sel, dtab: DetailTabs.get(), chart: CoinChart.get() });

  $("subBar").addEventListener("click", onSubBar); $("subBar").addEventListener("change", onSubBar);
  Watch.onChange(onWatchChange);
  Holdings.onChange(() => { if (S.tab === "watch") draw(); });
  Alerts.onChange(syncLive);
  Live.onTicks(onTicks);
  Live.onStatus(() => Controls.status());

  return { TABS, TAB_IDS, state: () => S, getOpts: () => opts, setTab, select, draw, boot, applyIncoming, setOpts, setFilter, payload, rows, setBad: b => { S.bad = b; }, relabelView: () => { if (S.view) S.view.relabel(); subBar(); } };
})();
