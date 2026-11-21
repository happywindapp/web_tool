// Outline / Function List sidebar: symbols of the active tab (functions, classes, headings by level), filter box, click ⇒ the line; follows tab switches and edits.
const Outline = (() => {
  const box = $("outline"), filter = $("olFilter");
  let timer = 0, wired = false;
  const visible = () => !document.querySelector('[data-side-panel="outline"]').hidden;

  function render() {
    if (!visible()) return;
    const d = Views.activeDoc();
    const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text });
    if (!d || PreviewPane.isPane(d) || d.hex) { box.replaceChildren(el("p", "muted", T("Tab đang mở không có symbol."))); return; }
    // Symbols come from the syntax tree: render again once the tab's language pack is applied.
    if (d.state && d.langApplied !== Docs.effectiveLang(d)) LangLoader.apply(d).then(() => { if (d.langApplied === Docs.effectiveLang(d)) later(); });
    const st = Views.activeView().state, line = st.doc.lineAt(st.selection.main.head).number, q = filter.value.trim();
    let list = st.doc.length < 2e6 ? Symbols.list(st) : [];
    if (q) list = Fuzzy.filter(q, list);
    const cur = q ? null : list.filter(s => s.line <= line).pop();
    if (!list.length) { box.replaceChildren(el("p", "muted", q ? T("Không có symbol khớp.") : T("Tab đang mở không có symbol."))); return; }
    box.replaceChildren(...list.slice(0, 2000).map(s => {
      const lvl = /^H(\d)$/.exec(s.kind), b = el("button", "ol-item" + (s === cur ? " on" : ""), s.label);
      b.type = "button";
      b.style.paddingLeft = (lvl ? (+lvl[1] - 1) * 12 + 8 : 8) + "px";
      b.title = (s.kind ? s.kind + " · " : "") + T("dòng {n}", { n: s.line });
      b.onclick = () => { Views.revealLine(d, s.line); PhoneLayout.show(Views.where(d.id) + 1); };
      return b;
    }));
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(render, 300); };

  function show() {
    if (!wired) {
      wired = true;
      filter.addEventListener("input", later);
      Views.onChange(later);
      Docs.on(type => { if (type === "edit" || type === "lang") later(); });
    }
    render();
    filter.focus();
  }

  return { show, render };
})();
