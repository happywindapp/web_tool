// Phase 8d editor extras live in tools/one-editor-editor-extras.js (loaded after the editor is ready / on first use); Vim and Emmet are vendored bundles loaded when turned on.
const EditorExtras = (() => {
  let ready = null, emmetLoading = null;
  const load = () => ready ??= VendorPaths.load("editorExtras").catch(e => { ready = null; throw new Error(T("Không nạp được phần mở rộng editor ({file}) — cần file này nằm cạnh one-editor.html.", { file: e.message })); });
  // Runs fn once the extras are there; a failed load is reported on the status bar.
  const use = fn => load().then(fn).catch(e => StatusBar.msg(e.message, "bad"));

  const EMMET = { HTML: "html", XML: "xml", SVG: "xml", CSS: "css", SCSS: "scss", LESS: "less", JSX: "jsx", TSX: "tsx", Vue: "vue" }, emmetExt = {};
  const emmetOn = () => Prefs.get("emmet", true) !== false;
  // Emmet for one language, joined to the tab's language compartment; the first HTML / CSS / JSX tab loads the bundle, then those tabs re-apply.
  function emmetFor(id) {
    const syntax = EMMET[id];
    if (!syntax || !emmetOn()) return [];
    if (!CM.emmet) {
      emmetLoading ??= VendorPaths.load("cmEmmet").then(reapplyEmmet).catch(e => { StatusBar.msg(T("Không nạp được Emmet ({file}).", { file: e.message }), "bad"); });
      return [];
    }
    // Prec.high: the tracker's Tab must come before indentWithTab (it returns false when there is no abbreviation).
    return emmetExt[syntax] ??= CM.state.Prec.high([CM.emmet.abbreviationTracker(), CM.emmet.emmetConfig.of({ syntax }), CM.view.keymap.of([{ key: "Mod-e", run: CM.emmet.expandAbbreviation }])]);
  }
  const reapplyEmmet = () => Docs.list().forEach(d => { if (d.state && EMMET[Docs.effectiveLang(d)]) { d.langApplied = null; LangLoader.apply(d); } });
  function setEmmet(on) {
    Prefs.set("emmet", !!on);
    reapplyEmmet();
    StatusBar.msg(on ? T("Emmet: bật (HTML · CSS · JSX — Tab hoặc Ctrl+E để mở rộng viết tắt).") : T("Emmet: tắt."));
  }

  return { load, use, emmetFor, setEmmet, emmetOn, isEmmetLang: id => !!EMMET[id] };
})();
