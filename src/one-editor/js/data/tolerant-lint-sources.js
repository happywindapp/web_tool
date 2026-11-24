// Lint while typing (CM6 lint) for JSON · YAML · XML · HTML · CSS with the tolerant parsers (off above 5 MB), code languages through CodeLint. The count is on the status bar, the CM lint panel is the Problems list.
const DataLint = (() => {
  const MAX = 5 * 1024 * 1024, LANGS = new Set(["JSON", "YAML", "XML", "HTML", "CSS", "SVG"]);
  let ext = null;
  const big = new Set();

  function cssIssues(s) {
    const out = [], stack = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "/" && s[i + 1] === "*") { const e = s.indexOf("*/", i + 2); if (e < 0) { out.push({ at: i, msg: T("Chú thích /* chưa đóng") }); return out; } i = e + 1; }
      else if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < s.length && s[j] !== c && s[j] !== "\n") j += s[j] === "\\" ? 2 : 1;
        if (s[j] !== c) out.push({ at: i, msg: T("Chuỗi chưa đóng nháy") });
        i = j;
      }
      else if (c === "{") stack.push(i);
      else if (c === "}") { if (stack.length) stack.pop(); else out.push({ at: i, msg: T("Dấu } thừa") }); }
    }
    stack.forEach(at => out.push({ at, msg: T("Thiếu dấu } đóng khối mở ở đây") }));
    return out;
  }

  // text + language → [{ line, col } | { at }, msg, severity].
  function issues(text, lang, name = "") {
    if (lang === "JSON") {
      if (!text.trim() || /\.(?:jsonc|json5)$|^tsconfig.*\.json$/i.test(name || "")) return [];
      const e = JsonTool.check(text);
      if (!e) return [];
      const fixes = (() => { try { return JsonTool.parse(text).fixes; } catch { return []; } })();
      return [{ line: e.line, col: e.col, msg: e.msg, sev: "error" }, ...fixes.filter(f => f.line).map(f => ({ line: f.line, col: f.col, msg: T("Có thể tự sửa: {msg}", { msg: f.msg }), sev: "warning" }))];
    }
    if (lang === "YAML") {
      try { jsyaml.loadAll(text, () => {}); return []; }
      catch (e) { return [{ line: (e.mark?.line ?? 0) + 1, col: (e.mark?.column ?? 0) + 1, msg: e.reason || e.message, sev: "error" }]; }
    }
    if (lang === "XML" || lang === "SVG") { const e = text.trim() && MarkupTool.checkXml(text); return e ? [{ line: e.line, col: e.col, msg: e.msg, sev: "error" }] : []; }
    if (lang === "HTML") return MarkupTool.build(text, true).fixes.map(f => ({ line: f.line, col: f.col, msg: f.msg, sev: "warning" }));
    if (lang === "CSS") return cssIssues(text).map(x => ({ at: x.at, msg: x.msg, sev: "error" }));
    return [];
  }

  // Diagnostics of any tab's state (Problems checks tabs not on screen); code languages return a Promise.
  function diagnosticsOf(doc, st, warn = false) {
    const lang = Docs.effectiveLang(doc);
    if (!owns(lang) || doc.hex || doc.big || PreviewPane.isPane(doc)) return [];
    if (CodeLint.LANGS.has(lang)) return CodeLint.diagnostics(st, doc, lang);
    if (st.doc.length > MAX) {
      if (warn && !big.has(doc.id)) { big.add(doc.id); StatusBar.msg(T("“{name}” lớn hơn 5 MB — tắt kiểm lỗi khi gõ cho tab này.", { name: doc.name }), "warn"); }
      return [];
    }
    const pos = x => {
      if (x.at !== undefined) return Math.min(x.at, st.doc.length);
      const l = st.doc.line(Math.min(Math.max(x.line || 1, 1), st.doc.lines));
      return Math.min(l.from + Math.max((x.col || 1) - 1, 0), l.to);
    };
    return issues(st.doc.toString(), lang, doc.name).slice(0, 200).map(x => { const from = pos(x); return { from, to: Math.min(from + 1, st.doc.lineAt(from).to), severity: x.sev, message: x.msg, source: lang }; });
  }

  function source(view) {
    const g = Views.groups.find(x => x.view === view), doc = g && Docs.get(g.active);
    return doc ? diagnosticsOf(doc, view.state, true) : [];
  }

  const owns = lang => LANGS.has(lang) || CodeLint.LANGS.has(lang);
  const extension = () => ext ??= CM.lint.linter(source, { delay: 600, needsRefresh: u => u.transactions.some(t => t.reconfigured) });
  return { issues, extension, owns, diagnosticsOf, LANGS, MAX };
})();
