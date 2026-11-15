// "Thị trường" / "Bộ lọc" tabs: swap the price table for the market view, start the whole-market loads, route clicks and inputs.
const MarketTabs = (() => {
  const SPECIAL = new Set(["market", "screener", "flows"]);
  let tab = "", quotes = [];
  const is = t => SPECIAL.has(t);
  const view = () => $("marketView");

  function rebuild() {
    if (!tab) return;
    if (tab === "screener") { view().innerHTML = ScreenView.form(I18n.lang); ScreenView.results(quotes); }
    else if (tab === "flows") view().innerHTML = FlowsView.html(quotes);
    else view().innerHTML = MarketView.html(quotes, I18n.lang);
  }

  function show(t) {
    tab = is(t) ? t : "";
    $("boardBox").hidden = !!tab;
    view().hidden = !tab;
    if (!tab) return;
    if (tab === "flows") { rebuild(); return; }
    Market.sectorsLoad().then(rebuild, err => console.warn("MarketTabs.show - load sectors fail", err));
    Market.ratiosAll().catch(err => { console.warn("MarketTabs.show - load market ratios fail", err); Controls.say("bad", "Không tải được chỉ số toàn thị trường từ VNDirect. Thử lại sau."); });
    rebuild();
  }

  function render(t, qs) {
    quotes = qs;
    if (t !== tab) return;
    if (tab === "screener") ScreenView.results(qs); else if (tab === "flows") view().innerHTML = FlowsView.html(qs); else view().innerHTML = MarketView.html(qs, I18n.lang);
  }

  function init() {
    view().addEventListener("click", e => {
      const el = e.target.closest("button, th, [data-sym], [data-tab]");
      if (!el) return;
      if (tab === "screener") {
        const r = ScreenView.act(el, "click");
        if (r === "form") rebuild(); else if (r === "results") ScreenView.results();
        if (r || el.closest("button")) return;
      } else if (PicksView.act(el, "click") || MarketView.act(el)) { rebuild(); return; }
      if (el.dataset.tab) { Board.setBad([]); Board.setTab(el.dataset.tab); return; }
      const row = el.closest("[data-sym]");
      if (row) Board.select(row.dataset.sym, true);
    });
    view().addEventListener("change", e => {
      if (tab === "flows") { if (FlowsView.act(e.target)) rebuild(); return; }
      if (tab === "market") { if (PicksView.act(e.target, "change")) rebuild(); return; }
      if (tab !== "screener") return;
      const r = ScreenView.act(e.target, "change");
      if (r === "form") rebuild(); else if (r === "results") ScreenView.results();
    });
    Market.onChange(() => { if (tab) render(tab, quotes); });
    PicksView.onChange(() => { if (tab === "market") render(tab, quotes); });
    FlowsView.onChange(() => { if (tab === "flows") { rebuild(); Board.tick(); } });
    I18n.onChange(rebuild);
    Watch.onChange(() => { if (tab === "screener") ScreenView.results(); });
  }

  return { init, show, render, is };
})();
