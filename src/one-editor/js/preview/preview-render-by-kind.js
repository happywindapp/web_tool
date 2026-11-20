// OutputOps "preview": diagrams render in the sandbox; Markdown, HTML, SVG, CSV/JSON tables and draw.io are prepared here as data for PreviewPane.
const PreviewRender = (() => {
  const FENCES_MAX = 30, CACHE_MAX = 64;
  const cache = new Map();
  const failed = e => ({ text: "", error: e, view: { error: e } });

  const live = ctx => !ctx.current || ctx.current();
  const keyOf = n => n.engine + "\n" + n.code;
  const remember = (key, v) => { cache.delete(key); cache.set(key, v); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); };

  // A fenced diagram becomes a sanitized <img> data URL; results (and syntax errors) are cached by engine + code.
  async function fenced(n) {
    try {
      const r = await PreviewBridge.render(n.engine, n.code, PreviewKind.config(n.engine));
      const svg = SvgSanitizer.clean(r.svg), vb = svg.viewBox.baseVal;
      if (vb && vb.width) { svg.setAttribute("width", vb.width); svg.setAttribute("height", vb.height); }
      remember(keyOf(n), { src: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(Exporter.svgText(svg, r.bg)), w: vb?.width || 0 });
    } catch (e) { remember(keyOf(n), { error: e }); return e; }
    return null;
  }

  // Draws the missing diagrams one by one, then re-runs the preview (all cached now); a newer run or a sandbox that cannot load stops it.
  async function fill(todo, ctx) {
    for (const n of todo) {
      if (!live(ctx)) return;
      const e = await fenced(n);
      if (e && (e.load || e.detail === undefined)) { todo.forEach(x => cache.has(keyOf(x)) || remember(keyOf(x), { error: e })); break; }
    }
    if (live(ctx) && Docs.get(ctx.id)) OutputLink.run(Docs.get(ctx.id), "preview", true);
  }

  // Text first: diagrams not drawn yet show a placeholder and arrive in a second pass.
  function markdown(text, ctx) {
    const nodes = MdRender.parse(text, { diagram: PreviewKind.fence }), diagrams = [], todo = [];
    const walk = list => list.forEach(n => { if (n && n.t === "diagram") diagrams.push(n); else if (n && n.c) walk(n.c); });
    walk(nodes);
    let error = null;
    for (const [k, n] of diagrams.entries()) {
      const v = k < FENCES_MAX ? cache.get(keyOf(n)) : null;
      if (k >= FENCES_MAX) n.skipped = FENCES_MAX;
      else if (!v) { n.pending = true; todo.push(n); }
      else if (!v.error) Object.assign(n, v);
      else {
        const e = v.error;
        n.error = e.message + (e.detail && !e.message.includes(e.detail) ? "\n\n" + e.detail : "");
        error ??= Object.assign(new Error(T("Khối {engine} ở dòng {line}: {msg}", { engine: n.engine, line: n.line, msg: e.message })), { line: n.line + (e.line || 0) });
      }
    }
    if (todo.length) fill(todo, ctx);
    return { text: "", view: { kind: "markdown", nodes }, error };
  }

  function svg(text) {
    const bad = new DOMParser().parseFromString(text, "image/svg+xml").querySelector("parsererror");
    if (!bad) return { text: "", view: { kind: "diagram", svg: text, type: "SVG", bg: "#ffffff" } };
    const msg = (bad.textContent || "").trim().split("\n").filter(Boolean).slice(0, 2).join(" — "), m = /line (\d+)/i.exec(msg);
    return failed(Object.assign(new Error(T("SVG lỗi cú pháp: {msg}", { msg })), { line: m ? +m[1] : 0 }));
  }

  function table(text, lang) {
    let model, warnings = [];
    if (lang === "JSON") model = QuickTable.fromJson(OutputOps.parseJson(text));
    else {
      const r = CsvTool.parse(text, lang === "TSV" ? "\t" : undefined);
      model = QuickTable.fromRows(r.rows);
      warnings = r.fixes.slice(0, 3).map(f => f.line ? T("Dòng {line}: {msg}", { line: f.line, msg: f.msg }) : f.msg);
    }
    if (model.rows.length < model.total) warnings.push(T("Chỉ hiện {shown} / {total} dòng đầu.", { shown: model.rows.length, total: model.total }));
    if (model.totalCols > QuickTable.MAX_COLS) warnings.push(T("Chỉ hiện {shown} / {total} cột đầu.", { shown: QuickTable.MAX_COLS, total: model.totalCols }));
    return { text: "", view: { kind: "table", ...model, warnings } };
  }

  function drawio(text) {
    const bad = DrawioEmbed.validate(text);
    return bad ? failed(Object.assign(new Error(bad.message), { line: bad.line || 0 })) : { text: "", view: { kind: "drawio", xml: text } };
  }

  // An unsupported language throws (no tab); a render error comes back as data so the preview tab still opens and follows edits.
  async function run(text, ctx) {
    const k = PreviewKind.of(ctx.lang, text.slice(0, 2000), ctx.name);
    if (!k) throw new Error(T("“{lang}” chưa có preview — hỗ trợ: {list}.", { lang: ctx.lang, list: PreviewKind.LANGS.join(", ") }));
    if (!text.trim()) return { text: "", view: { kind: k.kind === "svg" ? "diagram" : k.kind, empty: true } };
    if (k.kind === "markdown") return markdown(text, ctx);
    if (k.kind === "html") return { text: "", view: { kind: "html", html: text } };
    if (k.kind === "svg") return svg(text);
    if (k.kind === "drawio") return drawio(text);
    try {
      if (k.kind === "table") return table(text, ctx.lang);
      return { text: "", view: { kind: "diagram", ...await PreviewBridge.render(k.engine, text, PreviewKind.config(k.engine, PreviewPane.choice(ctx.id))) } };
    } catch (e) { return failed(e); }
  }

  return { run };
})();
