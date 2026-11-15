// App state + polling loop: resolve the tab's symbols, poll quotes + indices, feed the views, load trades for the selected symbol.
const Board = (() => {
  const TABS = [
    { id: "watch", label: "★ Danh mục" }, { id: "market", label: "Thị trường" }, { id: "screener", label: "Bộ lọc" }, { id: "flows", label: "Dòng tiền" }, { id: "VN30" }, { id: "VN100" }, { id: "hose", label: "HOSE" }, { id: "hnx", label: "HNX" },
    { id: "HNX30" }, { id: "upcom", label: "UPCOM" }, { id: "ETF" }, { id: "CW", label: "Chứng quyền" }, { id: "PS", label: "Phái sinh" },
  ];
  const MORE = ["VNMID", "VNSML", "VNDIAMOND", "VNFINLEAD", "VNX50"];
  const TAB_IDS = new Set([...TABS.map(t => t.id), ...MORE]);
  const validTab = t => TAB_IDS.has(t) || /^icb:\d{4}$/.test(t);
  const S = { tab: "watch", syms: [], quotes: new Map(), sel: "", selQuote: null, missing: [], bad: [], gen: 0, seq: 0, timer: 0, at: null, error: false, loading: true, trades: null };
  const lists = new Map();
  let opts = {}, filterText = "", futOpts = { base: null, o: null };
  // Futures tab adds its own columns (opt "fut"); the object is reused so the table only rebuilds when options change.
  const viewOpts = () => S.tab !== "PS" ? opts : futOpts.base === opts ? futOpts.o : (futOpts = { base: opts, o: { ...opts, fut: true } }).o;

  async function symbolsFor(tab) {
    if (tab === "watch") return Watch.all();
    if (MarketTabs.is(tab)) return Market.allSymbols();
    if (tab.startsWith("icb:")) return Market.sectorCodes(tab.slice(4));
    if (lists.has(tab)) return lists.get(tab);
    let syms;
    if (tab === "ETF" || tab === "CW" || tab === "PS") {
      if (!Universe.ready()) await Universe.load();
      syms = Universe.ofType(tab === "ETF" ? "E" : tab === "PS" ? "D" : "W");
      // The directory keeps expired warrants → keep only those still trading.
      if (tab === "CW") { const today = QuoteModel.vnDate(); syms = (await Feed.quotes(syms)).filter(q => q.cw && q.cw.lastTrade >= today).map(q => q.sym).sort(); }
    } else syms = await Feed.list(tab);
    if (syms.length) lists.set(tab, syms);
    return syms;
  }

  async function setTab(tab) {
    S.tab = validTab(tab) ? tab : "watch";
    Prefs.set("tab", S.tab);
    const gen = ++S.gen;
    clearTimeout(S.timer);
    Object.assign(S, { quotes: new Map(), missing: [], loading: true, syms: [] });
    Controls.tabChanged(S.tab);
    MarketTabs.show(S.tab);
    BoardView.message(T("Đang tải danh sách mã…"));
    try {
      const syms = await symbolsFor(S.tab);
      if (gen !== S.gen) return;
      S.syms = syms;
    } catch (e) {
      if (gen !== S.gen) return;
      console.warn("setTab - load symbol list fail", S.tab, e);
      S.error = true;
    }
    await tick();
  }

  // seq: only the latest poll may write state (a watchlist edit can start a 2nd tick while one is in flight).
  async function tick() {
    clearTimeout(S.timer);
    const gen = S.gen, seq = ++S.seq;
    try {
      // A symbol list that failed to load (network down on tab switch) is retried on every poll.
      if (!S.syms.length && S.tab !== "watch") { const syms = await symbolsFor(S.tab); if (gen !== S.gen || seq !== S.seq) return; S.syms = syms; }
      // Alert tickers outside the current tab ride along in the same poll (not shown in the table).
      const want = [...new Set([...S.syms, ...Alerts.symbols()])];
      const [qs, idx] = await Promise.all([want.length ? Feed.quotes(want) : [], Feed.indices()]);
      if (gen !== S.gen || seq !== S.seq) return;
      const vn30 = idx.find(x => x.name === "VN30");
      if (vn30 && vn30.value) for (const q of qs) if (q.fut) q.fut.basis = (q.last || q.ref) - vn30.value;
      Object.assign(S, { quotes: new Map(qs.map(q => [q.sym, q])), at: new Date(), error: false, loading: false });
      S.missing = S.tab === "watch" ? S.syms.filter(s => !S.quotes.has(s)) : [];
      IndexStrip.render(idx, { tab: S.tab, quotes: S.quotes });
      checkAlerts(S.quotes);
      const first = BoardCols.sortQuotes(visibleQuotes(), BoardView.getSort().key, BoardView.getSort().dir)[0];
      if (S.quotes.has(S.sel) && !S.trades) select(S.sel, false);
      else if (!S.quotes.has(S.sel) && first) select(first.sym, false);
      draw();
      refreshTrades();
      ChartCtl.onQuote(S.quotes.get(S.sel));
      DetailTabs.onQuote(S.quotes.get(S.sel));
    } catch (e) {
      if (gen !== S.gen || seq !== S.seq) return;
      console.warn("tick - poll VPS datafeed fail", e);
      Object.assign(S, { error: true, loading: false });
      if (!S.quotes.size) BoardView.message(T("Không tải được dữ liệu từ VPS. Kiểm tra kết nối mạng — tool sẽ tự thử lại."));
    }
    Controls.status();
    schedule();
  }

  // Alerts fire only while prices are live (session or lunch break): pre-open / evening / weekend quotes are yesterday's.
  function checkAlerts(quotes) {
    const ph = QuoteModel.phase();
    if (QuoteModel.isLive(ph) || ph === "break") PersonalUI.onHits(Alerts.check(quotes), quotes);
  }
  // Hidden page: no board redraws, but alert tickers are still polled every 60 s so notifications can fire.
  async function alertTick() {
    try { const qs = await Feed.quotes(Alerts.symbols()); checkAlerts(new Map(qs.map(q => [q.sym, q]))); }
    catch (e) { console.warn("alertTick - poll alert tickers fail", e); }
    schedule();
  }

  function schedule() {
    clearTimeout(S.timer);
    if (opts.rate === "off") return;
    if (document.hidden) { if (Alerts.symbols().length) S.timer = setTimeout(alertTick, 60000); return; }
    // Whole-market tabs poll ~1,500 quotes (≈1.5 MB) → at most every 30 s.
    const ms = Math.max((+opts.rate || 5) * 1000, QuoteModel.isLive(QuoteModel.phase()) ? 0 : 60000, MarketTabs.is(S.tab) ? 30000 : 0);
    S.timer = setTimeout(tick, ms);
  }

  function visibleQuotes() {
    const all = S.syms.map(s => S.quotes.get(s)).filter(Boolean);
    const toks = filterText.toUpperCase().split(/[\s,;|]+/).filter(Boolean);
    return toks.length ? all.filter(q => toks.some(t => q.sym.startsWith(t))) : all;
  }

  function draw(force = false) {
    if (MarketTabs.is(S.tab)) { const qs = S.syms.map(s => S.quotes.get(s)).filter(Boolean); MarketTabs.render(S.tab, qs); Controls.count(qs.length, S.syms.length); renderDetail(); return; }
    const list = visibleQuotes();
    Notes.decorate(list);
    if (list.length) BoardView.render(list, viewOpts(), force);
    else if (!S.loading && S.tab === "watch" && !S.syms.length) BoardView.message(T("Danh mục trống — gõ mã vào ô “Lọc / thêm mã” rồi bấm ★ Thêm."));
    else if (!S.loading && S.quotes.size) BoardView.message(T("Không có mã khớp bộ lọc “{q}”.", { q: filterText }));
    else if (!S.loading && !S.error) BoardView.message(T("Không có mã nào."));
    Controls.count(list.length, S.syms.length);
    renderDetail();
  }

  function renderDetail() {
    const q = S.quotes.get(S.sel) || S.selQuote;
    if (q) S.selQuote = q;
    const t = S.trades && S.trades.sym === S.sel ? S.trades : null;
    DetailView.render({ q, name: q ? Universe.name(q.sym, I18n.lang) : "", watched: !!q && Watch.has(q.sym), unit: q && q.fut ? "" : opts.unit,
      trades: t && t.list, tradeState: t ? t.state : "loading" });
  }

  function select(sym, fromUser) {
    if (sym !== S.sel || !S.trades) { S.sel = sym; S.selQuote = S.quotes.get(sym) || null; loadTrades(sym); }
    BoardView.select(sym);
    renderDetail();
    ChartCtl.setSymbol(sym);
    DetailTabs.setSymbol(sym);
    DetailTabs.onQuote(S.quotes.get(sym));
    if (fromUser) PhoneLayout.show(1);
  }

  async function loadTrades(sym) {
    const keep = S.trades && S.trades.sym === sym && S.trades.list;
    S.trades = { sym, list: keep || null, state: keep ? "ok" : "loading", at: Date.now(), totVol: S.quotes.get(sym)?.totVol || 0 };
    renderDetail();
    try {
      const list = await Feed.trades(sym);
      if (S.trades?.sym !== sym) return;
      Object.assign(S.trades, { list, state: "ok" });
    } catch (e) {
      console.warn("loadTrades - get match history fail", sym, e);
      if (S.trades?.sym !== sym) return;
      S.trades.state = S.trades.list ? "ok" : "error";
    }
    renderDetail();
  }

  // Match history is large → reload only when the matched volume moved and the last load is ≥ 60 s old (≈3.5 MB for a liquid ticker).
  function refreshTrades() {
    const q = S.quotes.get(S.sel), t = S.trades;
    if (q && t && t.sym === S.sel && t.state !== "loading" && q.totVol !== t.totVol && Date.now() - t.at > 60000) loadTrades(S.sel);
  }

  function onWatchChange() {
    BoardView.refreshStars();
    if (S.tab === "watch") {
      S.syms = Watch.all();
      if (S.syms.some(s => !S.quotes.has(s))) { BoardView.message(T("Đang tải danh sách mã…")); tick(); } else { S.missing = []; draw(); }
    } else renderDetail();
    Controls.status();
  }

  // Demo / share link / ?data=: { tab?, watch?, opts?, sort?, sym?, bad?, error? }.
  function applyIncoming(res) {
    if (!res) return false;
    if (res.error) { Controls.say("bad", "Link chia sẻ hoặc mẫu không hợp lệ — giữ nguyên danh mục hiện tại."); return false; }
    if (res.opts) setOpts(Controls.writeOpts(res.opts), false);
    if (res.sort) BoardView.setSort(res.sort);
    if (res.chart) ChartCtl.set(res.chart);
    if (res.fin) { FinView.set(res.fin); DetailTabs.reload("finance"); }
    if (res.dtab) DetailTabs.show(res.dtab);
    if (res.watch) Watch.replace(res.watch);
    S.bad = res.bad || [];
    if (res.sym) { S.sel = res.sym; S.selQuote = null; S.trades = null; }
    setTab(res.tab || (res.watch ? "watch" : S.tab));
    if (res.sym) PhoneLayout.show(1);
    return true;
  }

  function setOpts(o, redraw = true) {
    opts = o;
    Prefs.set("opts", o);
    if (redraw) { draw(true); schedule(); }
  }

  const setFilter = Dom.debounce(v => { filterText = v; draw(); }, 150);
  const payload = () => ({ tab: S.tab, watch: Watch.all(), opts, sort: BoardView.getSort(), sym: S.sel, chart: ChartCtl.get(), dtab: DetailTabs.get(), fin: FinView.get() });

  Watch.onChange(onWatchChange);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && opts.rate !== "off" && !(S.loading && !S.syms.length)) tick(); else schedule(); });

  return { TABS, MORE, TAB_IDS, validTab, state: () => S, getOpts: viewOpts, setTab, tick, draw, select, loadTrades, renderDetail, applyIncoming, setOpts, setFilter, payload, setBad: b => { S.bad = b; } };
})();
