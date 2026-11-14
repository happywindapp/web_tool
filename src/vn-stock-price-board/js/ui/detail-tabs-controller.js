// Detail pane tabs: switch panels, lazy-load each tab's data once per symbol, drop stale responses after a symbol change.
const DetailTabs = (() => {
  const TABS = [["overview", "Tổng quan"], ["valuation", "Định giá"], ["chart", "Kỹ thuật"], ["trades", "Khớp lệnh"], ["news", "Tin tức"], ["finance", "Tài chính"],
    ["events", "Sự kiện"], ["profile", "Hồ sơ"], ["recs", "Khuyến nghị"]];
  const IDS = new Set(TABS.map(x => x[0]));
  const PANEL = { overview: "dRatios", valuation: "dValuation", chart: "dOutlook", news: "dNews", finance: "dFinance", events: "dEvents", profile: "dProfile", recs: "dRecs" };
  let tab = IDS.has(Prefs.get("dtab")) ? Prefs.get("dtab") : "overview", sym = "", seq = 0, last = 0, data = {}, loaded = {}, newsBusy = false;
  const req = {};

  function bar() {
    $("dTabs").innerHTML = TABS.map(([k, l]) => `<button data-dtab="${k}"${k === tab ? ' class="on"' : ""}>${Dom.esc(T(l))}</button>`).join("");
    document.querySelectorAll("#detail .dpanel").forEach(p => { p.hidden = p.dataset.tab !== tab; });
  }

  function render(k) {
    const el = $(PANEL[k]), d = data[k], lang = I18n.lang;
    if (!el) return;
    if (d === undefined) el.innerHTML = k === "finance" ? FinView.html(null, lang, T("Đang tải…")) : TabHtml.empty(T("Đang tải…"));
    else if (d === null && k === "valuation") el.innerHTML = PersonalUI.notesHtml(sym, last) + TabHtml.empty(T("Không tải được dữ liệu từ VNDirect. Thử lại sau."));
    else if (d === null) el.innerHTML = k === "finance" ? FinView.html(null, lang, T("Không tải được dữ liệu từ VNDirect. Thử lại sau.")) : TabHtml.empty(T("Không tải được dữ liệu từ VNDirect. Thử lại sau."));
    else if (k === "chart") el.innerHTML = OutlookView.html(d);
    else if (k === "overview") el.innerHTML = TabHtml.ratios(d.r) + OverviewExtra.html(d.x);
    else if (k === "valuation") { const keep = PersonalUI.noteDraft(sym); el.innerHTML = PersonalUI.notesHtml(sym, last) + ValTab.html(d, last); PersonalUI.restoreDraft(keep); }
    else if (k === "news") el.innerHTML = TabHtml.news(d.list, d.list.length < d.total);
    else if (k === "finance") el.innerHTML = FinView.html(d, lang);
    else if (k === "events") el.innerHTML = TabHtml.dividends(d.divs, last) + TabHtml.events(d.list);
    else if (k === "profile") el.innerHTML = TabHtml.profile(d.p, d.h, lang);
    else if (k === "recs") el.innerHTML = TabHtml.recs(d, last);
  }

  const FETCH = {
    overview: async s => { const [r, x] = await Promise.all([Finfo.ratios(s), OverviewExtra.load(s)]); return { r, x }; },
    valuation: s => ValTab.load(s),
    chart: s => OutlookView.load(s),
    news: async s => { const r = await Finfo.news(s, 1); return { list: r.data, total: r.total, page: 1 }; },
    finance: s => FinView.load(s),
    events: async s => { const [list, divs] = await Promise.all([Finfo.events(s, I18n.lang), Finfo.dividends(s).catch(() => [])]); return { list, divs }; },
    profile: async s => { const [p, h] = await Promise.all([Finfo.profile(s), Finfo.shareholders(s)]); return { p, h }; },
    recs: s => Finfo.recommendations(s),
  };

  async function load(k = tab, force = false) {
    if (!sym || !FETCH[k] || (!force && loaded[k] === sym)) return;
    // seq: symbol changed; req[k]: a newer load of the same tab (quick kind/period clicks, language switch) was started.
    const my = seq, s = sym, tok = req[k] = (req[k] || 0) + 1;
    loaded[k] = s; delete data[k]; render(k);
    let v;
    try { v = await FETCH[k](s); } catch (err) { console.warn("DetailTabs.load - get finfo fail", k, s, err); v = null; }
    if (my !== seq || tok !== req[k]) return;
    data[k] = v;
    if (v === null) loaded[k] = "";
    render(k);
  }

  async function moreNews() {
    const d = data.news, my = seq;
    if (!d || newsBusy) return;
    newsBusy = true;
    try {
      const r = await Finfo.news(sym, d.page + 1);
      if (my !== seq) return;
      Object.assign(d, { list: d.list.concat(r.data), total: r.total, page: d.page + 1 });
    } catch (err) { console.warn("DetailTabs.moreNews - get news fail", sym, err); }
    finally { newsBusy = false; }
    if (my === seq) render("news");
  }

  function show(k) {
    if (!IDS.has(k)) return;
    tab = k; Prefs.set("dtab", k); bar();
    ChartCtl.setActive(k === "chart");
    load(k);
  }

  function setSymbol(s) {
    if (s === sym) return;
    sym = s; seq++; data = {}; loaded = {}; last = 0;
    load("overview");
    if (tab !== "overview") load(tab);
  }

  function init() {
    bar();
    ChartCtl.setActive(tab === "chart");
    $("dTabs").addEventListener("click", e => { const b = e.target.closest("button[data-dtab]"); if (b) show(b.dataset.dtab); });
    $("dFinance").addEventListener("click", e => { const b = e.target.closest("button[data-act]"), r = b && FinView.act(b); if (r === "reload") load("finance", true); else if (r === "render") render("finance"); });
    $("dRatios").addEventListener("click", e => { const b = e.target.closest("button[data-act]"); if (b && data.overview && OverviewExtra.act(b)) render("overview"); });
    $("dValuation").addEventListener("click", e => {
      if (e.target.closest('[data-act="saveNote"]')) { Notes.set(sym, $("noteText").value, parseFloat($("noteTarget").value)); render("valuation"); Board.draw(true); Controls.say("good", "✔ Đã lưu ghi chú."); return; }
      const tr = e.target.closest("tr[data-sym]"); if (tr && tr.dataset.sym !== sym) Board.select(tr.dataset.sym, false);
    });
    $("dValuation").addEventListener("change", e => { const el = e.target.closest('input[data-act="dcf"]'); if (el && ValTab.edit(data.valuation, el)) render("valuation"); });
    $("dNews").addEventListener("click", e => { if (e.target.closest('[data-act="moreNews"]')) moreNews(); });
    // Events come per locale → refetch; the rest only re-render from memory.
    I18n.onChange(() => { bar(); delete data.events; loaded.events = ""; Object.keys(data).forEach(render); if (tab === "events") load("events"); });
  }

  return { init, show, setSymbol, reload: k => load(k, true), onQuote: q => { if (q && q.sym === sym) last = q.last || q.ref; }, get: () => tab, IDS };
})();
