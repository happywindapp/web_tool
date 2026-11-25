// CodeMirror 6 editor config shared by every tab: compartments for language / wrap / theme / UI phrases / read-only so settings change without losing undo history.
const CmSetup = (() => {
  let C = null, themes = null, onUpdate = null, minimap = null, guides = null, words = null;
  const comp = {}, extra = { vim: [], keys: [], aids: [], writing: [] };
  const settings = { wrap: true, minimap: false, guides: false, hidden: false, numHover: true, lint: true, words: true };

  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  };

  function makeTheme(dark) {
    const sel = "color-mix(in srgb, var(--acc) 32%, transparent)";
    return [
      C.view.EditorView.theme({
        "&": { height: "100%", backgroundColor: "var(--code)", color: "var(--ink)" },
        ".cm-scroller": { fontFamily: 'Consolas, "Cascadia Mono", monospace', lineHeight: "1.5" },
        ".cm-gutters": { backgroundColor: "var(--gut)", color: "var(--muted)", borderRight: "1px solid var(--line)" },
        ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--acc) 7%, transparent)" },
        ".cm-activeLineGutter": { backgroundColor: "color-mix(in srgb, var(--acc) 16%, transparent)" },
        "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: sel },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ink)" },
        ".cm-panels": { backgroundColor: "var(--panel)", color: "var(--ink)" },
        ".cm-panels input, .cm-panels button": { color: "var(--ink)" },
        ".cm-foldPlaceholder": { backgroundColor: "var(--hover)", border: "1px solid var(--line)", color: "var(--muted)" },
      }, { dark }),
      C.language.syntaxHighlighting(dark ? C.oneDark.oneDarkHighlightStyle : C.language.defaultHighlightStyle, { fallback: true }),
    ];
  }

  function init() {
    C = globalThis.CM;
    for (const k of ["lang", "wrap", "theme", "phrases", "ro", "minimap", "guides", "compare", "hidden", "numHover", "lint", "words", "vim", "keys", "aids", "writing"]) comp[k] = new C.state.Compartment();
    themes = { light: makeTheme(false), dark: makeTheme(true) };
    CompareDeco.init();
    MixedEol.init();
  }

  const phrases = () => I18n.lang === "vi" ? C.state.EditorState.phrases.of(CM_PHRASES_VI) : [];
  // Notepad++ word completion (words already in the file); no type, so a language's own entry with the same label wins the dedupe.
  const wordSource = ctx => { const r = C.autocomplete.completeAnyWord(ctx); return r && { ...r, options: r.options.map(o => ({ label: o.label })) }; };
  const wordCompletion = () => words ??= C.state.EditorState.languageData.of(() => [{ autocomplete: wordSource }]);
  const settingsEffects = () => [
    comp.wrap.reconfigure(settings.wrap ? C.view.EditorView.lineWrapping : []),
    comp.theme.reconfigure(isDark() ? themes.dark : themes.light),
    comp.phrases.reconfigure(phrases()),
    comp.minimap.reconfigure(settings.minimap && minimap ? minimap : []),
    comp.guides.reconfigure(settings.guides && guides ? guides : []),
    comp.hidden.reconfigure(settings.hidden ? HiddenChars.extension() : []),
    comp.numHover.reconfigure(settings.numHover ? NumHover.extension() : []),
    comp.lint.reconfigure(settings.lint ? DataLint.extension() : []),
    comp.words.reconfigure(settings.words ? wordCompletion() : []),
    ...["vim", "keys", "aids", "writing"].map(k => comp[k].reconfigure(extra[k])),
  ];

  // Indent guides from the lazily loaded bundle; colours follow the page theme tokens.
  function enableGuides() {
    const line = "var(--line)", active = "var(--muted)";
    guides ??= C.indentMarkers.indentationMarkers({ thickness: 1, colors: { light: line, dark: line, activeLight: active, activeDark: active } });
  }

  // Called once the lazily loaded minimap bundle has set CM.minimap (one static config: create() runs once per view).
  function enableMinimap() {
    minimap ??= C.minimap.showMinimap.of({ create: () => ({ dom: document.createElement("div") }), displayText: "blocks", showOverlay: "always" });
  }

  // VS Code mouse: Alt+click (or Ctrl/⌘+click) adds a cursor, Shift+Alt+drag selects a column.
  function extensions(readOnly, indent) {
    const { view: V, state: S, language: L, commands: K, search: F, autocomplete: A } = C;
    return [
      comp.vim.of([]), comp.keys.of([]), comp.aids.of([]), comp.writing.of([]),
      V.lineNumbers(), V.highlightActiveLineGutter(), V.highlightSpecialChars(), K.history(), L.foldGutter(),
      V.drawSelection(), V.dropCursor(), S.EditorState.allowMultipleSelections.of(true), L.indentOnInput(),
      L.bracketMatching(), A.closeBrackets(), A.autocompletion(), V.rectangularSelection({ eventFilter: e => e.altKey && e.shiftKey }),
      V.EditorView.clickAddsSelectionRange.of(e => e.altKey || e.ctrlKey || e.metaKey), L.indentUnit.of(indent || "  "),
      V.highlightActiveLine(), F.highlightSelectionMatches(), F.search({ top: true }),
      V.keymap.of([...A.closeBracketsKeymap, ...K.defaultKeymap, ...F.searchKeymap, ...K.historyKeymap, ...L.foldKeymap, ...A.completionKeymap, K.indentWithTab]),
      Bookmarks.extension(), ClipHistory.extension(), TokenStyles.extension(), RainbowCsv.extension(), LogFixMarks.extension(), FixHover.extension(), SwiftMarks.extension(), CompareDeco.field, MixedEol.field, comp.compare.of([]), comp.lang.of([]), comp.ro.of(readOnly ? [S.EditorState.readOnly.of(true)] : []),
      ...[comp.wrap, comp.theme, comp.phrases, comp.minimap, comp.guides, comp.hidden, comp.numHover, comp.lint, comp.words].map(c => c.of([])),
      V.EditorView.updateListener.of(u => { if (onUpdate) onUpdate(u); SearchInSelection.decorate(u.view); if (u.docChanged && u.transactions.some(tr => tr.isUserEvent("input.paste"))) { PowerTools.pasted(u); SmartPaste.pasted(u); } }),
    ];
  }

  // The settings compartments start empty; the view applies settingsEffects() whenever it shows a state.
  const makeState = (text, readOnly = false, indent = "") => C.state.EditorState.create({ doc: text, extensions: extensions(readOnly, indent) });
  const langEffect = support => comp.lang.reconfigure(support || []);
  const compareEffect = ext => comp.compare.reconfigure(ext || []);

  // Extensions installed after boot (Vim, key profile, visual aids + snippets, writing aids).
  const setExtra = (k, ext) => { extra[k] = ext; Views.applySettings(); };

  return {
    init, makeState, setExtra, settingsEffects, langEffect, compareEffect, enableMinimap, enableGuides, isDark, settings, theme: () => (isDark() ? themes.dark : themes.light),
    set onUpdate(fn) { onUpdate = fn; },
  };
})();
