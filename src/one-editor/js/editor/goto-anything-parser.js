// Goto Anything (Sublime Ctrl+P): "file@symbol", "file:line", "#word" (word in the active tab) — parse the query, list the matches. Plain file queries stay Quick Open.
const GotoAnything = (() => {
  // → { file, sym } | { file, line } | { word } | null (plain Quick Open)
  function parse(q) {
    const s = String(q);
    if (s.startsWith("#")) return { word: s.slice(1) };
    const at = s.lastIndexOf("@");
    if (at > 0) return { file: s.slice(0, at), sym: s.slice(at + 1) };
    const m = /^(.+?):(\d*)$/.exec(s);
    if (m) return { file: m[1], line: m[2] ? +m[2] : 0 };
    return null;
  }

  // Lines of text holding word (case-insensitive) → [{ line, col, text }] (≤ max).
  function occurrences(text, word, max = 300) {
    const out = [], w = word.toLowerCase();
    if (!w) return out;
    text.split("\n").some((l, i) => { const c = l.toLowerCase().indexOf(w); if (c >= 0) out.push({ line: i + 1, col: c + 1, text: l.trim().slice(0, 160) }); return out.length >= max; });
    return out;
  }

  // Open tabs + notes, best fuzzy match of the file part first.
  function bestDoc(file) {
    const seen = new Set(), docs = [];
    for (const g of Views.groups) for (const id of g.tabs) { const d = Docs.get(id); if (d && !seen.has(d.id) && !PreviewPane.isPane(d)) { seen.add(d.id); docs.push(d); } }
    for (const d of Docs.notes()) if (!seen.has(d.id)) docs.push(d);
    return Fuzzy.filter(file, docs, d => d.name)[0] || null;
  }

  const stateOf = d => d.state || CM.state.EditorState.create({ doc: Docs.text(d) });
  const reveal = (d, line) => { Views.open(d, Views.where(d.id) >= 0 ? Views.where(d.id) : Views.focused); Views.revealLine(d, line); };

  // Quick Pick items for a parsed query (null = not a Goto Anything query).
  function items(q) {
    const p = parse(q);
    if (!p) return null;
    if (p.word !== undefined) {
      const d = Views.activeDoc();
      if (!d || !p.word) return [{ label: T("Gõ từ cần tìm trong tab sau dấu #"), detail: "", run: () => {} }];
      return occurrences(Docs.text(d), p.word).map(o => ({ label: o.text || " ", detail: T("dòng {n}", { n: o.line }), run: () => reveal(d, o.line) }));
    }
    const d = bestDoc(p.file);
    if (!d) return [];
    if (p.sym !== undefined) return Fuzzy.filter(p.sym, Symbols.list(stateOf(d)).map(s => ({ label: s.label, detail: d.name + " · " + T("dòng {n}", { n: s.line }), run: () => reveal(d, s.line) })));
    return [{ label: T("{name} — tới dòng {n}", { name: d.name, n: p.line || 1 }), detail: "", run: () => reveal(d, p.line || 1) }];
  }

  return { parse, occurrences, items };
})();
