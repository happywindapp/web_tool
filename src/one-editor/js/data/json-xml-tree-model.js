// Tree model for the "tree" op: tolerant JSON AST / markup tree with source offsets, line lookup, paths (JSONPath / XPath) and a flat "path = value" text (greppable).
const DataTree = (() => {
  const MAX_LINES = 50000;
  const isMarkup = lang => lang === "XML" || lang === "HTML" || lang === "SVG";

  // Line starts once per text → line of an offset by binary search.
  function lineIndex(text) {
    const starts = [0];
    for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
    return at => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= at) lo = m; else hi = m - 1; } return lo + 1; };
  }

  // Markup children worth showing: elements + non-empty text / comments / CDATA.
  const mkids = n => (n.children || []).filter(c => c.name || (c.text !== undefined ? c.text.trim() : c.comment || c.cdata));
  // XPath step of child c inside parent p: name, with [k] only when the name repeats (indexes computed once per parent).
  const steps = new WeakMap();
  function xstep(p, c) {
    if (!steps.has(p)) {
      const total = new Map(), seen = new Map(), m = new Map();
      for (const x of p.children || []) if (x.name) total.set(x.name, (total.get(x.name) || 0) + 1);
      for (const x of p.children || []) if (x.name) { const k = (seen.get(x.name) || 0) + 1; seen.set(x.name, k); m.set(x, x.name + (total.get(x.name) > 1 ? "[" + k + "]" : "")); }
      steps.set(p, m);
    }
    return steps.get(p).get(c);
  }

  function jsonLines(ast) {
    const out = [];
    (function walk(n, path) {
      if (out.length > MAX_LINES) return;
      const p = JsonPath.pathText(path);
      if (n.t === "obj" || n.t === "arr") {
        out.push(p + " = " + (n.t === "obj" ? "{}" : "[]"));
        JsonPath.kids(n).forEach(([k, v]) => walk(v, [...path, k]));
      } else out.push(p + " = " + (n.t === "str" ? JSON.stringify(n.v) : n.t === "num" ? n.raw : n.v));
    })(ast, []);
    return out;
  }

  function markupLines(root) {
    const out = [];
    (function walk(n, path) {
      for (const c of mkids(n)) {
        if (out.length > MAX_LINES) return;
        if (!c.name) { if (c.text !== undefined) out.push(path + "/text() = " + JSON.stringify(c.text.trim())); continue; }
        const p = path + "/" + xstep(n, c);
        out.push(p);
        for (const a of c.attrs) out.push(p + "/@" + a.n + " = " + JSON.stringify(a.v ?? ""));
        if (c.raw !== undefined && c.raw.trim()) out.push(p + "/text() = " + JSON.stringify(c.raw.trim()));
        else walk(c, p);
      }
    })(root, "");
    return out;
  }

  // text + effective language → { fmt, root, fixes, text (path = value lines), notes }.
  function build(text, lang) {
    if (!text.trim()) return { fmt: "", root: null, fixes: [], text: "", notes: [] };
    let fmt = isMarkup(lang) ? (lang === "HTML" ? "html" : "xml") : lang === "JSON" ? "json" : "";
    if (!fmt && lang !== "Plain Text") throw new Error(T("Cây / truy vấn chỉ dùng cho JSON, XML, HTML (tab này là {lang}).", { lang }));
    if (!fmt) { const t = text.trimStart(); fmt = t[0] === "<" ? (Detect.markup(t) === "html" ? "html" : "xml") : "json"; }
    const r = fmt === "json" ? JsonTool.parse(text) : MarkupTool.build(text, fmt === "html");
    const root = fmt === "json" ? r.ast : r.root, lines = fmt === "json" ? jsonLines(root) : markupLines(root), notes = [];
    if (lines.length > MAX_LINES) notes.push(T("Văn bản đường dẫn chỉ có {n} dòng đầu.", { n: I18n.num(MAX_LINES) }));
    return { fmt, root, fixes: r.fixes, text: lines.slice(0, MAX_LINES).join("\n") + "\n", notes };
  }

  return { build, lineIndex, mkids, xstep, isMarkup };
})();
