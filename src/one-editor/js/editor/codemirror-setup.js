// CodeMirror 6 editor config shared by every tab: compartments for language / wrap / theme / UI phrases / read-only so settings change without losing undo history.
const CmSetup = (() => {
  let C = null, themes = null, onUpdate = null;
  const comp = {};
  const settings = { wrap: false };

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
    for (const k of ["lang", "wrap", "theme", "phrases", "ro"]) comp[k] = new C.state.Compartment();
    themes = { light: makeTheme(false), dark: makeTheme(true) };
  }

  const phrases = () => I18n.lang === "vi" ? C.state.EditorState.phrases.of(CM_PHRASES_VI) : [];
  const settingsEffects = () => [
    comp.wrap.reconfigure(settings.wrap ? C.view.EditorView.lineWrapping : []),
    comp.theme.reconfigure(isDark() ? themes.dark : themes.light),
    comp.phrases.reconfigure(phrases()),
  ];

  function extensions(readOnly) {
    const { view: V, state: S, language: L, commands: K, search: F, autocomplete: A } = C;
    return [
      V.lineNumbers(), V.highlightActiveLineGutter(), V.highlightSpecialChars(), K.history(), L.foldGutter(),
      V.drawSelection(), V.dropCursor(), S.EditorState.allowMultipleSelections.of(true), L.indentOnInput(),
      L.bracketMatching(), A.closeBrackets(), A.autocompletion(), V.rectangularSelection(), V.crosshairCursor(),
      V.highlightActiveLine(), F.highlightSelectionMatches(), F.search({ top: true }),
      V.keymap.of([...A.closeBracketsKeymap, ...K.defaultKeymap, ...F.searchKeymap, ...K.historyKeymap, ...L.foldKeymap, ...A.completionKeymap, K.indentWithTab]),
      comp.lang.of([]), comp.ro.of(readOnly ? [S.EditorState.readOnly.of(true)] : []),
      ...[comp.wrap, comp.theme, comp.phrases].map(c => c.of([])),
      V.EditorView.updateListener.of(u => onUpdate && onUpdate(u)),
    ];
  }

  // The settings compartments start empty; the view applies settingsEffects() whenever it shows a state.
  const makeState = (text, readOnly = false) => C.state.EditorState.create({ doc: text, extensions: extensions(readOnly) });
  const langEffect = support => comp.lang.reconfigure(support || []);

  return {
    init, makeState, settingsEffects, langEffect, isDark, settings,
    set onUpdate(fn) { onUpdate = fn; },
  };
})();
