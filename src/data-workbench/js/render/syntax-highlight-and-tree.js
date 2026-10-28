// Syntax highlighting (output panes) and collapsible tree view for JSON AST / markup tree.
const ViewRender = (() => {
  const esc = s => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const span = (c, t) => `<span class="${c}">${esc(t)}</span>`;

  function json(code) {
    return code.replace(/("(?:\\.|[^"\\])*")(\s*:)?|(-?\d[\d.eE+\-]*)|\b(true|false|null)\b|([{}\[\],])|([^"\d{}\[\],tfn-]+|.)/g,
      (m, str, colon, num, lit, punc) =>
        str ? span(colon ? "k" : "s", str) + (colon ? esc(colon) : "") : num ? span("n", num) : lit ? span("l", lit) : punc ? span("p", punc) : esc(m));
  }

  function attrs(a) {
    return a.replace(/([^\s=]+)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s"']+)?|(\s+)/g, (m, n, eq, v, w) =>
      w ? w : span("an", n) + (eq ? esc(eq) : "") + (v ? span("av", v) : ""));
  }
  function markup(code) {
    return code.replace(/(<!--[\s\S]*?-->)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<[?!][\s\S]*?>)|(<\/?)([^\s>\/]+)([^>]*?)(\/?>)|([^<]+|<)/g,
      (m, com, cdata, decl, open, name, at, close) =>
        com ? span("c", com) : cdata ? span("cd", cdata) : decl ? span("d", decl)
          : open ? span("t", open) + span("tn", name) + attrs(at) + span("t", close) : esc(m));
  }

  const highlight = (code, kind) => code.length > 1500000 ? esc(code)
    : kind === "json" ? json(code) : kind === "xml" || kind === "html" ? markup(code) : esc(code);

  function tree(model, kind, limit = 4000) {
    let count = 0;
    const more = () => `<div class="muted">… còn nữa (cây chỉ hiển thị ${limit} nút đầu tiên)</div>`;
    const leaf = (k, v, cls) => `<div class="leaf">${k}${span(cls, v)}</div>`;
    function jnode(n, key) {
      if (++count > limit) return count === limit + 1 ? more() : "";
      const k = key === undefined ? "" : `${span("k", key)}: `;
      if (n.t === "str") return leaf(k, JSON.stringify(n.v), "s");
      if (n.t === "num") return leaf(k, n.raw, "n");
      if (n.t === "lit") return leaf(k, n.v, "l");
      const sum = n.t === "obj" ? `{ ${n.items.length} khóa }` : `[ ${n.items.length} phần tử ]`;
      const inner = n.items.map((it, i) => n.t === "obj" ? jnode(it.v, JSON.stringify(it.k)) : jnode(it, String(i))).join("");
      return `<details ${count < 60 ? "open" : ""}><summary>${k}<span class="muted">${sum}</span></summary>${inner}</details>`;
    }
    function mnode(n) {
      if (++count > limit) return count === limit + 1 ? more() : "";
      if (n.text !== undefined) return n.text.trim() ? leaf("", n.text.trim().slice(0, 300), "s") : "";
      if (n.comment) return leaf("", n.comment.slice(0, 200), "c");
      if (n.cdata || n.pi || n.doctype) return leaf("", (n.cdata || n.pi || n.doctype).slice(0, 200), "d");
      const at = n.attrs.map(a => ` ${span("an", a.n)}${a.v === null ? "" : "=" + span("av", '"' + a.v + '"')}`).join("");
      const kids = n.raw !== undefined ? (n.raw.trim() ? leaf("", n.raw.trim().slice(0, 300), "s") : "") : n.children.map(mnode).join("");
      const head = `${span("t", "<")}${span("tn", n.name)}${at}${span("t", ">")}`;
      return kids ? `<details ${count < 80 ? "open" : ""}><summary>${head}</summary>${kids}</details>` : `<div class="leaf">${head}</div>`;
    }
    return kind === "json" ? jnode(model) : model.children.map(mnode).join("");
  }

  return { highlight, tree, esc };
})();
