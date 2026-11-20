// Export the active tab: download (own extension or .txt, in the tab's encoding + EOL), print (code in light colours, or the Markdown / table / diagram preview) and Copy as HTML with the editor colours.
const ExportActions = (() => {
  const active = () => Views.activeDoc() || (StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"), null);
  // Download / copy on a preview tab act on the tab it previews.
  const sourceOf = d => { const r = Docs.root(d); return PreviewPane.isPreview(r) ? Docs.get(r.link.src) || r : r; };

  async function download(txt) {
    const d = active();
    if (!d) return;
    const doc = sourceOf(d);
    if (doc.hex || doc.big) { StatusBar.msg(T("Tab hex / file lớn chỉ để xem — tải sẽ ra file hỏng, dùng file gốc trên đĩa."), "warn"); return; }
    if (doc.stale) await FileOpen.reload(doc, true);
    if (doc.stale) { StatusBar.msg(T("“{name}” chưa đọc lại được từ đĩa — cấp quyền rồi tải lại.", { name: doc.name }), "warn"); return; }
    let data;
    try { data = LocalFs.encode(MixedEol.textOf(doc), MixedEol.optsOf(doc)); }
    catch (e) { StatusBar.msg(e.message, "bad", e.line ? () => Views.revealLine(doc, e.line) : null); return; }
    const own = Actions.suggestName(doc), name = txt ? own.replace(/(.)\.[\w-]+$/, "$1") + ".txt" : own;
    Dom.download(data, name, "application/octet-stream");
    StatusBar.msg(T("✔ Đã tải xuống “{name}”.", { name }), "good");
  }

  // Highlight ranges of [from, to) from the syntax tree (≤ 1 s to finish parsing; past 2 MB the text stays plain).
  function ranges(state, from, to, dark) {
    if (to - from > 2e6) return [];
    const L = CM.language, H = CM.lezerHighlight, style = dark ? CM.oneDark.oneDarkHighlightStyle : L.defaultHighlightStyle;
    const tree = L.ensureSyntaxTree(state, to, 1000) || L.syntaxTree(state), css = style.specs.map(HtmlExport.specCss);
    const hl = H.tagHighlighter(style.specs.map((s, i) => ({ tag: s.tag, class: "s" + i })));
    const out = [];
    H.highlightTree(tree, hl, (f, t, cls) => out.push({ from: f - from, to: t - from, style: cls.split(" ").map(c => css[c.slice(1)]).filter(Boolean).join(";") }), from, to);
    return out;
  }

  // Rich clipboard (text/html + text/plain); without ClipboardItem the copy event carries both.
  // → "" when copied, else why not (ClipboardItem refused, then the copy event fallback also failed).
  async function copyRich(html, text) {
    let why = "";
    if (navigator.clipboard?.write && window.ClipboardItem && window.isSecureContext) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
        return "";
      } catch (e) { why = e.name + ": " + e.message; }
    }
    let ok = false;
    const onCopy = e => { e.clipboardData.setData("text/html", html); e.clipboardData.setData("text/plain", text); e.preventDefault(); ok = true; };
    document.addEventListener("copy", onCopy, { once: true });
    try { document.execCommand("copy"); } catch (e) { why ||= e.message; } finally { document.removeEventListener("copy", onCopy); }
    return ok ? "" : why || T("trình duyệt chặn clipboard");
  }

  async function copyHtml() {
    const d = active();
    if (!d) return;
    try {
      const v = Views.activeView(), pv = PreviewPane.isPreview(d), state = pv ? Docs.ensureState(sourceOf(d)) : v.state, sel = state.selection.main;
      const [from, to] = pv || sel.empty ? [0, state.doc.length] : [sel.from, sel.to], cs = getComputedStyle(v.dom), text = state.sliceDoc(from, to);
      const why = await copyRich(HtmlExport.build(text, ranges(state, from, to, CmSetup.isDark()), { fg: cs.color, bg: cs.backgroundColor }), text);
      const what = from === 0 && to === state.doc.length ? T("cả tab") : T("vùng chọn");
      StatusBar.msg(why ? T("Không chép được: {msg}", { msg: why }) : T("✔ Đã chép {what} dạng HTML có màu — dán vào Word, Outlook, OneNote…", { what }), why ? "bad" : "good");
    } catch (e) { StatusBar.msg(T("Không chép được: {msg}", { msg: e.message }), "bad"); }
  }

  // #printOut is the only thing print CSS shows: the tab name, then the preview or the whole text (CodeMirror only renders the visible lines).
  // A failure prints its reason instead of a blank page (print CSS hides everything else).
  function preparePrint() {
    const d = Views.activeDoc(), box = $("printOut"), title = document.createElement("h1");
    try {
      if (!d) throw new Error(T("Chưa có tab nào đang mở."));
      title.textContent = d.name;
      let body = PreviewPane.isPreview(d) ? PreviewPane.printable(d) : null;
      if (!body) {
        const state = PreviewPane.isPreview(d) ? Docs.ensureState(sourceOf(d)) : Views.activeView().state, text = state.doc.toString();
        body = document.createElement("div");
        body.innerHTML = HtmlExport.build(text, ranges(state, 0, text.length, false), { fg: "#000", bg: "#fff" });
      }
      box.replaceChildren(title, body);
      return true;
    } catch (e) {
      title.textContent = T("Không in được: {msg}", { msg: e.message });
      box.replaceChildren(title);
      StatusBar.msg(title.textContent, "bad");
      return false;
    }
  }

  function print() { if (active() && preparePrint()) window.print(); }

  function init() {
    addEventListener("beforeprint", () => { if (!$("printOut").childElementCount) preparePrint(); });
    addEventListener("afterprint", () => $("printOut").replaceChildren());
  }

  return { init, download, copyHtml, print, preparePrint, ranges };
})();
