// DOM wiring: tabs, toolbar options, add / filter box, share / undo, CSV, keyboard, status footer, language switch, start-up.
const Controls = (() => {
  let msg = null, msgTimer = 0;
  const MODE = { ws: "● Realtime", connecting: "Đang kết nối…", poll: "Lấy định kỳ", off: "Tạm dừng" };
  const tabLabel = id => { const t = Board.TABS.find(x => x.id === id); return t ? T(t.label) : id; };

  function say(cls, key, params) {
    msg = { cls, key, params };
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msg = null; status(); }, 8000);
    status();
  }

  function status() {
    const S = Board.state(), st = Live.status(), out = [];
    $("liveBadge").textContent = T(MODE[st.mode] || st.mode);
    $("liveBadge").className = "badge " + (st.mode === "ws" ? "live" : st.mode === "poll" ? "poll" : "");
    if (st.at) out.push(`<span>${Dom.esc(T("Giá Binance lúc {t}", { t: new Date(st.at).toLocaleTimeString(I18n.lang, { hour12: false }) }))}</span>`);
    if (st.mode === "poll" && Board.getOpts().rate === "live") out.push(`<span class="warn">${Dom.esc(T("WebSocket Binance không kết nối được — đang lấy giá định kỳ 5s."))}</span>`);
    if (S.geckoErr) out.push(`<span class="warn">${Dom.esc(S.geckoErr.rateLimited ? T("CoinGecko giới hạn tần suất — vốn hoá / % 7 ngày sẽ cập nhật lại sau ~{n}s.", { n: S.geckoErr.retryIn || 60 }) : T("Không tải được dữ liệu CoinGecko — đang thử lại."))}</span>`);
    else if (Coins.geckoAt()) out.push(`<span class="muted">${Dom.esc(T("Vốn hoá CoinGecko lúc {t}", { t: new Date(Coins.geckoAt()).toLocaleTimeString(I18n.lang, { hour12: false }) }))}</span>`);
    if (S.bad.length) out.push(`<span class="warn">${Dom.esc(T("Bỏ qua (không phải mã coin): {list}", { list: S.bad.join(", ") }))}</span>`);
    if (S.missing.length) out.push(`<span class="warn">${Dom.esc(T("Không tìm thấy {n} mã: {list}", { n: S.missing.length, list: S.missing.join(", ") }))}</span> <button id="dropMissing">${Dom.esc(T("Bỏ các mã này khỏi danh mục"))}</button>`);
    if (msg) out.push(`<span class="${msg.cls}">${Dom.esc(T(msg.key, msg.params))}</span>`);
    $("status").innerHTML = out.join(" · ");
    $("undo").hidden = !Watch.hasBackup();
  }

  function buildTabs() {
    $("tabs").innerHTML = Board.TABS.map(t => `<button data-tab="${t.id}">${Dom.esc(T(t.label))}</button>`).join("");
    tabChanged(Board.state().tab);
  }
  function tabChanged(tab) {
    $("tabs").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.tab === tab));
    $("boardTitle").textContent = tabLabel(tab);
  }
  const count = (n, total) => { $("count").textContent = n == null ? "" : n === total ? T("{n} coin", { n }) : T("{n} / {total} coin", { n, total }); };

  const optEls = () => [...document.querySelectorAll("[data-opt]")];
  const readOpts = () => Object.fromEntries(optEls().map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]));
  // Values from share links / storage are untrusted: known controls only, booleans for checkboxes, existing <option>s.
  function writeOpts(o = {}) {
    for (const el of optEls()) {
      if (!o || !Object.hasOwn(o, el.id)) continue;
      const v = o[el.id];
      if (el.type === "checkbox") el.checked = v === true;
      else if (typeof v === "string" && [...el.options].some(x => x.value === v)) el.value = v;
    }
    return readOpts();
  }

  function addFromBox() {
    const r = CoinParse.parse($("q").value);
    Board.setBad(r.bad);
    if (!r.symbols.length) { say(r.bad.length ? "warn" : "muted", "Gõ mã coin, cách nhau bằng dấu phẩy hoặc khoảng trắng (vd: BTC, ETH)."); return; }
    const fresh = Watch.add(r.symbols);
    $("q").value = ""; Board.setFilter("");
    r.symbols.filter(s => !Coins.known(s)).forEach(s => Coins.resolve(s).then(() => Board.draw()));
    say(fresh.length ? "good" : "muted", fresh.length ? "✔ Đã thêm {n} coin vào danh mục." : "Các coin này đã có trong danh mục.", { n: fresh.length });
  }

  function exportCsv() {
    const S = Board.state(), cols = BoardView.cols().filter(c => c.k !== "spark");
    const cell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const byS = new Map(Board.rows().map(r => [r.sym, r]));
    const lines = BoardView.order().map(s => byS.get(s)).filter(Boolean).map(r => BoardCols.rowCells(r, cols).map(c => cell(c.t)).join(","));
    if (S.view || !lines.length) { say("warn", "Bảng đang trống."); return; }
    Dom.download(String.fromCharCode(0xfeff) + [cols.map(c => cell(T(c.h))).join(","), ...lines].join("\r\n"), `${T("bang-gia-crypto")}-${S.tab}-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
  }

  function moveSelection(step) {
    const order = BoardView.order(), i = order.indexOf(Board.state().sel), next = order[Math.max(0, Math.min(order.length - 1, i + step))];
    if (next && !Board.state().view) Board.select(next, false);
  }

  function wire() {
    $("tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) { Board.setBad([]); Board.setTab(b.dataset.tab); } });
    $("q").oninput = e => Board.setFilter(e.target.value);
    $("q").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addFromBox(); } };
    $("add").onclick = addFromBox;
    $("share").onclick = () => ShareDemo.copyLink(Board.payload(), say);
    $("undo").onclick = () => { Watch.undo(); Board.setBad([]); Board.setTab("watch"); };
    $("csv").onclick = exportCsv;
    document.addEventListener("change", e => { if (e.target.matches("[data-opt]")) Board.setOpts(readOpts()); });
    document.addEventListener("click", e => {
      const c = e.target.closest("[data-coin]");
      if (c && !e.target.closest("a, input, select") && CoinParse.isSymbol(c.dataset.coin)) Board.select(c.dataset.coin, true);
    });
    $("status").addEventListener("click", e => { if (e.target.id === "dropMissing") Watch.remove(Board.state().missing); });
    $("board").addEventListener("dblclick", e => { const tr = e.target.closest("tr[data-sym]"); if (tr && !e.target.closest("button")) { Board.select(tr.dataset.sym, false); CoinChart.openDialog(); } });
    document.addEventListener("keydown", e => {
      if (e.target.closest("input, select, textarea, dialog") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); moveSelection(e.key === "ArrowDown" ? 1 : -1); }
    });
    addEventListener("hashchange", async () => { if (location.hash) Board.applyIncoming(await ShareDemo.readIncoming()); });
    I18n.onChange(() => { buildTabs(); Strip.render(); Board.draw(true); Board.relabelView(); DetailTabs.relabel(); status(); });
  }

  async function start() {
    I18n.init();
    ThemePicker.bind($("theme"), { get: (k, d) => Prefs.get(k, k === "theme" ? "dark" : d), set: Prefs.set });
    TechChart.setPriceFormat(Fmt.price);
    BoardView.init($("board"), { onSelect: Board.select, onStar: s => Watch.toggle(s), onSort: () => Board.draw(true) });
    Strip.init($("strip"));
    DetailView.init();
    CoinChart.init();
    IndGuide.init();
    DetailTabs.init();
    PersonalUI.init();
    CalcUI.init();
    WatchIO.init();
    Board.setOpts(writeOpts(Prefs.get("opts", {})), false);
    const tab = Prefs.get("tab", "watch"), sel = Prefs.get("sel", "BTC");
    Board.state().tab = Board.TAB_IDS.has(tab) ? tab : "watch";
    if (CoinParse.isSymbol(sel)) Board.state().sel = sel;
    buildTabs();
    wire();
    const incoming = await ShareDemo.readIncoming();
    if (!Board.applyIncoming(incoming)) Board.setTab(Board.state().tab);
    Board.boot();
  }

  return { start, say, status, tabChanged, count, writeOpts };
})();
