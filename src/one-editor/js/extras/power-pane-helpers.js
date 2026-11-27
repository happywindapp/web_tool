// Small DOM + editor helpers shared by the phase 9 panes and dialogs: element builder, jump / select in the source tab, edit the source in one undo step.
const PowerUi = (() => {
  function mk(tag, cls, text, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (k in e && k !== "list") e[k] = v; else e.setAttribute(k, v);
    return e;
  }
  const button = (text, onclick, title = "") => Object.assign(mk("button", "", text, { type: "button" }), { onclick, title });

  // The source tab shown in its view (or the focused one) → its EditorView.
  function viewOf(src) {
    if (!src || !Docs.get(src.id)) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return null; }
    const at = Views.where(src.id);
    Views.open(src, at >= 0 ? at : Views.focused, true);
    return Views.groups[Views.where(src.id)].view;
  }

  function select(src, from, to = from) {
    const v = viewOf(src);
    if (!v) return;
    const max = v.state.doc.length;
    v.dispatch({ selection: { anchor: Math.min(from, max), head: Math.min(to, max) }, effects: CM.view.EditorView.scrollIntoView(Math.min(from, max), { y: "center" }) });
    v.focus();
    PhoneLayout.show(Views.where(src.id) + 1);
  }

  // edits: [{ from, to, insert }] on the current text → one transaction (Ctrl+Z); false when the tab is read-only.
  function edit(src, edits, what) {
    const v = viewOf(src);
    if (!v) return false;
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return false; }
    if (!edits.length) { StatusBar.msg(T("Không có gì để đổi."), "warn"); return false; }
    v.dispatch({ changes: edits, userEvent: "input.transform" });
    StatusBar.msg(T("✔ {what}: {n} chỗ — Ctrl+Z để hoàn tác.", { what, n: I18n.num(edits.length) }), "good");
    return true;
  }

  // Op settings per source tab: preset by a link / demo (state.link), else kept on the result tab (link.opts, survives F5), else the default.
  const outOf = (srcId, op) => Docs.list().find(d => d.kind === "output" && d.link?.src === srcId && d.link.op === op);
  function opts(srcId, op, clean, def) {
    const s = PowerTools.state(srcId, op);
    if (s.link) { s.v = clean(s.link); delete s.link; }
    if (s.v === undefined) { const o = outOf(srcId, op)?.link?.opts; s.v = o ? clean(o) : def(); }
    return s.v;
  }
  function saveOpts(srcId, op, v, persist = v) {
    PowerTools.state(srcId, op).v = v;
    const out = outOf(srcId, op);
    // A stripped copy (persist ≠ v) is new on every call: compare by content so a live re-run does not re-save.
    if (out && out.link.opts !== persist && (persist === v || JSON.stringify(out.link.opts) !== JSON.stringify(persist))) { out.link.opts = persist; out.pending = true; HotExit.schedule(); }
  }

  // #pako: link of an op payload ({ v, views, run, opts }); done(n chars) → the status message.
  async function shareLink(payload, done) {
    const url = location.href.split(/[?#]/)[0] + "#" + await ShareCodec.encode(payload), ok = await Dom.copy(url);
    if (!ok) prompt(T("Chép link này:"), url);
    StatusBar.msg(done(I18n.num(url.length)) + (url.length > 60000 ? " " + T("Link dài — vài ứng dụng chat có thể cắt mất.") : ""), ok ? "good" : "warn");
  }

  // Big grids: the first slice now, the rest in later tasks (no long task); a new render with the same key cancels the old one.
  const slicing = new WeakMap();
  function appendSliced(parent, items, make, key = parent, size = 200) {
    clearTimeout(slicing.get(key));
    let i = 0;
    const step = () => { const end = Math.min(items.length, i + size); for (; i < end; i++) parent.append(make(items[i], i)); if (i < items.length) slicing.set(key, setTimeout(step, 0)); };
    step();
  }

  return { mk, button, viewOf, select, edit, opts, saveOpts, shareLink, appendSliced };
})();
