// Wiring: input → extract → analyse (dialect) → chains → timeline + detail; notes, column filters/layout, saved analyses, dialogs, exports, VI/EN relang.
const FixApp = (() => {
  const KEEP = ["dialect", "tz", "cols", "hideAdmin", "hideBc", "order", "hideHdr"];
  // Exchange → firm messages carry the venue in 49; firm → exchange order/quote messages carry it in 56.
  const FROM_VENUE = new Set(["8", "9", "h", "f", "j", "AI"]), TO_VENUE = new Set(["D", "F", "G", "s", "t", "u", "S", "Z", "AJ", "R"]);
  let saved = null;
  const S = { msgs: [], dict: null, dialect: "fix44", chain: null, vis: [], sel: -1, chainRoot: null, skipped: 0, us: "", venueId: "" };

  const opts = () => Dom.readOpts();
  const cols = () => opts().cols.split(/[\s,;]+/).filter(t => /^\d+$/.test(t)).slice(0, 8);
  const ctx = () => ({ dict: S.dict, tz: opts().tz, cols: cols(), layout: ColView.layout(), inbound: m => !!S.us && m.get("49") !== S.us });
  const isVenue = it => /(^|[^\d])(369|4488|6363|6464)=/.test(it.raw);
  const venueIdOf = msgs => (msgs.find(m => FROM_VENUE.has(m.type) && m.get("49")) || { get: () => "" }).get("49")
    || (msgs.find(m => TO_VENUE.has(m.type) && m.get("56")) || { get: () => "" }).get("56");
  const venueName = () => S.venueId || T("Server Sàn");
  const dictLabel = () => S.dialect === "venue" ? `${venueName()} FIX 4.4` : "FIX 4.4";

  // keepChain: only open() keeps the chain filter, and only if it still names a chain root after re-parsing.
  function parse(keepChain = false) {
    const text = $("src").value, ex = FixLog.extract(text), want = opts().dialect;
    S.dialect = want === "auto" ? (ex.items.some(isVenue) ? "venue" : "fix44") : want;
    S.dict = FixDict.get(S.dialect);
    S.msgs = ex.items.map(it => FixCheck.analyse(it, S.dict));
    S.skipped = ex.skipped;
    S.chain = FixChain.link(S.msgs, Settings.linkTags());
    const out = S.msgs.find(m => /\b(OUT|outgoing|sent)\b|->|>>/i.test(m.prefix));
    S.us = (out || S.msgs[0] || { get: () => "" }).get("49");
    S.venueId = venueIdOf(S.msgs);
    if (!keepChain || S.chain.root[S.chainRoot] !== S.chainRoot) S.chainRoot = null;
    fillTypes();
    fillChains();
    InputView.paint(S.msgs);
    refresh();
  }

  // Chains of 2+ messages, labelled by their first order id + symbol.
  function fillChains() {
    const seen = new Map();
    S.chain.root.forEach((r, i) => { if (!seen.has(r) && S.chain.size(r) > 1) seen.set(r, i); });
    const label = i => { const m = S.msgs[i]; return [m.get("11") || m.get("37") || m.get("117") || m.get("548"), m.get("55")].filter(Boolean).join(" · ") || FixDict.msgName(S.dict, m.type); };
    $("chains").innerHTML = `<option value="">${Dom.esc(T("⛓ Chuỗi lệnh ({n})", { n: seen.size }))}</option>` +
      [...seen].slice(0, 500).map(([r, i]) => `<option value="${r}">${Dom.esc(`${label(i)} — ${S.chain.size(r)} msg`)}</option>`).join("");
  }

  function fillTypes() {
    const el = $("type"), cur = el.value, counts = new Map();
    S.msgs.forEach(m => counts.set(m.type, (counts.get(m.type) || 0) + 1));
    el.innerHTML = `<option value="">${Dom.esc(T("Mọi loại message"))}</option>` + [...counts].map(([t, n]) =>
      `<option value="${Dom.esc(t)}">${Dom.esc(`${t} · ${FixDict.msgName(S.dict, t) || "?"} (${n})`)}</option>`).join("");
    el.value = counts.has(cur) ? cur : "";
  }

  function refresh() {
    const o = opts();
    FixKnow.setVenue(venueName());
    S.vis = Timeline.visible(S.msgs, { ...o, chainRoot: S.chainRoot }, S.chain, ctx());
    if (!S.vis.includes(S.sel)) S.sel = S.vis.length ? S.vis[0] : -1;
    Timeline.render($("grid"), S.msgs, S.vis, S.sel, ctx());
    $("count").textContent = T("{shown}/{total} message", { shown: I18n.num(S.vis.length), total: I18n.num(S.msgs.length) });
    const chip = $("chainChip");
    chip.hidden = S.chainRoot === null;
    if (S.chainRoot !== null) chip.innerHTML = `⛓ ${Dom.esc(T("Chuỗi lệnh: {n} message", { n: S.chain.size(S.chainRoot) }))}<button title="${Dom.esc(T("Bỏ lọc chuỗi"))}">✕</button>`;
    showDetail();
    status();
  }

  function showDetail() {
    const m = S.msgs[S.sel], o = opts();
    Detail.render($("detail"), m, { ...ctx(), index: S.sel, order: o.order, hideHdr: o.hideHdr, dictLabel: dictLabel(), note: Notes.get(S.sel), chainSize: m ? S.chain.size(S.chain.root[S.sel]) : 0 });
  }

  function status() {
    const n = lv => S.msgs.filter(m => m.level === lv).length;
    const delims = [...new Set(S.msgs.map(m => FixLog.label(m.delim) || "?"))].join(", ") || "—";
    $("inInfo").textContent = S.msgs.length ? T("{n} message", { n: I18n.num(S.msgs.length) }) : "";
    $("status").textContent = T("{n} message · lỗi: {e} · cảnh báo: {w} · từ điển {dict}{auto} · dấu phân cách {delims} · bỏ qua {s} dòng không phải FIX", {
      n: I18n.num(S.msgs.length), e: n("error"), w: n("warn"), dict: dictLabel(), auto: opts().dialect === "auto" ? " " + T("(tự nhận)") : "", delims, s: I18n.num(S.skipped) });
  }

  function select(i, scroll) {
    S.sel = i;
    document.querySelectorAll("#grid tr.sel").forEach(r => r.classList.remove("sel"));
    const row = document.querySelector(`#grid tr[data-i="${i}"]`);
    if (row) { row.classList.add("sel"); if (scroll) row.scrollIntoView({ block: "nearest" }); }
    showDetail();
  }

  const move = d => { const k = S.vis.indexOf(S.sel) + d; if (k >= 0 && k < S.vis.length) select(S.vis[k], true); };

  async function act(name) {
    const m = S.msgs[S.sel];
    if (!m) return;
    if (name === "chain") { S.chainRoot = S.chain.root[S.sel]; return refresh(); }
    const wire = fields => FixCodec.toWire(fields, name === "soh" ? FixCodec.SOH : "|");
    const text = name === "json" ? JSON.stringify(Detail.json(m, S.dict, opts().tz, Notes.get(S.sel)), null, 2) : name === "fix" ? wire(FixCodec.rebuild(m.fields.filter(f => f.tag !== null))) : wire(m.fields);
    LinkIO.note(await Dom.copy(text) ? T("✔ Đã chép.") : T("✖ Trình duyệt chặn sao chép."), "good");
  }

  // Payload for share links / saved analyses / ↶ restore; open() is its inverse.
  const snapshot = () => ({ text: $("src").value, opts: opts(), sel: S.sel, chain: S.chainRoot, notes: Notes.all(), ...ColView.get() });
  function open(p) {
    Dom.writeOpts(p.opts);
    Notes.load(p.notes);
    ColView.set(p);
    $("src").value = p.text;
    S.chainRoot = Number.isInteger(p.chain) ? p.chain : null;
    parse(true);
    if (Number.isInteger(p.sel) && S.vis.includes(p.sel)) select(p.sel, true);
  }

  function readFile(f) {
    const r = new FileReader();
    r.onload = () => { LinkIO.keep(); open({ text: String(r.result).replace(/^﻿/, ""), opts: {}, chain: null }); LinkIO.note(T("Đã mở {name}", { name: f.name })); };
    r.onerror = () => LinkIO.note(T("✖ Không đọc được file {name}", { name: f.name }), "bad");
    r.readAsText(f);
  }

  function bind() {
    $("src").addEventListener("input", Dom.debounce(() => parse(), 250));
    $("dialect").addEventListener("change", () => parse());
    for (const id of ["tz", "type", "hideAdmin", "hideBc", "onlyBad", "onlyNotes", "order", "hideHdr"]) $(id).addEventListener("change", refresh);
    for (const id of ["q", "cols"]) $(id).addEventListener("input", Dom.debounce(refresh, 200));
    document.addEventListener("change", e => { if (KEEP.includes(e.target.id)) Store.set("opts", Object.fromEntries(KEEP.map(k => [k, opts()[k]]))); });
    $("grid").addEventListener("click", e => { const tr = e.target.closest("tr[data-i]"); if (tr) select(+tr.dataset.i); });
    $("chainChip").addEventListener("click", e => { if (e.target.closest("button")) { S.chainRoot = null; refresh(); } });
    $("chains").onchange = e => { const r = e.target.value; e.target.value = ""; if (r !== "") { S.chainRoot = +r; refresh(); } };
    $("resetCols").onclick = () => ColView.resetLayout();
    $("detail").addEventListener("input", e => {
      if (!e.target.matches("textarea.anno") || S.sel < 0) return;
      Notes.set(S.sel, e.target.value);
      const td = document.querySelector(`#grid tr[data-i="${S.sel}"] td[data-col="n"]`);
      if (td) td.innerHTML = Timeline.numCell(S.sel);
    });
    TagInfo.bind($("detail"), tr => Detail.tip(tr));
    $("detail").addEventListener("click", e => {
      const b = e.target.closest("button[data-act]"), li = e.target.closest("li[data-tag]");
      if (b) act(b.dataset.act); else if (li) Detail.flash($("detail"), li.dataset.tag);
    });
    document.addEventListener("keydown", e => {
      const inGrid = e.target === document.body || e.target.closest("#gridBox, #detail");
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && (e.ctrlKey || inGrid)) { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
    });
    $("toggleIn").onclick = () => { const c = document.querySelector(".left").classList.toggle("collapsed"); $("toggleIn").textContent = c ? "▾" : "▴"; };
    $("file").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) readFile(f); };
    $("clear").onclick = () => { LinkIO.keep(); saved.forget(); open({ text: "", opts: { q: "" }, chain: null }); };
    $("csv").onclick = () => Dom.download(Timeline.csv(S.msgs, S.vis, ctx()), "fix-messages.csv", "text/csv;charset=utf-8");
    $("json").onclick = () => Dom.download(JSON.stringify(S.vis.map(i => Detail.json(S.msgs[i], S.dict, opts().tz, Notes.get(i))), null, 2), "fix-messages.json", "application/json");
    const body = document.body;
    body.addEventListener("dragover", e => { e.preventDefault(); body.classList.add("drop"); });
    body.addEventListener("dragleave", e => { if (!e.relatedTarget) body.classList.remove("drop"); });
    body.addEventListener("drop", e => { e.preventDefault(); body.classList.remove("drop"); const f = e.dataTransfer.files[0]; if (f) readFile(f); });
  }

  function mask(cats, extra) {
    const r = FixMask.apply($("src").value, FixLog.extract($("src").value).items, S.dialect, cats, extra);
    if (!r.count) return LinkIO.note(T("Không có giá trị nhạy cảm nào để che."));
    LinkIO.keep();
    open({ ...snapshot(), text: r.text });
    LinkIO.note(T("✔ Đã che {n} giá trị (tính lại 9/10 cho message hợp lệ).", { n: r.count }), "good");
  }

  const suggestName = () => { const m = S.msgs.find(x => x.get("55")) || S.msgs[0]; return [m && m.get("55"), m && (m.get("52") || "").slice(0, 8), dictLabel()].filter(Boolean).join(" · "); };

  function start() {
    I18n.init();
    Dom.writeOpts(Store.get("opts", {}));
    I18n.onChange(() => { LinkIO.note(""); LinkIO.fillDemos(); saved.fill(); fillTypes(); fillChains(); ColView.set(ColView.get()); refresh(); });
    ColView.init({ columns: () => Timeline.columns(ctx()), onChange: refresh, select: i => select(i), follow: () => act("chain"),
      chainable: () => S.sel >= 0 && S.chain.size(S.chain.root[S.sel]) > 1 });
    ColView.bindTable($("grid"));
    Settings.init({ mask, dictChanged: () => { if (S.chain) parse(true); } });
    InputView.init((mi, fi) => { const m = S.msgs[mi], f = m && m.fields[fi]; return f && f.tag !== null ? TagInfo.tooltip(S.dict, m, f, opts().tz) : ""; });
    saved = SavedSessions({ select: $("saved"), saveBtn: $("saveBtn"), delBtn: $("delSaved"), store: Store, key: "analyses",
      snapshot, open, suggestName, note: LinkIO.note, keep: LinkIO.keep });
    bind();
    LinkIO.init({ snapshot, open });
  }

  return { start };
})();
