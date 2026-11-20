// Show hidden characters: spaces / tabs (CodeMirror highlightWhitespace) plus the tab's EOL (CRLF / LF / CR) drawn at each line end.
const HiddenChars = (() => {
  let ext = null;

  function extension() {
    if (ext) return ext;
    const V = CM.view;
    class EolMark extends V.WidgetType {
      constructor(label) { super(); this.label = label; }
      eq(o) { return o.label === this.label; }
      toDOM() { const s = document.createElement("span"); s.className = "cm-eol-mark"; s.textContent = this.label; return s; }
    }
    const build = view => {
      const g = Views.groups.find(x => x.view === view), d = g && Docs.get(g.active), doc = view.state.doc, out = [];
      const mark = V.Decoration.widget({ widget: new EolMark(Encoding.EOL_NAME[(d && Docs.root(d).eol) || "\n"]), side: 1 });
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to;) { const l = doc.lineAt(pos); if (l.number < doc.lines) out.push(mark.range(l.to)); pos = l.to + 1; }
      }
      return V.Decoration.set(out);
    };
    const plugin = V.ViewPlugin.fromClass(class {
      constructor(v) { this.decorations = build(v); }
      update(u) { if (u.docChanged || u.viewportChanged || u.transactions.some(tr => tr.reconfigured)) this.decorations = build(u.view); }
    }, { decorations: p => p.decorations });
    return (ext = [V.highlightWhitespace(), plugin]);
  }

  return { extension };
})();
