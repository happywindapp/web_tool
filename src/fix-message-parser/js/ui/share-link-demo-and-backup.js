// Share links (#pako: / ?data=), ?demo= and the sample picker; whatever replaces the input keeps the previous work for ↶ restore.
const LinkIO = (() => {
  let app, backup = null;

  const note = (msg, cls = "muted") => { const el = $("note"); el.textContent = msg; el.className = cls; };
  const syncUndo = () => { $("undo").hidden = !backup; };

  // Loaded links/demos must not survive F5 (it would overwrite edits).
  function cleanUrl() {
    try {
      const u = new URL(location.href);
      u.searchParams.delete("demo"); u.searchParams.delete("data"); u.hash = "";
      history.replaceState(null, "", u);
    } catch { /* some browsers refuse replaceState on file:// */ }
  }

  function keep() {
    const s = app.snapshot();
    if (s.text.trim() && !DEMOS.isSample(s.text)) { backup = s; syncUndo(); }
  }

  function restore() {
    if (!backup) return;
    const b = backup;
    backup = null;
    app.open(b);
    syncUndo();
    note(T("Đã khôi phục bản trước."));
  }

  function demo(key) {
    const text = DEMOS.text(key);
    if (text === null) return note(T("✖ Không có mẫu “{key}”.", { key }), "bad");
    keep();
    app.open({ text, opts: { q: "", type: "", onlyBad: false }, chain: null });
    note(T("Đã nạp mẫu: {name}", { name: T(DEMOS.name(key)) }));
  }

  // Payload is untrusted: text must be a string; options go through Dom.writeOpts (known controls only).
  async function openLink(raw) {
    let p;
    try { p = await ShareCodec.decode(raw); }
    catch (e) { return note(T("✖ Link chia sẻ bị hỏng hoặc không đúng định dạng: {msg}", { msg: e.message }), "bad"); }
    if (p === null) p = { text: raw };
    if (!p || typeof p.text !== "string" || (p.opts != null && typeof p.opts !== "object"))
      return note(T("✖ Link không chứa dữ liệu của FIX Parser."), "bad");
    keep();
    app.open({ text: p.text, opts: p.opts || {}, sel: Number.isInteger(p.sel) ? p.sel : 0, chain: Number.isInteger(p.chain) ? p.chain : null, notes: p.notes, filters: p.filters, layout: p.layout });
    note(backup ? T("Đã nạp dữ liệu từ link — bấm “↶ Khôi phục bản trước” để lấy lại bài đang soạn.") : T("Đã nạp dữ liệu từ link."));
  }

  async function share() {
    const s = app.snapshot();
    if (!s.text.trim()) return note(T("Chưa có dữ liệu để chia sẻ."), "bad");
    let link;
    try {
      const u = new URL(location.href);
      u.search = ""; u.hash = await ShareCodec.encode(s);
      link = u.href;
    } catch (e) { return note(T("✖ Không tạo được link: {msg}", { msg: e.message }), "bad"); }
    const local = location.protocol === "file:" ? " " + T("Đang mở bằng file:// nên link chỉ dùng được trên máy này.") : "";
    if (await Dom.copy(link)) note(T("✔ Đã chép link chia sẻ ({n} ký tự).", { n: I18n.num(link.length) }) + local, "good");
    else prompt(T("Trình duyệt chặn sao chép — hãy tự chép link này:"), link);
  }

  function fillDemos() {
    $("demo").innerHTML = `<option value="">${Dom.esc(T("Thử mẫu…"))}</option>` + DEMOS.keys.map(k => `<option value="${k}">${Dom.esc(T(DEMOS.name(k)))}</option>`).join("");
  }

  // deps: { snapshot() → {text, opts, sel, chain}, open(payload) }
  function init(deps) {
    app = deps;
    fillDemos();
    $("demo").onchange = e => { const k = e.target.value; e.target.value = ""; if (k) demo(k); };
    $("share").onclick = share;
    $("undo").onclick = restore;
    const fromHash = () => { const h = location.hash.slice(1); try { return decodeURIComponent(h); } catch { return h; } };
    window.addEventListener("hashchange", () => { if (location.hash.length > 1) { const h = fromHash(); cleanUrl(); openLink(h); } });
    const q = new URLSearchParams(location.search), name = q.get("demo");
    const raw = location.hash.length > 1 ? fromHash() : q.get("data");
    if (raw) openLink(raw);
    else if (name) demo(name);
    else app.open({ text: DEMOS.text("bcgd"), opts: {}, chain: null, quiet: true });
    if (raw || name) cleanUrl();
  }

  return { init, keep, note, fillDemos };
})();
