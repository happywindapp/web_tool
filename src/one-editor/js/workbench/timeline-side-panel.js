// Timeline side panel (🕘): local history snapshots of the active tab, newest first; ≠ compares (click does too), ↺ restores (Ctrl+Z works); 📸 snaps now, 🧹 clears this tab's history.
const TimelinePanel = (() => {
  const L = SidePanelList, el = L.el, H = LocalHistory, box = $("tlList"), title = $("tlName");
  let gen = 0;
  const usable = d => H.usable(d) && !Docs.isList(d);
  const short = t => new Date(t).toLocaleString(I18n.lang, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const row = (src, r, i) => L.row([el("span", "", "🕘 " + short(r.t) + " · " + H.kb(r.size) + " · "), el("small", "", DevNum.ago(r.t) + (i ? "" : " · " + T("mới nhất")))],
    { title: H.when(r.t) + " — " + T("So sánh với tab hiện tại"), onclick: () => H.open(src, r),
      acts: [L.act("≠", T("So sánh với tab hiện tại"), () => H.open(src, r)), L.act("↺", T("Khôi phục bản này vào tab (Ctrl+Z được)"), () => H.restoreFrom(src, r))] });

  async function render() {
    if (!L.visible("timeline")) return;
    const my = ++gen, src = H.sourceOf(Views.activeDoc());
    title.textContent = src ? src.name : "";
    $("tlSnap").disabled = $("tlClear").disabled = !usable(src);
    if (!src) { box.replaceChildren(L.empty(T("Chưa có tab nào đang chọn."))); return; }
    if (!usable(src)) { box.replaceChildren(L.empty(T("Tab này không có lịch sử cục bộ (hex / file lớn / ghi chú khoá…)."))); return; }
    let list;
    try { list = await H.list(src); } catch (e) { if (my === gen) box.replaceChildren(L.empty(T("Không đọc được lịch sử cục bộ: {msg}", { msg: e.message }))); return; }
    if (my !== gen) return;
    $("tlClear").disabled = !list.length;
    box.replaceChildren(...(list.length ? list.map((r, i) => row(src, r, i)) : [L.empty(T("Chưa có bản lịch sử — mỗi lần Ctrl+S chụp 1 bản, hoặc bấm 📸."))]));
  }

  function init() {
    const later = L.later("timeline", render, 150);
    $("tlSnap").onclick = () => H.snap(H.sourceOf(Views.activeDoc()), false);
    $("tlClear").onclick = () => H.clear(H.sourceOf(Views.activeDoc()));
    H.onChange(later);
    Views.onChange(later);
    Docs.on(type => { if (type === "rename" || type === "closed") later(); });
    I18n.onChange(render);
    SidePanels.register("timeline", { show: () => render() });
  }

  return { init, render };
})();
