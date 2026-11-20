// Bilingual translate view: each source block / line with its translation (🌐) right under it, paired by Markdown source line so a web page keeps its structure.
const TrBilingual = (() => {
  const SOLO = new Set(["pre", "hr", "diagram"]), NBSP = String.fromCharCode(160);
  const mk = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text !== undefined ? { textContent: text } : {});
  const textOf = n => typeof n === "string" ? n : n.t === "img" ? n.a?.alt || "" : (n.c || []).map(textOf).join("");
  const same = (a, b) => !b || textOf(a).trim() === textOf(b).trim();

  function bi(nodes) {
    const row = mk("div", "tr-bi"), body = mk("div", "tr-bi-body");
    row.append(mk("span", "tr-bi-ic", "🌐"), body);
    body.append(...nodes);
    return row;
  }

  // List items get their translation inside the item, quotes pair paragraph by paragraph, code and rules show once.
  function blocks(src, tr) {
    const byLine = new Map(tr.map(n => [n.line, n])), out = [];
    for (const n of src) {
      const t = n.line ? byLine.get(n.line) : undefined;
      if (SOLO.has(n.t) || same(n, t)) out.push(PvMarkdown.build(n));
      else if (n.t === "ul" || n.t === "ol" || n.t === "blockquote") { const el = PvMarkdown.build({ ...n, c: [] }); el.append(...blocks(n.c || [], t.c || [])); out.push(el); }
      else if (n.t === "li") { const li = PvMarkdown.build(n); li.append(bi((t.c || []).map(k => PvMarkdown.build(k)))); out.push(li); }
      else out.push(PvMarkdown.build(n), bi([PvMarkdown.build(t)]));
    }
    return out;
  }

  // Plain text: line by line; null when the line counts differ (then only the translation shows).
  function lines(src, tr) {
    const a = String(src).split(/\r?\n/), b = String(tr).split(/\r?\n/);
    if (a.length !== b.length) return null;
    const out = [];
    a.forEach((s, i) => {
      out.push(mk("div", "tr-bi-src", s || NBSP));
      if (s.trim() && s.trim() !== b[i].trim()) out.push(bi([document.createTextNode(b[i])]));
    });
    return out;
  }

  // Readable text of a Markdown page (no URLs, no code) for read-aloud.
  const plain = md => MdRender.parse(md).filter(n => !SOLO.has(n.t)).map(textOf).join("\n");

  return { blocks: (src, tr) => blocks(MdRender.parse(src), MdRender.parse(tr)), lines, plain };
})();
