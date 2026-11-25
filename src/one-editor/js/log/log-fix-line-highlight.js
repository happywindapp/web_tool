// Log and FIX tabs have no CM grammar: a ViewPlugin marks the visible lines — log levels, timestamps, UUIDs, IPs, strings, numbers; FIX tag=value pairs by header / body / trailer.
const LogFixMarks = (() => {
  const SOH = String.fromCharCode(1), LONG = 20000;
  const HEADER = new Set("8 9 35 34 43 49 50 52 56 57 90 91 97 115 116 122 128 129 142 143 144 145 212 213 347 369 627 628 629 630 1128 1129".split(" ")), TRAILER = new Set(["10", "89", "93"]);
  const LOG = /\b(FATAL|CRITICAL|SEVERE|ERROR|ERR)\b|\b(WARN|WARNING)\b|\b(INFO|NOTICE)\b|\b(DEBUG|TRACE|VERBOSE)\b|(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\b\d{2}:\d{2}:\d{2}(?:[.,]\d+)?\b)|\b([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\b|\b((?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?)\b|("[^"\n]*")|\b(\d+(?:\.\d+)?)\b/gi;
  const LOG_CLS = ["lg-err", "lg-warn", "lg-info", "lg-dbg", "lg-time", "lg-id", "lg-ip", "lg-str", "lg-num"];
  const FIX = new RegExp("(^|[" + SOH + "|])(\\d+)=([^" + SOH + "|]*)", "g");
  let plugin = null, marks = null;

  // [from, to, class] spans of one line, in order (pure).
  function logSpans(text) {
    const out = [];
    for (const m of text.matchAll(LOG)) { const g = m.findIndex((x, i) => i && x !== undefined); out.push([m.index, m.index + m[0].length, LOG_CLS[g - 1]]); }
    return out;
  }
  function fixSpans(text) {
    const out = [];
    for (const m of text.matchAll(FIX)) {
      const at = m.index + m[1].length, tag = m[2], grp = HEADER.has(tag) ? "fx-h" : TRAILER.has(tag) ? "fx-t" : "fx-b";
      out.push([at, at + tag.length, grp]);
      if (m[3]) out.push([at + tag.length + 1, at + tag.length + 1 + m[3].length, tag === "35" ? "fx-mt" : "fx-v"]);
    }
    return out;
  }

  const langOf = view => { const g = Views.groups.find(x => x.view === view), d = g && Docs.get(g.active); return d && !PreviewPane.isPane(d) ? Docs.effectiveLang(d) : ""; };

  function build(view) {
    const lang = langOf(view), D = CM.view.Decoration;
    const spans = lang === "Log" ? logSpans : lang === "FIX" ? fixSpans : lang === SwiftMarks.LANG ? SwiftMarks.spans : null;
    if (!spans) return D.none;
    const b = new CM.state.RangeSetBuilder(), doc = view.state.doc;
    marks ??= {};
    for (const { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = doc.lineAt(pos);
        if (line.length <= LONG) for (const [x, y, c] of spans(line.text)) if (y > x) b.add(line.from + x, line.from + y, marks[c] ??= D.mark({ class: c }));
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

  return { logSpans, fixSpans, extension, FIX, SOH };
})();
