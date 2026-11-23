// "↗ Mở bằng tool": the active tab's text (only the selection when there is one) opens in another web_tool page through that page's own #pako: share link (ADR #9), so nothing leaves the browser.
const OpenInTool = (() => {
  const TOOLS = [{ id: "workbench", name: "Data Workbench" }, { id: "fix", name: "FIX Parser" }, { id: "diagram", name: "Diagram Editor" }, { id: "oneEditor", name: "One Editor" }];
  const WB_TAB = { CSV: "csv", TSV: "csv", CSS: "code", JavaScript: "code" };
  const WB_LABEL = { format: "Format JSON · XML · HTML", csv: "Bảng CSV", code: "Format CSS · JS" };
  const ENGINE = { Mermaid: "mermaid", PlantUML: "plantuml", D2: "d2", DBML: "dbml", Structurizr: "structurizr" };
  const ENGINE_LABEL = { mermaid: "Mermaid", plantuml: "PlantUML", drawio: "draw.io", dbml: "DBML", d2: "D2", structurizr: "Structurizr" };
  // Chrome refuses to navigate to URLs over 2 MB.
  const MAX_URL = 2e6;

  // src: { name, lang (effective), autoLang ("" = detected), text, drawio, wrap } → { page, search, payload, hint } for tool id.
  function target(id, src) {
    if (id === "workbench") { const tab = WB_TAB[src.lang] || "format"; return { page: "data-workbench.html", search: "?tab=" + tab, payload: { tab, text: src.text }, hint: WB_LABEL[tab] }; }
    if (id === "fix") return { page: "fix-message-parser.html", search: "", payload: { text: src.text }, hint: "FIX 4.4" };
    if (id === "diagram") { const tab = src.drawio ? "drawio" : ENGINE[src.lang] || "mermaid"; return { page: "diagram-editor.html", search: "?tab=" + tab, payload: { tab, code: src.text }, hint: ENGINE_LABEL[tab] }; }
    return { page: "one-editor.html", search: "", payload: ShareState.build([[{ name: src.name, lang: src.autoLang, text: src.text }], []], src.wrap, "", false, ""), hint: "Cửa sổ mới" };
  }

  // A preview tab stands for its source tab; a selection in the active view replaces the whole text.
  function source() {
    let d = Views.activeDoc();
    const sel = d ? SelectionActions.text(Views.activeView()) : "";
    if (d && PreviewPane.isPreview(d)) d = Docs.get(d.link.src);
    if (!d || Docs.isList(d)) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return null; }
    d = Docs.root(d);
    const text = sel || Docs.text(d);
    if (!text.trim()) { StatusBar.msg(T("Tab đang trống — không có gì để mở."), "warn"); return null; }
    const lang = sel ? SelectionActions.langOf(sel, d) : Docs.effectiveLang(d), name = sel ? SelectionActions.tabName(d) : d.name;
    return { name, lang, autoLang: sel ? lang : d.lang || "", text, drawio: PreviewKind.of(lang, text.slice(0, 2000), sel ? "" : d.name)?.kind === "drawio", wrap: CmSetup.settings.wrap };
  }

  // A blank page of ours opened inside the click (popup blockers), navigated once the URL is ready.
  function popup() {
    const w = window.open("", "_blank");
    if (!w) { StatusBar.msg(T("Trình duyệt chặn cửa sổ mới — cho phép pop-up cho trang này rồi thử lại."), "bad"); return null; }
    w.opener = null;
    return w;
  }

  function open(id) {
    const src = source(), tool = TOOLS.find(t => t.id === id);
    if (!src || !tool) return;
    const t = target(id, src), w = popup();
    if (!w) return;
    const fail = msg => { w.close(); StatusBar.msg(msg, "bad"); };
    ShareCodec.encode(t.payload).then(hash => {
      const u = new URL(t.page + t.search, location.href);
      u.hash = hash;
      if (u.href.length > MAX_URL) return fail(T("Tab quá lớn để chuyển qua link ({n} ký tự) — lưu thành file rồi mở trong {tool}.", { n: I18n.num(u.href.length), tool: tool.name }));
      w.location.replace(u.href);
      StatusBar.msg(T("Đã mở “{name}” bằng {tool} ({hint}).", { name: src.name, tool: tool.name, hint: T(t.hint) }), "good");
    }, e => fail(T("Không mở được: {msg}", { msg: e.message })));
  }

  function menuAt(x, y) {
    const src = source();
    if (!src) return;
    const head = Object.assign(document.createElement("div"), { className: "menu-head", textContent: T("Mở “{name}” bằng…", { name: src.name }) });
    TabMenu.show([head, ...TOOLS.map(t => TabMenu.entry(t.name, T(target(t.id, src).hint), () => open(t.id)))], x, y);
  }

  const menu = btn => { const r = btn.getBoundingClientRect(); menuAt(r.left, r.bottom + 2); };

  return { TOOLS, target, open, menu, menuAt, popup };
})();
