// Visual aids: column rulers 80 / 120, bracket pair colours (from the syntax tree), colour swatches next to CSS colours, breadcrumbs panel; expand / shrink the selection by syntax.
const Aids = (() => {
  const DEF = { rulers: false, brackets: true, swatches: true, crumbs: true }, OPEN = new Set(["(", "[", "{"]), PAIRS = new Set(["(", ")", "[", "]", "{", "}"]);
  const COLOR = /#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{3,4})\b|\b(?:rgba?|hsla?)\([^()\n]{3,60}\)/gi, COLOR_LANGS = new Set(["CSS", "SCSS", "LESS", "HTML", "Vue", "SVG", "JSX", "TSX"]);
  const settings = () => ({ ...DEF, ...Prefs.get("aids", {}) });
  const D = () => CM.view.Decoration, docOf = view => { const g = Views.groups.find(x => x.view === view); return g && Docs.get(g.active); };

  const rulers = () => CM.view.EditorView.theme({ ".cm-content": { backgroundImage: ["80ch", "120ch"].map(c => `linear-gradient(to right, transparent calc(${c} + 6px), var(--line) calc(${c} + 6px), var(--line) calc(${c} + 7px), transparent calc(${c} + 7px))`).join(", ") } });

  // Depth = enclosing nodes that open with a bracket; colours cycle over 3.
  function bracketMarks(view) {
    const b = new CM.state.RangeSetBuilder(), tree = CM.language.syntaxTree(view.state), marks = [0, 1, 2].map(k => D().mark({ class: "brk" + k }));
    for (const { from, to } of view.visibleRanges) tree.iterate({ from, to, enter: n => {
      if (!PAIRS.has(n.name) || n.to - n.from !== 1) return;
      let depth = 0;
      for (let p = n.node.parent; p; p = p.parent) if (p.firstChild && OPEN.has(p.firstChild.name)) depth++;
      if (depth) b.add(n.from, n.to, marks[(depth - 1) % 3]);
    } });
    return b.finish();
  }

  class Swatch extends CM.view.WidgetType {
    constructor(c) { super(); this.c = c; }
    eq(o) { return o.c === this.c; }
    toDOM() { const s = document.createElement("span"); s.className = "oe-swatch"; s.style.background = this.c; s.title = this.c; return s; }
  }
  function swatchMarks(view) {
    const d = docOf(view), b = new CM.state.RangeSetBuilder();
    if (!d || !COLOR_LANGS.has(Docs.effectiveLang(d))) return b.finish();
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      for (const m of text.matchAll(COLOR)) if (CSS.supports("color", m[0])) b.add(from + m.index, from + m.index, D().widget({ widget: new Swatch(m[0]), side: -1 }));
    }
    return b.finish();
  }
  const plugin = build => CM.view.ViewPlugin.fromClass(class {
    constructor(v) { this.decorations = build(v); }
    update(u) { if (u.docChanged || u.viewportChanged || CM.language.syntaxTree(u.startState) !== CM.language.syntaxTree(u.state) || u.transactions.some(t => t.effects.length)) this.decorations = build(u.view); }
  }, { decorations: v => v.decorations });

  // Breadcrumbs: file › heading path (Markdown) or › the symbol the cursor is in / after.
  function crumbs(view) {
    const dom = document.createElement("div");
    dom.className = "oe-crumbs";
    let syms = null, at = null;
    function draw(state) {
      const d = docOf(view);
      if (!d) { dom.replaceChildren(); return; }
      const key = CM.language.syntaxTree(state).length ? CM.language.syntaxTree(state) : state.doc;
      if (at !== key) { at = key; syms = state.doc.length < 3e5 ? Symbols.list(state) : []; }
      const line = state.doc.lineAt(state.selection.main.head).number, chain = [];
      for (const s of syms) {
        if (s.line > line) break;
        const lvl = /^H(\d)$/.exec(s.kind);
        if (lvl) { chain.length = Math.min(chain.length, +lvl[1] - 1); chain.push(s); } else { chain.length = 0; chain.push(s); }
      }
      const item = (text, fn) => Object.assign(document.createElement("button"), { type: "button", textContent: text, onclick: fn });
      const parts = [item(d.name, () => QuickPick.open("@"))];
      for (const s of chain.filter(Boolean)) parts.push(document.createTextNode(" › "), item(s.label, () => Views.revealLine(d, s.line)));
      dom.replaceChildren(...parts);
    }
    // Redrawn 200 ms after typing / moving stops: the symbol list walks the whole syntax tree.
    let timer = 0;
    draw(view.state);
    return { dom, top: true, update: u => { if (u.docChanged || u.selectionSet) { clearTimeout(timer); timer = setTimeout(() => draw(view.state), 200); } }, destroy: () => clearTimeout(timer) };
  }

  function build() {
    const s = settings(), out = [];
    if (s.rulers) out.push(rulers());
    if (s.brackets) out.push(plugin(bracketMarks));
    if (s.swatches) out.push(plugin(swatchMarks));
    if (s.crumbs) out.push(CM.view.showPanel.of(crumbs));
    return out;
  }
  const apply = () => CmSetup.setExtra("aids", [build(), Snippets.extension()]);

  function toggle(id) {
    const s = settings();
    s[id] = !s[id];
    Prefs.set("aids", s);
    apply();
  }

  // Expand = selectParentSyntax; shrink walks back the selections it replaced (per view, until the user moves).
  const stacks = new WeakMap();
  function expand(view) {
    const before = view.state.selection, st = stacks.get(view) || [];
    CM.commands.selectParentSyntax(view);
    if (!view.state.selection.eq(before)) { st.push({ sel: before, after: view.state.selection }); stacks.set(view, st); }
  }
  function shrink(view) {
    const st = stacks.get(view) || [], top = st[st.length - 1];
    if (!top || !view.state.selection.eq(top.after)) { stacks.delete(view); return; }
    st.pop();
    view.dispatch({ selection: top.sel });
  }

  return { apply, toggle, expand, shrink, settings };
})();
