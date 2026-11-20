// Markdown (CommonMark + GFM subset) → tree of whitelisted tags; raw HTML is shown as text, every block keeps its 1-based source line for scroll sync.
const MdRender = (() => {
  const TAGS = {
    h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], p: [], blockquote: [], ul: [], ol: ["start"], li: ["class"], pre: [], code: [], hr: [], br: [],
    table: [], thead: [], tbody: [], tr: [], th: ["align"], td: ["align"], a: ["href", "title"], img: ["src", "alt", "title"], em: [], strong: [], del: [],
    input: ["type", "checked", "disabled"],
  };
  const RE = {
    fence: /^ {0,3}(`{3,}|~{3,})(.*)$/, atx: /^ {0,3}(#{1,6})(?:[ \t]|$)/, hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
    quote: /^ {0,3}> ?(.*)$/, item: /^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$/, setext: /^ {0,3}(=+|-+)[ \t]*$/, indented: /^ {4}/,
    ref: /^ {0,3}\[([^\]]+)\]:[ \t]*<?([^\s>]+)>?(?:[ \t]+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?[ \t]*$/,
  };
  const blank = s => !s.trim();
  const indent = s => s.length - s.trimStart().length;
  const norm = s => s.trim().toLowerCase().replace(/\s+/g, " ");
  const MAX_DEPTH = 32;
  // Fence opener → { ch, info } (a backtick fence's info has no backtick); kept out of regexes so long lines stay linear.
  const fenceOf = s => { const m = RE.fence.exec(s); return m && !(m[1][0] === "`" && m[2].includes("`")) ? { ch: m[1], info: m[2].trim().split(/\s/)[0].toLowerCase() } : null; };
  function atxText(s, m) {
    const t = s.slice(m[0].length).trim();
    let j = t.length;
    while (j && t[j - 1] === "#") j--;
    return j === t.length ? t : !j || t[j - 1] === " " || t[j - 1] === "\t" ? t.slice(0, j).trim() : t;
  }

  // A line that ends a paragraph; inside a paragraph only a non-empty bullet or "1." starts a list.
  function startsBlock(s) {
    const m = RE.item.exec(s);
    return !!fenceOf(s) || RE.atx.test(s) || RE.hr.test(s) || RE.quote.test(s) || (!!m && m[4].trim() !== "" && (!/\d/.test(m[2]) || parseInt(m[2]) === 1));
  }

  const cells = s => s.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).map(c => c.trim());
  const isSep = s => /^[ \t|:-]+$/.test(s) && s.includes("-") && cells(s).every(c => /^:?-+:?$/.test(c));
  const align = c => c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : c.startsWith(":") ? "left" : "";

  function fence(L, i, f, opts) {
    const ch = f.ch, ind = indent(L[i].s), body = [], line = L[i].n;
    const closes = s => { const t = s.trim(); return indent(s) < 4 && t.length >= ch.length && t[0] === ch[0] && t === t[0].repeat(t.length); };
    for (i++; i < L.length && !closes(L[i].s); i++) body.push(L[i].s.slice(Math.min(ind, indent(L[i].s))));
    const code = body.join("\n"), engine = opts.diagram ? opts.diagram(f.info) : null;
    return { i: i + 1, node: engine ? { t: "diagram", engine, code, line } : { t: "pre", line, c: [{ t: "code", c: [code] }] } };
  }

  function list(L, i, refs, opts, depth) {
    const first = RE.item.exec(L[i].s), ordered = /\d/.test(first[2]), mark = first[2].slice(-1);
    const node = { t: ordered ? "ol" : "ul", c: [], line: L[i].n };
    if (ordered && parseInt(first[2]) !== 1) node.a = { start: String(parseInt(first[2])) };
    let loose = false;
    while (i < L.length) {
      const m = RE.item.exec(L[i].s);
      if (!m || /\d/.test(m[2]) !== ordered || m[2].slice(-1) !== mark || RE.hr.test(L[i].s)) break;
      const pad = m[1].length + m[2].length + (m[4] ? Math.min(m[3].length, 4) : 1), sub = [{ s: m[4], n: L[i].n }];
      for (i++; i < L.length; i++) {
        const s = L[i].s;
        if (blank(s)) sub.push({ s: "", n: L[i].n });
        else if (indent(s) >= pad) sub.push({ s: s.slice(pad), n: L[i].n });
        else if (!blank(sub[sub.length - 1].s) && !startsBlock(s) && !RE.item.test(s)) sub.push({ s: s.trim(), n: L[i].n });
        else break;
      }
      let gap = false;
      while (sub.length > 1 && blank(sub[sub.length - 1].s)) { sub.pop(); gap = true; }
      if (sub.some((x, k) => k && blank(x.s)) || (gap && i < L.length && RE.item.test(L[i].s))) loose = true;
      const li = { t: "li", line: sub[0].n, c: null }, task = /^\[([ xX])\][ \t]+/.exec(sub[0].s);
      if (task) { sub[0] = { s: sub[0].s.slice(task[0].length), n: sub[0].n }; li.a = { class: "task" }; li.task = task[1] !== " "; }
      li.c = blocks(sub, refs, opts, depth + 1);
      node.c.push(li);
    }
    node.loose = loose;
    return { i, node };
  }

  function table(L, i) {
    const head = cells(L[i].s), aligns = cells(L[i + 1].s).map(align);
    if (head.length !== aligns.length) return null;
    const row = (cs, tag, n) => ({ t: "tr", line: n, c: aligns.map((al, k) => ({ t: tag, a: al ? { align: al } : undefined, raw: cs[k] ?? "" })) });
    const node = { t: "table", line: L[i].n, c: [{ t: "thead", c: [row(head, "th", L[i].n)] }, { t: "tbody", c: [] }] };
    for (i += 2; i < L.length && !blank(L[i].s) && L[i].s.includes("|") && !startsBlock(L[i].s); i++) node.c[1].c.push(row(cells(L[i].s), "td", L[i].n));
    if (!node.c[1].c.length) node.c.pop();
    return { i, node };
  }

  function blocks(L, refs, opts, depth = 0) {
    if (depth > MAX_DEPTH) return L.length ? [{ t: "p", raw: L.map(x => x.s).join("\n").trim(), line: L[0].n }] : [];
    const out = [];
    for (let i = 0; i < L.length;) {
      const { s, n } = L[i];
      let m, r;
      if (blank(s)) { i++; continue; }
      if ((m = fenceOf(s))) { ({ i, node: r } = fence(L, i, m, opts)); out.push(r); continue; }
      if ((m = RE.atx.exec(s))) { out.push({ t: "h" + m[1].length, raw: atxText(s, m), line: n }); i++; continue; }
      if (RE.hr.test(s)) { out.push({ t: "hr", line: n }); i++; continue; }
      if (RE.quote.test(s)) {
        const sub = [];
        for (; i < L.length && !blank(L[i].s) && (RE.quote.test(L[i].s) || (sub.length && !blank(sub[sub.length - 1].s) && !startsBlock(L[i].s))); i++) {
          const q = RE.quote.exec(L[i].s);
          sub.push({ s: q ? q[1] : L[i].s, n: L[i].n });
        }
        out.push({ t: "blockquote", line: n, c: blocks(sub, refs, opts, depth + 1) }); continue;
      }
      if (RE.item.test(s)) { ({ i, node: r } = list(L, i, refs, opts, depth)); out.push(r); continue; }
      if (RE.indented.test(s)) {
        const body = [];
        for (; i < L.length && (blank(L[i].s) || RE.indented.test(L[i].s)); i++) body.push(L[i].s.slice(4));
        while (body.length && blank(body[body.length - 1])) body.pop();
        out.push({ t: "pre", line: n, c: [{ t: "code", c: [body.join("\n")] }] }); continue;
      }
      if ((m = RE.ref.exec(s))) { const k = norm(m[1]); if (!Object.hasOwn(refs, k)) refs[k] = { href: m[2], title: m[3] ?? m[4] ?? m[5] }; i++; continue; }
      if (s.includes("|") && i + 1 < L.length && isSep(L[i + 1].s) && (r = table(L, i))) { i = r.i; out.push(r.node); continue; }
      const para = [s.trimStart()];
      let head = null;
      for (i++; i < L.length && !blank(L[i].s); i++) {
        const sx = RE.setext.exec(L[i].s);
        if (sx) { head = sx[1][0] === "=" ? "h1" : "h2"; i++; break; }
        if (startsBlock(L[i].s)) break;
        para.push(L[i].s.trimStart());
      }
      out.push({ t: head || "p", raw: para.join("\n").trimEnd(), line: n });
    }
    return out;
  }

  // raw → inline children, tight list items lose their <p>, headings get a unique data-slug for #links.
  function finish(nodes, refs, slugs, tight = false) {
    const out = [];
    for (const n of nodes) {
      if (n.raw !== undefined) { n.c = MdInline.parse(n.raw, refs); delete n.raw; }
      else if (n.c && n.t !== "pre" && n.t !== "code") n.c = finish(n.c, refs, slugs, n.t === "ul" || n.t === "ol" ? n.loose === false : n.t === "li" && tight);
      if (n.t === "li" && n.task !== undefined) { n.c.unshift({ t: "input", a: { type: "checkbox", disabled: "", ...(n.task ? { checked: "" } : {}) } }, " "); delete n.task; }
      delete n.loose;
      if (/^h[1-6]$/.test(n.t)) {
        const base = MdInline.text(n.c).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-") || "section";
        let slug = base, k = 0;
        while (slugs.has(slug)) slug = base + "-" + ++k;
        slugs.add(slug);
        n.slug = slug;
      }
      if (tight && n.t === "p") out.push(...n.c); else out.push(n);
    }
    return out;
  }

  // opts.diagram(info) → engine id for fenced diagram blocks (e.g. ```mermaid), else a code block.
  function parse(text, opts = {}) {
    const L = String(text).replace(/\r\n?/g, "\n").split("\n").map((s, k) => ({ s: s.replace(/^\t+/, t => "    ".repeat(t.length)), n: k + 1 }));
    const refs = {};
    return finish(blocks(L, refs, opts), refs, new Set());
  }

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // Serialised form for tests; the page builds DOM nodes from the same tree.
  function toHtml(nodes) {
    return nodes.map(n => {
      if (typeof n === "string") return esc(n);
      if (n.t === "diagram") return `<figure data-engine="${esc(n.engine)}">${esc(n.code)}</figure>`;
      if (!Object.hasOwn(TAGS, n.t)) return "";
      const attrs = Object.entries(n.a || {}).filter(([k]) => TAGS[n.t].includes(k)).map(([k, v]) => v === "" ? ` ${k}` : ` ${k}="${esc(v)}"`).join("");
      return n.t === "hr" || n.t === "br" || n.t === "img" || n.t === "input" ? `<${n.t}${attrs}>` : `<${n.t}${attrs}>${toHtml(n.c || [])}</${n.t}>`;
    }).join("");
  }

  return { parse, toHtml, TAGS };
})();
