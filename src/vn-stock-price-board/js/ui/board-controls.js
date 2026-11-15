// DOM wiring: tabs, toolbar options, add / filter box, share / undo, CSV, keyboard, status footer, language switch, start-up.
const Controls = (() => {
  let msg = null, msgTimer = 0;
  const PHASE = { pre: "Chưa mở cửa", ato: "Phiên ATO", open: "Khớp lệnh liên tục", break: "Nghỉ trưa", atc: "Phiên ATC", plo: "Sau giờ (PLO)", closed: "Đóng cửa" };
  const tabLabel = id => { if (id.startsWith("icb:")) return Market.sectorName(id.slice(4), I18n.lang); const t = Board.TABS.find(x => x.id === id); return t && t.label ? T(t.label) : id; };

  function say(cls, key, params) {
    msg = { cls, key, params };
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msg = null; status(); }, 8000);
    status();
  }

  function status() {
    const S = Board.state(), o = Board.getOpts(), out = [];
    const ph = QuoteModel.phase();
    $("phase").textContent = T(PHASE[ph]);
    $("phase").className = "badge " + (QuoteModel.isLive(ph) ? "live" : "");
    if (S.error) out.push(`<span class="bad">${Dom.esc(T("Mất kết nối tới VPS — đang thử lại…"))}</span>`);
    else if (S.at) out.push(`<span>${Dom.esc(T("Cập nhật lúc {t}", { t: S.at.toLocaleTimeString("vi-VN", { hour12: false }) }))}</span>`);
    out.push(`<span class="muted">${Dom.esc(o.rate === "off" ? T("Đã tạm dừng cập nhật") : QuoteModel.isLive(ph) ? T("Làm mới mỗi {n}s", { n: o.rate }) : T("Ngoài giờ giao dịch: làm mới mỗi 60s"))}</span>`);
    if (S.bad.length) out.push(`<span class="warn">${Dom.esc(T("Bỏ qua (không phải mã CK): {list}", { list: S.bad.join(", ") }))}</span>`);
    if (S.missing.length) out.push(`<span class="warn">${Dom.esc(T("Không có dữ liệu cho {n} mã: {list}", { n: S.missing.length, list: S.missing.join(", ") }))}</span>`
      + ` <button id="dropMissing">${Dom.esc(T("Bỏ các mã này khỏi danh mục"))}</button>`);
    if (msg) out.push(`<span class="${msg.cls}">${Dom.esc(T(msg.key, msg.params))}</span>`);
    $("status").innerHTML = out.join(" · ");
    $("undo").hidden = !Watch.hasBackup();
  }

  const sectorOptions = () => { const s = Market.sectors(); return s ? s.levels[2].map(x => [x.code, I18n.lang === "en" && x.en ? x.en : x.vi]).sort((a, b) => a[1].localeCompare(b[1]))
    .map(([c, n]) => `<option value="icb:${Dom.esc(c)}">${Dom.esc(n)}</option>`).join("") : ""; };
  function buildTabs() {
    $("tabs").innerHTML = Board.TABS.map(t => `<button data-tab="${t.id}">${Dom.esc(tabLabel(t.id))}</button>`).join("")
      + `<select id="moreTabs" title="${Dom.esc(T("Rổ chỉ số khác"))}"><option value="">${Dom.esc(T("Rổ khác…"))}</option>${Board.MORE.map(k => `<option>${k}</option>`).join("")}</select>`
      + `<select id="sectorTabs" title="${Dom.esc(T("Bảng giá theo ngành ICB"))}"><option value="">${Dom.esc(T("Ngành…"))}</option>${sectorOptions()}</select>`;
    tabChanged(Board.state().tab);
  }
  function tabChanged(tab) {
    $("tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    const more = $("moreTabs");
    more.value = Board.MORE.includes(tab) ? tab : "";
    more.classList.toggle("on", !!more.value);
    const sec = $("sectorTabs");
    sec.value = tab.startsWith("icb:") ? tab : "";
    sec.classList.toggle("on", !!sec.value);
    $("boardTitle").textContent = tabLabel(tab);
  }
  const count = (n, total) => { $("count").textContent = n === total ? T("{n} mã", { n }) : T("{n} / {total} mã", { n, total }); };

  const optEls = () => [...document.querySelectorAll("[data-opt]")];
  const readOpts = () => Object.fromEntries(optEls().map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]));
  // Values from share links / storage are untrusted: known controls only, booleans for checkboxes, existing <option>s.
  function writeOpts(o = {}) {
    for (const el of optEls()) {
      if (!Object.hasOwn(o, el.id)) continue;
      const v = o[el.id];
      if (el.type === "checkbox") el.checked = v === true;
      else if (typeof v === "string" && [...el.options].some(x => x.value === v)) el.value = v;
    }
    return readOpts();
  }

  function addFromBox() {
    const r = WatchParse.parse($("q").value);
    Board.setBad(r.bad);
    if (!r.symbols.length) { say(r.bad.length ? "warn" : "muted", "Gõ mã chứng khoán, cách nhau bằng dấu phẩy hoặc khoảng trắng (vd: VNM, FPT)."); return; }
    const fresh = Watch.add(r.symbols);
    $("q").value = ""; Board.setFilter("");
    if (fresh.length) say("good", "✔ Đã thêm {n} mã vào danh mục.", { n: fresh.length });
    else say("muted", "Các mã này đã có trong danh mục.");
  }

  function exportCsv() {
    const S = Board.state(), o = Board.getOpts(), cols = BoardCols.visible(o);
    const cell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const head = cols.map(c => (c.g ? T(c.g) + " " : "") + T(c.h, { n: c.n }));
    const lines = BoardView.order().map(s => S.quotes.get(s)).filter(Boolean).map(q => BoardCols.rowCells(q, o).map(c => cell(c.t)).join(","));
    if (!lines.length) { say("warn", "Bảng đang trống."); return; }
    Dom.download(String.fromCharCode(0xfeff) + [head.map(cell).join(","), ...lines].join("\r\n"), `${T("bang-gia")}-${S.tab}-${QuoteModel.vnDate()}.csv`, "text/csv;charset=utf-8");
  }

  function moveSelection(step) {
    const order = BoardView.order(), i = order.indexOf(Board.state().sel);
    const next = order[Math.max(0, Math.min(order.length - 1, i + step))];
    if (next) Board.select(next, false);
  }

  function wire() {
    $("tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) { Board.setBad([]); Board.setTab(b.dataset.tab); } });
    $("tabs").addEventListener("change", e => { if ((e.target.id === "moreTabs" || e.target.id === "sectorTabs") && e.target.value) { Board.setBad([]); Board.setTab(e.target.value); } });
    $("q").oninput = e => Board.setFilter(e.target.value);
    $("q").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addFromBox(); } };
    $("add").onclick = addFromBox;
    $("share").onclick = () => ShareDemo.copyLink(Board.payload(), say);
    $("undo").onclick = () => { Watch.undo(); Board.setBad([]); Board.setTab("watch"); };
    $("csv").onclick = exportCsv;
    document.addEventListener("change", e => { if (e.target.matches("[data-opt]")) Board.setOpts(readOpts()); });
    $("board").addEventListener("dblclick", e => { const tr = e.target.closest("tr[data-sym]"); if (tr && !e.target.closest("button")) { Board.select(tr.dataset.sym, false); ChartCtl.openDialog(); } });
    $("status").addEventListener("click", e => { if (e.target.id === "dropMissing") Watch.remove(Board.state().missing); });
    $("detail").addEventListener("click", e => {
      const S = Board.state();
      if (e.target.id === "dStar" && S.sel) Watch.toggle(S.sel);
      if (e.target.id === "dReload" && S.sel) Board.loadTrades(S.sel);
      if (e.target.id === "dChart") ChartCtl.openDialog();
      if (e.target.id === "dAlert" && S.sel) PersonalUI.openAlerts(S.sel);
    });
    document.addEventListener("keydown", e => {
      if (e.target.closest("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); moveSelection(e.key === "ArrowDown" ? 1 : -1); }
    });
    addEventListener("hashchange", async () => { if (location.hash) Board.applyIncoming(await ShareDemo.readIncoming(Board.TAB_IDS)); });
    I18n.onChange(() => { buildTabs(); IndexStrip.render(); Board.draw(true); status(); });
  }

  async function start() {
    I18n.init();
    // Price boards are read on dark backgrounds → dark unless the viewer already picked a theme.
    ThemePicker.bind($("theme"), { get: (k, d) => Prefs.get(k, k === "theme" ? "dark" : d), set: Prefs.set });
    BoardView.init($("board"), { name: s => Universe.name(s, I18n.lang), onSelect: Board.select, onStar: s => Watch.toggle(s), onSort: () => Board.draw(true) });
    IndexStrip.init($("indices"));
    DetailView.init($("dHead"), $("dOverview"), $("dBottom"));
    ChartCtl.init();
    DetailTabs.init();
    Board.setOpts(writeOpts(Prefs.get("opts", {})), false);
    const savedTab = Prefs.get("tab", "watch");
    Board.state().tab = typeof savedTab === "string" && Board.validTab(savedTab) ? savedTab : "watch";
    buildTabs();
    wire();
    MarketTabs.init();
    PersonalUI.init();
    CorrelationUI.init();
    WatchIO.init();
    Market.sectorsLoad().then(buildTabs, e => console.warn("start - load ICB sectors fail", e));
    Universe.load().then(() => Board.draw(true), e => console.warn("start - load symbol directory fail", e));
    const incoming = await ShareDemo.readIncoming(Board.TAB_IDS);
    if (!Board.applyIncoming(incoming)) Board.setTab(Board.state().tab);
  }

  return { start, say, status, tabChanged, count, writeOpts, phaseLabel: () => T(PHASE[QuoteModel.phase()]) };
})();
