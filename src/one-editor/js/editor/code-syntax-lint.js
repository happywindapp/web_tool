// Code syntax check per language (engine picked here, SyntaxEngines does the work): feeds the lint-while-typing (off above 256 KB) and the "syntax-check" ▶ op.
const CodeLint = (() => {
  // Prettier's TypeScript parser grows faster than linear (200 KB ≈ 0.6 s): bigger TS falls back to Lezer.
  const LIVE_MAX = 256 * 1024, BIG = 100 * 1024, E = SyntaxEngines;
  const tree = key => ({ name: "tree-sitter", run: t => E.treeSitter(t, key) });
  const lez = { name: "Lezer", run: (t, lang) => E.lezerByLang(t, lang) };
  const pret = (name, big) => ({ name, big, run: (t, lang) => E.prettier(t, lang) });
  const ENGINE = {
    Go: tree("go"), Java: tree("java"), Python: tree("python"),
    JavaScript: pret("Prettier · Babel"), JSX: pret("Prettier · Babel"), TypeScript: pret("Prettier · TypeScript", lez), TSX: pret("Prettier · TypeScript", lez),
    "C++": lez, C: lez, Rust: lez, PHP: lez,
    SQL: { get name() { return E.sqlDb() ? "node-sql-parser · " + Formatter.SQL_DIALECTS[E.sqlDb()] : "Lezer"; }, run: (t, lang) => E.sqlDb() ? E.sql(t, E.sqlDb()) : E.lezerByLang(t, lang) },
  };
  const LANGS = new Set(Object.keys(ENGINE));
  const warned = new Set();

  function toRange(text, x, starts) {
    if (x.from !== undefined) return { from: Math.min(x.from, text.length), to: Math.min(Math.max(x.to, x.from), text.length) };
    const ln = Math.min(Math.max(x.line || 1, 1), starts.length), lineEnd = ln < starts.length ? starts[ln] - 1 : text.length;
    const from = Math.min(starts[ln - 1] + Math.max((x.col || 1) - 1, 0), lineEnd);
    return { from, to: from };
  }

  // text + language → { engine, items: [{ from, to, line, col, msg, sev }] } sorted by position; one underline never runs past its line.
  async function check(text, lang) {
    const engine = ENGINE[lang]?.big && text.length > BIG ? ENGINE[lang].big : ENGINE[lang];
    if (!engine) throw new Error(T("Chưa kiểm cú pháp được {lang} — hỗ trợ: {list}.", { lang, list: [...LANGS].join(", ") }));
    if (!text.trim()) return { engine: engine.name, items: [] };
    const starts = [0];
    for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
    const lineOf = pos => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; };
    const items = (await engine.run(text, lang)).map(x => {
      const r = toRange(text, x, starts), i = lineOf(r.from), lineEnd = i + 1 < starts.length ? starts[i + 1] - 1 : text.length;
      return { from: r.from, to: Math.max(Math.min(r.to, lineEnd), Math.min(r.from + 1, lineEnd)), line: i + 1, col: r.from - starts[i] + 1, msg: x.msg, sev: x.sev };
    });
    return { engine: engine.name, items: items.sort((a, b) => a.from - b.from) };
  }

  // CM lint source for one code tab; a missing parser bundle is reported once, then the tab just has no marks.
  async function diagnostics(st, doc, lang) {
    if (st.doc.length > LIVE_MAX) {
      if (!warned.has(doc.id)) { warned.add(doc.id); StatusBar.msg(T("“{name}” lớn hơn 256 KB — không kiểm cú pháp khi gõ; dùng ▶ Kiểm cú pháp.", { name: doc.name }), "warn"); }
      return [];
    }
    try {
      const r = await check(st.doc.toString(), lang);
      return r.items.slice(0, 200).map(x => ({ from: x.from, to: x.to, severity: x.sev, message: x.msg, source: r.engine }));
    } catch (e) {
      if (!warned.has("load " + lang)) { warned.add("load " + lang); StatusBar.msg(T("Không kiểm được cú pháp {lang}: {msg}", { lang, msg: e.message }), "warn"); }
      return [];
    }
  }

  // True when the live linter really checks this tab (so FixMarks leave error marks to it).
  const lives = (lang, len) => LANGS.has(lang) && len <= LIVE_MAX && (lang !== "SQL" || !!E.sqlDb());
  return { LANGS, LIVE_MAX, check, diagnostics, lives };
})();
