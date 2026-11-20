// XPath on XML / HTML with the browser's own engine (DOMParser + document.evaluate — no library, no eval); result elements are matched back to source offsets.
const XPathQuery = (() => {
  const ser = n => new XMLSerializer().serializeToString(n);
  const clip = (s, n = 1000) => s.length > n ? s.slice(0, n) + "…" : s;

  // XPath of a DOM node: /a/b[2]/@id, /a/text() — sibling indexes cached per parent (html: lower-case names).
  function pather(html) {
    const memo = new WeakMap(), name = n => n.nodeType === 1 ? (html ? n.localName : n.nodeName) : n.nodeType === 3 ? "text()" : n.nodeType === 8 ? "comment()" : "node()";
    function step(p, n) {
      if (!memo.has(p)) {
        const total = new Map(), seen = new Map(), m = new Map();
        for (const x of p.childNodes) total.set(name(x), (total.get(name(x)) || 0) + 1);
        for (const x of p.childNodes) { const k = (seen.get(name(x)) || 0) + 1; seen.set(name(x), k); m.set(x, name(x) + (total.get(name(x)) > 1 ? "[" + k + "]" : "")); }
        memo.set(p, m);
      }
      return memo.get(p).get(n);
    }
    const path = n => n.nodeType === 2 ? path(n.ownerElement) + "/@" + n.name : n.nodeType === 9 || !n.parentNode ? "" : path(n.parentNode) + "/" + step(n.parentNode, n);
    return path;
  }

  // The k-th <name> of the DOM = the k-th <name> of the tolerant markup tree (same document order) → its source offset.
  // HTML parsing can add / move elements (implied tbody, stray </p>): a pair counts only when its attributes agree — no line beats a wrong line.
  function offsets(doc, root, html) {
    const key = n => html ? n.localName.toLowerCase() : n.nodeName, byName = new Map(), at = new Map(), seen = new Map();
    (function walk(n) { for (const c of n.children || []) if (c.name) { const k = html ? c.name.toLowerCase() : c.name; if (!byName.has(k)) byName.set(k, []); byName.get(k).push(c); walk(c); } })(root);
    const same = (el, c) => el.attributes.length === c.attrs.length && (!c.attrs.length || (el.attributes[0].name === (html ? c.attrs[0].n.toLowerCase() : c.attrs[0].n) && el.attributes[0].value === (c.attrs[0].v ?? "")));
    for (const el of doc.getElementsByTagName("*")) { const k = key(el), i = seen.get(k) || 0; seen.set(k, i + 1); const c = (byName.get(k) || [])[i]; if (c && same(el, c)) at.set(el, c.at); }
    return at;
  }

  // → { results: [{ path, value, at? }], total, scalar }
  function run(text, expr, html, max = 5000) {
    const src = TextUtil.stripBom(text);
    const doc = new DOMParser().parseFromString(src, html ? "text/html" : "application/xml");
    if (!html && doc.getElementsByTagName("parsererror")[0]) {
      const e = MarkupTool.checkXml(src);
      throw Object.assign(new Error(T("XML lỗi — XPath cần XML hợp lệ: {msg}", { msg: e ? e.msg : "" })), { line: e && e.line, col: e && e.col });
    }
    let r;
    const ns = p => doc.documentElement && doc.documentElement.lookupNamespaceURI(p);
    try { r = doc.evaluate(expr, doc, ns, XPathResult.ANY_TYPE, null); }
    catch (e) { throw new Error(T("XPath lỗi: {msg}", { msg: e.message })); }
    const scalar = { 1: "numberValue", 2: "stringValue", 3: "booleanValue" }[r.resultType];
    if (scalar) return { results: [{ path: expr, value: String(r[scalar]) }], total: 1, scalar: true };
    const nodes = [];
    for (let n = r.iterateNext(); n; n = r.iterateNext()) nodes.push(n);
    const at = offsets(doc, MarkupTool.build(src, html).root, html), pathOf = pather(html);
    const results = nodes.slice(0, max).map(n => {
      const el = n.nodeType === 1 ? n : n.nodeType === 2 ? n.ownerElement : n.parentElement;
      return { path: pathOf(n), value: clip(n.nodeType === 1 ? (html ? n.outerHTML : ser(n)) : n.nodeType === 2 ? n.value : n.textContent), at: el ? at.get(el) : undefined };
    });
    return { results, total: nodes.length, scalar: false };
  }

  return { run };
})();
