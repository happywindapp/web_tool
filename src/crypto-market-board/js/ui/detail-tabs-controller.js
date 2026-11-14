// Detail pane tabs: Tổng quan · Kỹ thuật · Sổ lệnh · Phái sinh · Hồ sơ. Only the open tab loads / streams; switching coin reloads it.
const DetailTabs = (() => {
  const TABS = [["overview", "Tổng quan"], ["chart", "Kỹ thuật"], ["book", "Sổ lệnh"], ["deriv", "Phái sinh"], ["profile", "Hồ sơ"]];
  const IDS = new Set(TABS.map(t => t[0]));
  let cur = IDS.has(Prefs.get("dtab")) ? Prefs.get("dtab") : "overview", sym = "";

  function buttons() { $("dTabs").innerHTML = TABS.map(([id, label]) => `<button data-dt="${id}"${id === cur ? ' class="on"' : ""}>${Dom.esc(T(label))}</button>`).join(""); }

  function activate() {
    CoinChart.show(cur === "chart", sym);
    if (cur === "chart") OutlookView.open(sym); else OutlookView.close();
    if (cur === "book") BookView.open(sym); else BookView.close();
    if (cur === "deriv") DerivView.open(sym); else DerivView.close();
    if (cur === "profile") ProfileView.open(sym);
  }

  function show(id) {
    if (!IDS.has(id)) return;
    cur = id; Prefs.set("dtab", id);
    document.querySelectorAll("#detail .dpanel").forEach(p => { p.hidden = p.dataset.tab !== id; });
    $("dTabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.dt === id));
    if (sym) activate();
  }

  function setSymbol(s) { if (s === sym) return; sym = s; activate(); }

  function init() {
    buttons();
    $("dTabs").addEventListener("click", e => { const b = e.target.closest("button[data-dt]"); if (b) show(b.dataset.dt); });
    show(cur);
  }

  // Language switch: tab labels + re-render the open tab from cache.
  function relabel() { buttons(); DetailView.render(DetailView.current()); if (sym) { const s = sym; sym = ""; setSymbol(s); } CoinChart.relabel(); }

  return { IDS, init, show, setSymbol, relabel, get: () => cur };
})();
