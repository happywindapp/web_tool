// SWIFT MT tabs (main page, light): Outline by message / 16R sequence, block · tag · qualifier marks (LogFixMarks), hover ⇒ tag meaning from the dictionary in tools/one-editor-extras.js.
const SwiftMarks = (() => {
  const LANG = "SWIFT MT";
  const TAG = /^:(\d{2}[A-Z]?):(?::([A-Z0-9]{4})\/[A-Z0-9]{0,8}\/)?/;
  let ext = null;

  // → [{ label, depth, line }]: each message (MT + sender) and its 16R sequences, nested (line scan, no parse).
  function outline(text, max = 3000) {
    const out = [], lines = text.split("\n", 200000);
    let depth = 0;
    for (let n = 0; n < lines.length && out.length < max; n++) {
      const l = lines[n];
      if (l.startsWith("{1:")) { depth = 0; const mt = /\{2:[IO](\d{3})/.exec(l); out.push({ label: "MT" + (mt ? mt[1] : "?") + " " + l.slice(6, 18), depth: 0, line: n + 1 }); }
      else if (l.startsWith(":16R:")) out.push({ label: l.slice(5).trim(), depth: Math.min(5, ++depth), line: n + 1 });
      else if (l.startsWith(":16S:")) depth = Math.max(0, depth - 1);
    }
    return out;
  }

  // [from, to, class] spans of one line, in order (pure): a field line → tag · qualifier · value; any other line → block markers.
  function spans(text) {
    const m = TAG.exec(text);
    if (!m) return [...text.matchAll(/\{[1-5S]:|-?\}/g)].map(x => [x.index, x.index + x[0].length, "sw-blk"]);
    const seq = m[1] === "16R" || m[1] === "16S", tagEnd = m[1].length + 2, out = [[0, tagEnd, seq ? "sw-seq" : "sw-tag"]];
    if (m[2]) out.push([tagEnd, m[0].length, "sw-q"]);
    if (text.length > m[0].length) out.push([m[0].length, text.length, seq ? "sw-seq" : "fx-v"]);
    return out;
  }

  function extension() {
    return ext ??= CM.view.hoverTooltip(async (view, pos) => {
      const g = Views.groups.find(x => x.view === view), doc = g && Docs.get(g.active);
      if (!doc || Docs.effectiveLang(doc) !== LANG) return null;
      const line = view.state.doc.lineAt(pos), m = TAG.exec(line.text.slice(0, 400)), b2 = /\{2:[IO](\d{3})/.exec(line.text.slice(0, 400));
      const at = m ? 0 : b2 ? b2.index : -1, end = m ? line.length : b2 ? b2.index + b2[0].length : -1;
      if (at < 0 || pos - line.from < at || pos - line.from > end) return null;
      let info;
      try { await VendorPaths.load("extras"); } catch (e) { info = { title: "SWIFT", rows: [["", T("Không nạp được từ điển SWIFT ({file}).", { file: e.message })]] }; }
      info ??= m ? SwiftDict.describe(m[1], m[2] || "", line.text.slice(m[0].length)) : SwiftDict.describeMt(b2[1]);
      return { pos: line.from + at, end: line.from + end, above: true, create: () => ({ dom: NumHover.render(info) }) };
    }, { hoverTime: 300 });
  }

  return { outline, spans, extension, LANG };
})();
