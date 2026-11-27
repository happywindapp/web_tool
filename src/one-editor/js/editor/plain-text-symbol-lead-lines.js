// Plain Text tabs: a line whose first non-blank char is a bullet / sign / bracket gets that char's own text colour.
const LeadSymbolLines = (() => {
  const CHARS = "•-+=><\/{}[]~?|\\", LEAD = /^[ \t]*([•\-+=><\/{}\[\]~?|\\])/;
  let plugin = null, decos = null;

  const langOf = view => { const g = Views.groups.find(x => x.view === view), d = g && Docs.get(g.active); return d && !PreviewPane.isPane(d) ? Docs.effectiveLang(d) : ""; };

  function build(view) {
    const D = CM.view.Decoration;
    if (langOf(view) !== "Plain Text") return D.none;
    decos ??= [...CHARS].map((c, k) => D.line({ class: "oe-sym-line oe-sym-" + k }));
    const st = view.state, b = new CM.state.RangeSetBuilder();
    for (const { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = st.doc.lineAt(pos), m = LEAD.exec(line.text.slice(0, 200));
        if (m) b.add(line.from, line.from, decos[CHARS.indexOf(m[1])]);
        pos = line.to + 1;
      }
    }
    return b.finish();
  }

  function extension() {
    return plugin ??= CM.view.ViewPlugin.fromClass(class {
      constructor(v) { this.decorations = build(v); }
      update(u) { if (u.docChanged || u.viewportChanged || u.transactions.some(t => t.effects.length)) this.decorations = build(u.view); }
    }, { decorations: v => v.decorations });
  }

  return { CHARS, LEAD, extension };
})();
