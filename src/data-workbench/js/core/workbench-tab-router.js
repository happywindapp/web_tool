// Tab registry: lazy init, ?tab= deep link, Ctrl+Enter → primary, file drop, relang(), share links (#pako: / ?data=) with ↶ restore of replaced work.
const Workbench = (() => {
  const tabs = {}, sendSelects = [], backups = {};
  let active = "";

  // def: { label, init(), primary?(), receive?(text, meta), onFile?(file), demo?(name), relang?(), snapshot() → {text, text2?}, open({text, text2?}) }
  const register = (id, def) => { tabs[id] = { ...def, ready: false }; };

  const note = (msg, cls = "muted") => { const el = $("wb-note"); el.textContent = msg; el.className = cls; };
  const syncUndo = () => { $("wb-undo").hidden = !backups[active]; };

  // The share/backup payload must not depend on URL state, and loaded links must not survive F5 (it would overwrite edits).
  function cleanUrl() {
    try {
      const u = new URL(location.href);
      u.searchParams.set("tab", active); u.searchParams.delete("demo"); u.searchParams.delete("data"); u.hash = "";
      history.replaceState(null, "", u);
    } catch { /* some browsers refuse replaceState on file:// */ }
  }

  function show(id) {
    if (!Object.hasOwn(tabs, id)) id = "format";
    active = id;
    document.querySelectorAll("[data-wb-tab]").forEach(b => b.classList.toggle("on", b.dataset.wbTab === id));
    document.querySelectorAll("[data-wb-panel]").forEach(p => { p.hidden = p.dataset.wbPanel !== id; });
    const t = tabs[id];
    if (!t.ready) { t.ready = true; t.init(); }
    Store.set("tab", id);
    syncUndo();
    cleanUrl();
  }

  const fields = id => [...document.querySelectorAll(`[data-wb-panel="${id}"] .toolbar :is(select, input)[id]`)]
    .filter(el => el.type !== "file" && !/-(demo|send)$/.test(el.id));
  const readOpts = id => Object.fromEntries(fields(id).map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]));
  function writeOpts(id, opts = {}) {
    for (const el of fields(id)) {
      if (!Object.hasOwn(opts, el.id)) continue;
      const v = opts[el.id];
      if (el.type === "checkbox") el.checked = v === true;
      else if (el.tagName !== "SELECT" || [...el.options].some(o => o.value === v)) el.value = String(v);
    }
  }
  const snapshot = id => ({ tab: id, ...tabs[id].snapshot(), opts: readOpts(id) });
  const isEmpty = s => !`${s.text || ""}${s.text2 || ""}`.trim();
  const isSample = (id, s) => Object.values(DEMOS[id] || {}).some(d => d.text === s.text || (d.left === s.text && d.right === s.text2));

  // Called right before a link / sample replaces the tab content.
  function keep(id) {
    const s = snapshot(id);
    if (!isEmpty(s) && !isSample(id, s)) backups[id] = s;
    syncUndo();
  }

  function apply(p) {
    show(p.tab);
    keep(p.tab);
    writeOpts(p.tab, p.opts);
    tabs[p.tab].open(p);
  }

  function demo(id, name) {
    keep(id);
    tabs[id].demo(name);
  }

  function restore() {
    const b = backups[active];
    if (!b) return;
    delete backups[active];
    writeOpts(active, b.opts);
    tabs[active].open(b);
    syncUndo();
    note(T("Đã khôi phục bản trước."));
  }

  async function openLink(raw, tab) {
    let p;
    try { p = await ShareCodec.decode(raw); }
    catch (e) { return note(T("✖ Link chia sẻ bị hỏng hoặc không đúng định dạng: {msg}", { msg: e.message }), "bad"); }
    if (p === null) p = { tab, text: raw };
    if (!p || !Object.hasOwn(tabs, p.tab) || !tabs[p.tab].open || typeof p.text !== "string" || (p.text2 != null && typeof p.text2 !== "string"))
      return note(T("✖ Link không chứa dữ liệu của Data Workbench."), "bad");
    apply(p);
    note(backups[p.tab] ? T("Đã nạp dữ liệu từ link — bấm “↶ Khôi phục bản trước” để lấy lại bài đang soạn.") : T("Đã nạp dữ liệu từ link."));
  }

  async function share() {
    const s = snapshot(active);
    if (isEmpty(s)) return note(T("Chưa có dữ liệu để chia sẻ."), "bad");
    let link;
    try {
      const u = new URL(location.href);
      u.search = "?tab=" + active; u.hash = await ShareCodec.encode(s);
      link = u.href;
    } catch (e) { return note(T("✖ Không tạo được link: {msg}", { msg: e.message }), "bad"); }
    const local = location.protocol === "file:" ? " " + T("Đang mở bằng file:// nên link chỉ dùng được trên máy này.") : "";
    if (await Dom.copy(link)) note(T("✔ Đã chép link chia sẻ ({n} ký tự).", { n: I18n.num(link.length) }) + local, "good");
    else prompt(T("Trình duyệt chặn sao chép — hãy tự chép link này:"), link);
  }

  function send(id, text, meta = {}) {
    show(id);
    if (tabs[id].receive) tabs[id].receive(text, meta);
  }

  // Fills a <select> with every other tab that can receive data; getPayload() → { text, kind } | null.
  const fillSendTo = (select, from) => {
    select.innerHTML = `<option value="">${T("Gửi kết quả sang…")}</option>` + Object.entries(tabs)
      .filter(([id, t]) => id !== from && t.receive).map(([id, t]) => `<option value="${id}">${T(t.label)}</option>`).join("");
  };
  function bindSendTo(select, from, getPayload) {
    sendSelects.push([select, from]);
    fillSendTo(select, from);
    select.onchange = () => {
      const id = select.value;
      select.value = "";
      const p = id && getPayload();
      if (p && p.text) send(id, p.text, p);
    };
  }

  function start() {
    I18n.init();
    I18n.onChange(() => {
      note("");
      sendSelects.forEach(([select, from]) => fillSendTo(select, from));
      Object.values(tabs).forEach(t => { if (t.ready && t.relang) t.relang(); });
    });
    document.querySelectorAll("[data-wb-tab]").forEach(b => { b.onclick = () => show(b.dataset.wbTab); });
    $("wb-share").onclick = share;
    $("wb-undo").onclick = restore;
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && tabs[active].primary) { e.preventDefault(); tabs[active].primary(); }
    });
    const body = document.body;
    body.addEventListener("dragover", e => { e.preventDefault(); body.classList.add("drop"); });
    body.addEventListener("dragleave", e => { if (!e.relatedTarget) body.classList.remove("drop"); });
    body.addEventListener("drop", e => {
      e.preventDefault(); body.classList.remove("drop");
      const f = e.dataTransfer.files[0];
      if (f && tabs[active].onFile) tabs[active].onFile(f);
    });
    const fromHash = () => { const h = location.hash.slice(1); try { return decodeURIComponent(h); } catch { return h; } };
    window.addEventListener("hashchange", () => { if (location.hash.length > 1) { const h = fromHash(); cleanUrl(); openLink(h, active); } });
    const q = new URLSearchParams(location.search), name = q.get("demo");
    const raw = location.hash.length > 1 ? fromHash() : q.get("data"), tab = q.get("tab") || (name || raw ? "format" : Store.get("tab", "format"));
    show(tab);
    if (raw) openLink(raw, tab);
    else if (name && tabs[active].demo) demo(active, name);
  }

  return { register, show, send, bindSendTo, demo, start };
})();
