// ▶ Run's operation per tab: the one picked by hand for it, else a default fitting its language; a result tab shows the op that made it.
const RunOp = (() => {
  const picked = new Map();
  const BY_LANG = { JSON: "json-pretty", JavaScript: "run-code", HTML: "run-code", Log: "filter", FIX: "fix-detail", "SWIFT MT": "swift-detail", diff: "patch-view" };
  // Dev tools by content (first 4 KB) in tabs whose language does not say it: curl, PEM, OpenAPI, a .http request.
  const HEAD_LANGS = new Set(["Plain Text", "Shell", "PowerShell", "YAML", "JSON"]);
  const BY_HEAD = [
    [/^\s*curl(?:\.exe)?\s/i, "curl-convert"],
    [/^(?:\s*#[^\n]*\n)*\s*-----BEGIN (?:[A-Z0-9 ]+ )?(?:CERTIFICATE|PRIVATE KEY)-----/, "x509"],
    [/^(?:openapi:\s*["']?3\.|swagger:\s*["']?2\.)|^\s*\{[\s\S]*?"(?:openapi"\s*:\s*"3\.|swagger"\s*:\s*"2\.)/m, "openapi-doc"],
    [/^(?:\s*(?:#|\/\/|@\w+\s*=)[^\n]*\n|\s*\n)*\s*(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(?:https?:\/\/|\{\{|\/)\S*/, "curl-convert"],
  ];
  const keyOf = doc => doc.kind === "output" && doc.link ? doc.link.src : Docs.root(doc).id;

  function suggest(doc) {
    const bin = doc.hex && FileOpen.binKind(doc.name);
    if (bin === "sqlite") return "sql-query";
    if (bin === "xlsx" || bin === "docx") return "office";
    const lang = Docs.effectiveLang(doc);
    if (HEAD_LANGS.has(lang)) { const head = doc.state ? doc.state.sliceDoc(0, 4096) : doc.text.slice(0, 4096), hit = BY_HEAD.find(([re]) => re.test(head)); if (hit) return hit[1]; }
    if (Object.hasOwn(BY_LANG, lang)) return BY_LANG[lang];
    if (lang === "Plain Text") { const hit = PasteDetect.detect(doc.state ? doc.state.sliceDoc(0, PasteDetect.HEAD) : doc.text.slice(0, PasteDetect.HEAD)); if (hit?.op && !hit.steps && OutputOps.get(hit.op)) return hit.op; }
    // No real formatter (format only re-indents): ▶ checks the syntax instead.
    if (CodeLint.LANGS.has(lang) && Formatter.tier(lang) === 3) return "syntax-check";
    return PreviewPane.kindOf(Docs.root(doc)) ? "preview" : "format";
  }

  function of(doc) {
    if (doc.kind === "output" && doc.link && OutputOps.get(doc.link.op)) return doc.link.op;
    return picked.get(keyOf(doc)) || suggest(doc);
  }

  const pick = (doc, op) => { if (doc && OutputOps.get(op)) picked.set(keyOf(doc), op); };

  return { of, pick, suggest };
})();
