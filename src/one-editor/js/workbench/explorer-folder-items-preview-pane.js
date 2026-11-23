// Folder tab preview pane like Windows Alt+P: the focused file read-only beside the list (below it when narrow) — code with highlighting, Markdown drawn, images, hex for binary files, facts for the rest. No tab is opened.
const FolderPreview = (() => {
  const TEXT_MAX = 1048576, HEAD = 262144, HEX = 4096, CLOUD_MAX = 2 * 1048576;
  const IMG = /\.(png|jpe?g|gif|webp|bmp|ico|avif|svg)$/i, PDF = /\.pdf$/i;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (cls, text, title, run) => { const b = el("button", cls, text); Object.assign(b, { type: "button", title, onclick: run }); return b; };
  const on = () => FolderView.preview() || FolderView.details(), panes = new Set();
  // The Columns view always has the pane: a selected file shows there, like Finder.
  const shown = t => on() || t.ui.root.dataset.view === "cols";
  // The details pane follows a folder size, a colour tag or the UI language changed later.
  function again() {
    if (!FolderView.details()) return;
    for (const t of panes) if (t.closed) panes.delete(t); else if (!t.ui.root.hidden && t.pv.key != null) show(t, true);
  }
  DirSize.onChange(again);
  Tags.onChange(again);
  I18n.onChange(again);

  // src: { cur() → { node, nodes }, open(node) }.
  function build(t, src) {
    const pane = el("aside", "fi-pv"), split = el("div", "fi-pvsplit"), b = btn("fi-nav", "◫", "", () => FolderView.togglePreview());
    t.pv = { el: pane, btn: b, src, key: null, gen: 0, url: null, view: null, md: true, timer: 0 };
    panes.add(t);
    const w = Prefs.get("fiPreviewW", 0.4);
    if (w >= 0.15 && w <= 0.75) t.ui.root.style.setProperty("--fi-pvw", w * 100 + "%");
    split.onpointerdown = e => {
      // Stacked (narrow tab): the pane height is fixed, the width ratio is not dragged.
      if (getComputedStyle(t.ui.body).gridTemplateRows.split(" ").length > 1) return;
      const box = t.ui.body.getBoundingClientRect();
      split.setPointerCapture(e.pointerId);
      let ratio = null;
      split.onpointermove = m => { ratio = Math.min(0.75, Math.max(0.15, (box.right - m.clientX) / box.width)); t.ui.root.style.setProperty("--fi-pvw", ratio * 100 + "%"); };
      split.onpointerup = () => { split.onpointermove = split.onpointerup = null; if (ratio != null) Prefs.set("fiPreviewW", +ratio.toFixed(3)); };
    };
    return { button: b, parts: [split, pane] };
  }

  function reset(t) {
    clearTimeout(t.pv.timer);
    t.pv.gen++;
    t.pv.key = null;
    clean(t);
  }
  function clean(t) {
    t.pv.view?.destroy();
    t.pv.view = null;
    if (t.pv.url) URL.revokeObjectURL(t.pv.url);
    t.pv.url = null;
    t.pv.el.replaceChildren();
  }

  // Called on every selection change; the read waits for a short pause so arrow keys stay fast.
  function follow(t) {
    t.pv.btn.title = T("Khung xem trước (Alt+P)");
    t.pv.btn.classList.toggle("on", FolderView.preview());
    t.pv.btn.setAttribute("aria-pressed", FolderView.preview());
    t.ui.root.classList.toggle("pv-on", shown(t));
    if (!shown(t)) { reset(t); return; }
    clearTimeout(t.pv.timer);
    t.pv.timer = setTimeout(() => show(t), 120);
  }

  function frame(t, node, tools = []) {
    clean(t);
    const head = el("div", "fi-pvhead"), body = el("div", "fi-pvbody");
    head.append(el("b", "", node ? node.name : ""), ...tools);
    if (node && !node.dir) head.append(btn("fi-pvbtn", "↗", T("Mở thành tab"), () => t.pv.src.open(node)));
    t.pv.el.append(head, body);
    return body;
  }
  function facts(t, node, rows, extra = []) {
    const body = frame(t, node), dl = el("dl", "fi-pvfacts");
    for (const [k, v] of rows) if (v) dl.append(el("dt", "", k), el("dd", "", v));
    body.append(dl, ...extra);
  }
  const note = (t, text, node = null) => frame(t, node).append(el("p", "fi-empty", text));

  async function show(t, force = false) {
    const { node, nodes } = t.pv.src.cur(), key = (FolderView.details() ? "d:" : "p:") + (nodes.length > 1 ? "*" + nodes.map(n => n.path).join("\n") : node ? node.path : "");
    if (key === t.pv.key && !force) return;
    const my = ++t.pv.gen;
    t.pv.key = key;
    if (FolderView.details()) FolderDetails.show(t, node, nodes, { frame: n => frame(t, n), live: () => my === t.pv.gen });
    else if (nodes.length > 1) {
      const files = nodes.filter(n => !n.dir), sizes = files.map(n => t.stats.get(n)?.size).filter(s => s != null);
      facts(t, null, [[T("Đã chọn"), T("{files} file, {dirs} folder", { files: files.length, dirs: nodes.length - files.length })], [T("Kích thước"), sizes.length ? FolderFmt.size(sizes.reduce((a, b) => a + b, 0)) : ""]]);
    } else if (!node) note(t, T("Chọn 1 file để xem trước."));
    else if (node.dir) facts(t, node, [[T("Kiểu"), T("Folder")], [T("Chứa"), node.children ? T("{n} mục", { n: node.children.length }) : ""]]);
    else await file(t, node, force, my);
  }

  async function file(t, node, force, my) {
    const s = t.stats.get(node), base = [[T("Kiểu"), FolderFmt.typeOf(node)], [T("Kích thước"), s ? FolderFmt.size(s.size) : ""], [T("Ngày sửa"), s ? FolderFmt.date(s.mod) : ""]];
    if (node.remote && (node.size ?? 0) > CLOUD_MAX && !force) {
      facts(t, node, base, [btn("ex-open", T("⬇ Tải để xem"), "", () => show(t, true))]);
      return;
    }
    if (PDF.test(node.name)) { facts(t, node, base, [btn("ex-open", T("Mở ở tab trình duyệt mới"), "", () => BrowserTab.open(node))]); return; }
    note(t, T("Đang đọc…"), node);
    try {
      const { file: f } = await node.read();
      if (my !== t.pv.gen) return;
      if (IMG.test(node.name)) return image(t, node, f);
      const bytes = () => f.slice(0, HEX).arrayBuffer().then(b => new Uint8Array(b));
      if (FindCore.binaryName(node.name)) return hex(t, node, await bytes(), f.size, my);
      const r = await LocalFs.readText(f.size > TEXT_MAX ? f.slice(0, HEAD) : f);
      if (my !== t.pv.gen) return;
      if (r.binary) return hex(t, node, await bytes(), f.size, my);
      const lang = LangDetect.byName(node.name), cut = f.size > TEXT_MAX ? T("Chỉ hiện {kb} KB đầu của file {size}.", { kb: HEAD / 1024, size: FolderFmt.size(f.size) }) : "";
      if (lang === "Markdown") markdown(t, node, r.text, cut); else code(t, node, r.text, lang, cut);
    } catch (e) { if (my === t.pv.gen) note(t, T("Không đọc được: {msg}", { msg: e.message }), node); }
  }

  function image(t, node, f) {
    const body = frame(t, node), img = el("img", "fi-pvimg");
    t.pv.url = URL.createObjectURL(/\.svg$/i.test(node.name) && f.type !== "image/svg+xml" ? new Blob([f], { type: "image/svg+xml" }) : f);
    img.alt = node.name;
    img.src = t.pv.url;
    body.append(img);
  }
  function hex(t, node, bytes, total, my) {
    if (my !== t.pv.gen) return;
    frame(t, node).append(el("pre", "fi-pvhex", HexDump.format(bytes, total)));
  }
  function markdown(t, node, text, cut) {
    const body = frame(t, node, [btn("fi-pvbtn", t.pv.md ? "</>" : "👁", T(t.pv.md ? "Xem mã nguồn" : "Xem Markdown đã vẽ"), () => { t.pv.md = !t.pv.md; show(t, true); })]);
    if (!t.pv.md) { codeView(t, body, text, "Markdown", cut); return; }
    const md = el("div", "pv-md");
    md.append(...MdRender.parse(text).map(PvMarkdown.build));
    body.append(...(cut ? [el("p", "fi-pvcut", cut)] : []), md);
  }
  const code = (t, node, text, lang, cut) => codeView(t, frame(t, node), text, lang, cut);

  function codeView(t, body, text, lang, cut) {
    const C = CM, langC = new C.state.Compartment();
    if (cut) body.append(el("p", "fi-pvcut", cut));
    const host = body.appendChild(el("div", "fi-pvcode"));
    const view = t.pv.view = new C.view.EditorView({ parent: host, state: C.state.EditorState.create({ doc: text,
      extensions: [C.view.lineNumbers(), C.state.EditorState.readOnly.of(true), C.view.EditorView.editable.of(false), CmSetup.theme(), langC.of([])] }) });
    if (lang) LangLoader.support(lang).then(s => { if (s && t.pv.view === view) view.dispatch({ effects: langC.reconfigure(s) }); }).catch(() => {});
  }

  function hotkey(e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyP") { if (e.shiftKey) FolderView.toggleDetails(); else FolderView.togglePreview(); return true; }
    return false;
  }

  return { build, follow, reset, hotkey };
})();
