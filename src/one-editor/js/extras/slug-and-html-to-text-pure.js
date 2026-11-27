// Slug (accents dropped, đ → d, other characters → "-") and HTML → plain text over a parsed DOM (block → new line, li → "- ", table → TSV). Pure: the caller parses with DOMParser.
const Slug = (() => {
  const MARKS = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");
  function make(s, keepCase = false) {
    const t = s.normalize("NFD").replace(MARKS, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return keepCase ? t : t.toLowerCase();
  }
  // One slug per line (empty lines kept).
  const lines = (text, keepCase) => text.split("\n").map(l => l.trim() ? make(l, keepCase) : l.replace(/\r$/, "")).join("\n");
  return { make, lines };
})();

const HtmlText = (() => {
  const BLOCK = new Set(["ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "UL", "DETAILS", "SUMMARY", "CAPTION"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "IFRAME", "OBJECT", "SVG", "CANVAS"]);
  const cellText = el => el.textContent.replace(/\s+/g, " ").trim();

  // node: a DOM Node (Document / Element / Text); → plain text with at most one blank line in a row.
  function convert(node) {
    const out = [];
    let pre = 0;
    const nl = (n = 1) => { out.push({ nl: n }); };
    function walk(n) {
      if (n.nodeType === 3) { out.push(pre ? { pre: n.data } : n.data.replace(/\s+/g, " ")); return; }
      if (n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11) return;
      const tag = n.nodeName ? n.nodeName.toUpperCase() : "";
      if (SKIP.has(tag)) return;
      if (tag === "BR") { nl(); return; }
      if (tag === "TABLE") { nl(2); table(n); nl(2); return; }
      if (tag === "LI") { nl(); out.push("- "); kids(n); nl(); return; }
      const block = BLOCK.has(tag);
      if (block) nl(/^H\d$|^P$|^PRE$|^BLOCKQUOTE$|^HR$/.test(tag) ? 2 : 1);
      if (tag === "PRE") pre++;
      kids(n);
      if (tag === "PRE") pre--;
      if (block) nl(/^H\d$|^P$|^PRE$|^BLOCKQUOTE$/.test(tag) ? 2 : 1);
    }
    const kids = n => { for (const c of n.childNodes) walk(c); };
    function table(t) {
      const rows = [];
      (function find(n) { for (const c of n.childNodes) { if (c.nodeType !== 1) continue; const g = c.nodeName.toUpperCase(); if (g === "TR") rows.push(c); else if (g !== "TABLE") find(c); } })(t);
      rows.forEach((r, i) => { if (i) nl(); out.push([...r.childNodes].filter(c => c.nodeType === 1 && /^T[DH]$/i.test(c.nodeName)).map(cellText).join("\t")); });
    }
    walk(node);
    // Line breaks collapse: spaces around a break vanish, never more than one blank line.
    let s = "", want = 0;
    for (const x of out) {
      if (x.nl) { want = Math.max(want, x.nl); continue; }
      const raw = typeof x === "string" ? x : x.pre;
      if (!raw) continue;
      // Whitespace between blocks (source indentation / new lines) is not text.
      if (typeof x === "string" && !raw.trim() && (want || !s || s.endsWith("\n"))) continue;
      if (want && s) s = s.replace(/[ \t]+$/, "") + "\n".repeat(want);
      want = 0;
      s += typeof x === "string" && (!s || s.endsWith("\n")) ? raw.replace(/^ +/, "") : raw;
    }
    s = s.replace(/^\n+|\s+$/g, "");
    return s ? s + "\n" : "";
  }

  return { convert };
})();
