// Pane tabs (output tabs of an op with pane: preview, translate): their view hides the editor and shows a body per kind — drawing, Markdown, HTML, table, draw.io, translation.
const PreviewPane = (() => {
  const panes = new Map(), extra = {};
  const VIEWS = () => ({ diagram: PvDiagram, markdown: PvMarkdown, html: PvHtml, table: PvTable, drawio: PvDrawio, translate: PvTranslate, report: PvReport, ...extra });
  const isPreview = doc => !!doc && doc.kind === "output" && doc.link?.op === "preview";
  // A folder / recycle bin / results / settings tab counts as a pane (no text) but is drawn by its own module.
  const isPane = doc => !!doc && (Docs.isList(doc) || doc.kind === "output" && !!OutputOps.get(doc.link?.op)?.pane);
  const el = (tag, cls) => Object.assign(document.createElement(tag), { className: cls });

  function create(doc) {
    const p = { doc: doc.id, root: el("div", "pv"), bar: el("div", "pv-bar"), type: el("span", "pv-type"), tools: el("span", "pv-tools"), body: el("div", "pv-body"),
      note: el("div", "pv-note"), err: el("pre", "pv-err"), kind: null, view: null, has: false, tried: false, hadError: false };
    p.note.hidden = p.err.hidden = true;
    p.bar.append(p.type, p.tools);
    p.root.append(p.bar, p.body, p.note, p.err);
    panes.set(doc.id, p);
    return p;
  }

  // v: { kind, …data } | { kind, empty } | { error }. On error the last good result stays, faded.
  function show(doc, v) {
    const p = panes.get(doc.id) || create(doc), op = OutputOps.get(doc.link?.op);
    // An error before the pane was ever shown (e.g. after F5): show the saved result first, so the toolbar and text are there.
    if (v.error && !p.view && op?.restore) show(doc, op.restore(doc));
    p.tried = true;
    p.err.hidden = !v.error;
    if (v.error) {
      p.hadError = true;
      const d = v.error.detail, warn = !!(v.error.warn || v.error.stopped);
      p.err.classList.toggle("warn", warn);
      p.err.textContent = (warn ? "⚠ " : "✖ ") + v.error.message + (d && !v.error.message.includes(d) ? "\n\n" + d : "") + (p.has ? "\n\n" + (p.kind === "translate" ? T("Đang hiện bản dịch gần nhất (mờ).") : T("Đang hiện bản vẽ hợp lệ gần nhất (mờ).")) : "");
      p.body.classList.toggle("stale", p.has);
      return;
    }
    const kind = Object.hasOwn(VIEWS(), v.kind) ? v.kind : "diagram";
    if (p.kind !== kind) {
      p.view?.destroy?.();
      p.view = VIEWS()[kind].create(p);
      p.kind = kind; p.has = false;
      p.body.replaceChildren(p.view.el);
      p.tools.replaceChildren(...p.view.tools);
      p.view.labels();
    }
    const notes = v.empty ? [T("Chưa có nội dung — gõ ở tab nguồn.")] : v.warnings || [];
    p.note.hidden = !notes.length;
    p.note.textContent = notes.join("\n");
    try { p.has = p.view.show(v); } catch (e) { p.has = false; return show(doc, { error: e }); }
    p.body.classList.remove("stale");
    if (p.hadError) { p.hadError = false; if (kind !== "translate") StatusBar.msg(T("✔ Hết lỗi — preview đã vẽ lại."), "good"); }
  }

  // After F5 (or a new Structurizr view) the preview renders again from its source.
  function rerun(p) {
    const out = Docs.get(p.doc), src = out && Docs.get(out.link.src);
    p.tried = true;
    if (src) OutputLink.run(src, out.link.op, true);
    else show(out, { error: new Error(T("Tab nguồn của preview này đã đóng.")) });
  }

  const head = d => d.state ? d.state.doc.sliceString(0, 2000) : String(d.text || "").slice(0, 2000);
  const kindOf = d => PreviewKind.of(Docs.effectiveLang(d), head(d), d.name);
  // 👁 in the view's tab bar only for a tab that has a preview; 🌐 for any text tab.
  const syncButton = g => {
    const d = Docs.get(g.active), plain = !!d && !isPane(d) && !d.hex && !d.big;
    g.el.querySelector(".gpreview").hidden = !plain || !kindOf(d);
    g.el.querySelector(".gtranslate").hidden = !plain;
    g.el.querySelector(".grun").hidden = !plain || !["HTML", "JavaScript"].includes(Docs.effectiveLang(d));
  };

  // Called on every view refresh: shows the active preview tab in place of the editor.
  function mount(g) {
    const doc = Docs.get(g.active), on = isPane(doc) && !Docs.isList(doc);
    syncButton(g);
    g.el.classList.toggle("is-preview", on);
    if (!on) return;
    if (!g.pv) { g.pv = g.el.appendChild(el("div", "pvhost")); g.pv.dataset.i18nSkip = ""; }
    const p = panes.get(doc.id) || create(doc);
    if (p.root.parentNode !== g.pv) g.pv.append(p.root);
    for (const r of g.pv.children) r.hidden = r !== p.root;
    const op = OutputOps.get(doc.link.op);
    if (!p.tried) { if (op.restore) show(doc, op.restore(doc)); else rerun(p); }
    else p.view?.mounted?.();
  }

  // The drawing shown for the active tab: the tab itself, or the preview linked to it.
  function active() {
    const doc = Views.activeDoc(), src = doc && Docs.root(doc);
    const id = isPreview(doc) ? doc.id : src && Docs.list().find(d => isPreview(d) && d.link.src === src.id)?.id;
    const p = id && panes.get(id);
    if (p && p.view?.svg) return p;
    StatusBar.msg(T("Chưa có hình preview — mở tab sơ đồ rồi bấm 👁 Preview."), "warn");
    return null;
  }

  const name = p => OutputOps.baseName(Docs.get(p.doc)?.name);
  const exportSvg = p => { const v = p.view; if (v?.svg) Dom.download(Exporter.svgText(v.svg, v.bg), name(p) + ".svg", "image/svg+xml"); };
  async function exportPng(p) {
    const v = p.view;
    if (!v?.svg) return;
    try { Dom.download(await Exporter.png(v.svg, v.bg, 2), name(p) + ".png", "image/png"); }
    catch (e) { StatusBar.msg(T("Không xuất được PNG: {msg}", { msg: e.message }), "bad"); }
  }
  async function copySvg(p) {
    const v = p.view;
    if (!v?.svg) return;
    const ok = await Dom.copy(Exporter.svgText(v.svg, v.bg));
    StatusBar.msg(ok ? T("✔ Đã chép SVG.") : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
  }

  // Printable copy: Markdown / table DOM, or the drawing in a shadow root (its <style> stays local); HTML and draw.io live in iframes → null.
  function printable(doc) {
    const p = panes.get(doc.id);
    if (!p || !p.has) return null;
    if (["markdown", "table", "report", "tree", "query", "filter", "invisible", "regex", "recipe"].includes(p.kind)) return p.view.el.cloneNode(true);
    if (!p.view.svg) return null;
    const host = document.createElement("div"), css = document.createElement("style");
    css.textContent = "svg { max-width:100%; height:auto; }";
    host.attachShadow({ mode: "open" }).append(css, p.view.svg.cloneNode(true));
    return host;
  }

  const choice = srcId => { for (const p of panes.values()) if (Docs.get(p.doc)?.link?.src === srcId) return p.view?.pick ?? null; return null; };

  function init() {
    Docs.on((type, doc) => {
      if (type === "remove" && panes.has(doc.id)) { const p = panes.get(doc.id); p.view?.destroy?.(); p.root.remove(); panes.delete(doc.id); }
      if (type === "lang" || type === "rename") Views.groups.forEach(syncButton);
    });
    const runOn = (g, op) => () => { Views.focus(g.i); OutputLink.run(Views.activeDoc(g.i), op); };
    Views.groups.forEach(g => { g.el.querySelector(".gpreview").onclick = runOn(g, "preview"); g.el.querySelector(".gtranslate").onclick = runOn(g, "translate"); g.el.querySelector(".grun").onclick = runOn(g, "run-code"); });
    I18n.onChange(() => panes.forEach(p => p.view?.labels()));
    PvMarkdown.init();
    PvDrawio.init();
  }

  const act = fn => () => { const p = active(); if (p) fn(p); };
  const viewOf = id => panes.get(id)?.view || null;
  // Views of a lazily loaded bundle (data tools) register themselves here.
  const addView = (kind, view) => { extra[kind] = view; };
  return { init, addView, isPreview, isPane, viewOf, kindOf, mount, show, rerun, choice, printable, fit: act(p => p.view.fit()), exportSvg: act(exportSvg), exportPng: act(exportPng), copySvg: act(copySvg),
    exportSvgOf: exportSvg, exportPngOf: exportPng, copySvgOf: copySvg };
})();
