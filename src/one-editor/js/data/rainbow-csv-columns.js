// Rainbow CSV: every column of a CSV / TSV tab in its own colour (visible lines only), align / shrink columns, and open the tab in Data Workbench's grid via a #pako: link.
const RainbowCsv = (() => {
  const COLORS = 8, LONG = 20000;
  let plugin = null, marks = null;

  // Fields of one line; a quote opens only at the start of a field (RFC 4180) → { spans: [[from, to], …], open: still inside quotes at the end }.
  function scan(line, delim, inQ = false) {
    const spans = [];
    let start = 0, q = inQ;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') i++; else q = false; } }
      else if (c === '"' && !line.slice(start, i).trim()) q = true;
      else if (c === delim) { spans.push([start, i]); start = i + 1; }
    }
    spans.push([start, line.length]);
    return { spans, open: q };
  }
  const fields = (line, delim) => scan(line, delim).spans;

  const delimOf = (text, lang) => lang === "TSV" ? "\t" : CsvTool.sniff(text);

  // Lines of a record whose quoted cell spans several lines are kept exactly as they are.
  function rows(text, delim) {
    let open = false;
    return text.split("\n").map(l => {
      const cr = l.endsWith("\r"), s = cr ? l.slice(0, -1) : l, was = open, r = scan(s, delim, open);
      open = r.open;
      return { cr, raw: s, keep: was || r.open, cells: r.spans.map(([a, b]) => s.slice(a, b).trim()) };
    });
  }

  // Pads every field but the last to its column width (Rainbow CSV "Align"); shrink trims the spaces around fields again.
  function align(text, delim) {
    const rs = rows(text, delim), width = [];
    rs.forEach(r => { if (!r.keep) r.cells.forEach((c, k) => { width[k] = Math.max(width[k] || 0, [...c].length); }); });
    return rs.map(r => (r.keep ? r.raw : r.cells.length < 2 && !r.cells[0] ? "" : r.cells.map((c, k) => k < r.cells.length - 1 ? c + " ".repeat(width[k] - [...c].length) : c).join(delim)) + (r.cr ? "\r" : "")).join("\n");
  }
  const shrink = (text, delim) => rows(text, delim).map(r => (r.keep ? r.raw : r.cells.join(delim)) + (r.cr ? "\r" : "")).join("\n");

  const langOf = view => { const g = Views.groups.find(x => x.view === view), d = g && Docs.get(g.active); return d && !PreviewPane.isPane(d) ? Docs.effectiveLang(d) : ""; };

  function build(view) {
    const lang = langOf(view), D = CM.view.Decoration;
    if (lang !== "CSV" && lang !== "TSV") return D.none;
    marks ??= Array.from({ length: COLORS }, (x, k) => D.mark({ class: "rb" + k }));
    const st = view.state, delim = delimOf(st.doc.sliceString(0, 8000), lang), b = new CM.state.RangeSetBuilder();
    for (const { from, to } of view.visibleRanges) {
      for (let pos = from; pos <= to;) {
        const line = st.doc.lineAt(pos);
        if (line.length <= LONG) fields(line.text, delim).forEach(([x, y], k) => { if (y > x) b.add(line.from + x, line.from + y, marks[k % COLORS]); });
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

  // Data Workbench reads { tab: "csv", text } from the #pako: hash (its own share format).
  async function openInWorkbench(doc) {
    const url = new URL("data-workbench.html", location.href);
    url.search = "?tab=csv";
    url.hash = await ShareCodec.encode({ tab: "csv", text: Docs.text(doc) });
    if (url.href.length > 2e6) { StatusBar.msg(T("CSV quá lớn để mở qua link (> 2 MB sau khi nén) — lưu file rồi mở trong Data Workbench."), "warn"); return; }
    window.open(url.href, "_blank", "noopener");
    StatusBar.msg(T("Đã mở “{name}” trong bảng CSV của Data Workbench (tab mới; dữ liệu nằm sau dấu #, không gửi đi đâu).", { name: doc.name }), "good");
  }

  return { fields, align, shrink, delimOf, extension, openInWorkbench };
})();
