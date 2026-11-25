// Sticky scroll (VS Code style): the opening lines of the blocks around the top of the view stay pinned there (≤ 5), click jumps; Markdown by heading level, code by syntax tree, else by indentation.
const Sticky = (() => {
  const MAX = 5, MAX_DOC = 1 << 20, BACK = 3000;
  const on = () => Prefs.get("sticky", true) !== false;
  const indentOf = s => { const m = /^[ \t]*/.exec(s)[0]; let n = 0; for (const c of m) n += c === "\t" ? 4 : 1; return n; };

  // Pure: lineText(n) → string; the lines above `top` with less indentation than everything below them (blank lines skipped).
  function byIndent(lineText, top) {
    const out = [];
    let need = indentOf(lineText(top));
    if (!lineText(top).trim()) return out;
    for (let n = top - 1; n >= 1 && n > top - BACK && need > 0 && out.length < MAX; n--) {
      const s = lineText(n);
      if (!s.trim()) continue;
      const k = indentOf(s);
      if (k < need) { out.unshift(n); need = k; }
    }
    return out;
  }

  // Pure: headings [{ line, level }] in order → the heading chain above `top`.
  function byHeading(heads, top) {
    const chain = [];
    for (const h of heads) {
      if (h.line >= top) break;
      while (chain.length && chain[chain.length - 1].level >= h.level) chain.pop();
      chain.push(h);
    }
    return chain.slice(-MAX).map(h => h.line);
  }

  const cache = new WeakMap();
  function headings(state) {
    const tree = CM.language.syntaxTree(state), hit = cache.get(state.doc);
    if (hit && hit.tree === tree) return hit.list;
    const list = [];
    for (let c = tree.topNode.firstChild; c; c = c.nextSibling) {
      const m = /^(?:ATX|Setext)Heading(\d)$/.exec(c.name);
      if (m) list.push({ line: state.doc.lineAt(c.from).number, level: +m[1] });
    }
    cache.set(state.doc, { tree, list });
    return list;
  }

  // Nodes that start above the top line and still cover it, one per start line.
  function byTree(state, top) {
    const tree = CM.language.syntaxTree(state), at = state.doc.line(top), lines = [];
    for (let n = tree.resolveInner(at.from + /^\s*/.exec(at.text)[0].length, 1); n && n.parent; n = n.parent) {
      const a = state.doc.lineAt(n.from).number;
      if (a < top && state.doc.lineAt(n.to).number >= top && lines[0] !== a) lines.unshift(a);
    }
    return lines.slice(-MAX);
  }

  function chain(state, lang, top) {
    if (top <= 1) return [];
    if (lang === "Markdown") return byHeading(headings(state), top);
    if (CM.language.syntaxTree(state).length) return byTree(state, top);
    return lang === "Plain Text" ? [] : byIndent(n => state.doc.line(n).text, top);
  }

  const docOf = view => { const g = Views.groups.find(x => x.view === view); return g && Docs.get(g.active); };
  const usable = (view, d) => on() && innerWidth > 640 && d && !d.big && !d.hex && view.state.doc.length <= MAX_DOC;

  const plugin = () => CM.view.ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view; this.raf = 0; this.key = "";
      this.dom = document.createElement("div");
      this.dom.className = "oe-sticky";
      this.dom.hidden = true;
      this.dom.addEventListener("mousedown", e => e.preventDefault());
      // The bar sits outside the scroller: the wheel over it still scrolls the editor.
      this.dom.addEventListener("wheel", e => { view.scrollDOM.scrollBy(e.deltaX, e.deltaY); e.preventDefault(); }, { passive: false });
      view.dom.append(this.dom);
      this.onScroll = () => this.schedule();
      view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true });
      this.schedule();
    }
    update(u) { if (u.docChanged || u.geometryChanged || u.viewportChanged || u.transactions.some(t => t.effects.length)) { this.key = ""; this.schedule(); } }
    schedule() { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); }); }
    draw() {
      const v = this.view, d = docOf(v);
      if (!usable(v, d)) { this.dom.hidden = true; this.key = ""; return; }
      const lh = v.defaultLineHeight, topPx = v.scrollDOM.getBoundingClientRect().top - v.documentTop;
      const lineAt = y => v.state.doc.lineAt(v.lineBlockAtHeight(Math.max(0, y)).from).number;
      const lang = Docs.effectiveLang(d);
      let lines = chain(v.state, lang, lineAt(topPx));
      // The pinned rows hide lines under them: the chain is that of the first line still visible.
      if (lines.length) lines = chain(v.state, lang, lineAt(topPx + lines.length * lh));
      const key = lines.join(",") + "|" + v.state.doc.length;
      if (key === this.key) return;
      this.key = key;
      this.dom.hidden = !lines.length;
      if (!lines.length) return;
      const gut = v.dom.querySelector(".cm-gutters")?.offsetWidth || 0;
      this.dom.style.top = v.scrollDOM.offsetTop + "px";
      this.dom.style.setProperty("--sticky-gut", gut + "px");
      this.dom.replaceChildren(...lines.map(n => {
        const line = v.state.doc.line(n), row = document.createElement("div");
        row.className = "oe-sticky-row";
        row.style.height = lh + "px";
        const num = document.createElement("span"), txt = document.createElement("span");
        num.className = "oe-sticky-num"; num.textContent = n;
        txt.className = "oe-sticky-txt"; txt.textContent = line.text.slice(0, 400);
        row.append(num, txt);
        row.title = T("Tới dòng {n}", { n });
        row.onclick = () => { v.dispatch({ selection: { anchor: line.from }, effects: CM.view.EditorView.scrollIntoView(line.from, { y: "start" }) }); v.focus(); };
        return row;
      }));
    }
    destroy() { cancelAnimationFrame(this.raf); this.view.scrollDOM.removeEventListener("scroll", this.onScroll); this.dom.remove(); }
  });

  let ext = null;
  const extension = () => ext ??= plugin();

  return { extension, byIndent, byHeading, on, MAX };
})();
