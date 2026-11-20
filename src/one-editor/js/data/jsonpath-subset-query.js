// JSONPath subset over the tolerant JSON AST (no eval): $ . [] .. * [n] [-n] [a,b] [s:e:st] ['k'] and filters [?(@.a.b op value)] with == != < <= > >= =~ /re/ && || ( ).
const JsonPath = (() => {
  const err = msg => new Error(T("JSONPath lỗi: {msg}", { msg }));
  const IDENT = /^[A-Za-z_$][\w$-]*/;

  // Plain value of a node, for filters and the result list.
  const val = n => !n ? undefined : n.t === "str" ? n.v : n.t === "num" ? Number(n.raw) : n.t === "lit" ? (n.v === "null" ? null : n.v === "true") : n;
  const kids = n => n && n.t === "obj" ? n.items.map(it => [it.k, it.v]) : n && n.t === "arr" ? n.items.map((v, i) => [i, v]) : [];

  // Reads one quoted string starting at s[i] → [text, next index].
  function quoted(s, i) {
    const q = s[i], from = i;
    let out = "";
    for (i++; i < s.length && s[i] !== q; i++) out += s[i] === "\\" ? s[++i] : s[i];
    if (i >= s.length) throw err(T("thiếu dấu đóng nháy"));
    // Double quotes are JSON strings, so a path copied from the tree ("a\nb") reads back the same key.
    if (q === '"') try { out = JSON.parse(s.slice(from, i + 1)); } catch { /* not JSON escapes: keep the plain reading */ }
    return [out, i + 1];
  }

  // Index of the "]" closing the bracket opened at s[i], skipping quotes, regex literals and parentheses.
  function closing(s, i) {
    let depth = 0;
    for (let j = i + 1; j < s.length; j++) {
      const c = s[j];
      if (c === "'" || c === '"') { j = quoted(s, j)[1] - 1; continue; }
      if (c === "/" && (depth || /=~\s*$/.test(s.slice(i + 1, j)))) { const e = s.slice(j + 1).search(/(?<!\\)\//); if (e >= 0) { j += e + 1; continue; } }
      if (c === "(") depth++; else if (c === ")") depth--;
      else if (c === "]" && depth <= 0) return j;
    }
    throw err(T("thiếu dấu ]"));
  }

  function bracket(body) {
    const b = body.trim();
    if (b === "*") return { wild: true };
    if (b.startsWith("?")) return { filter: JsonPathFilter.compile(b.slice(1).trim()) };
    const parts = [];
    for (let i = 0; i < b.length;) {
      while (b[i] === " " || b[i] === ",") i++;
      if (i >= b.length) break;
      if (b[i] === "'" || b[i] === '"') { const [k, n] = quoted(b, i); parts.push(k); i = n; continue; }
      const m = /^(-?\d*)\s*(?::\s*(-?\d*)\s*(?::\s*(-?\d+))?)?/.exec(b.slice(i));
      if (!m[0]) throw err(T("không hiểu “{s}”", { s: b }));
      if (m[0].includes(":")) parts.push({ slice: [m[1], m[2], m[3]].map(x => x === "" || x === undefined ? null : +x) });
      else parts.push(+m[1]);
      i += m[0].length;
    }
    return { list: parts };
  }

  // "$.a..b[0]" → steps [{ desc, sel }].
  function compile(expr) {
    const s = String(expr).trim();
    if (s[0] !== "$") throw err(T("biểu thức phải bắt đầu bằng $"));
    const steps = [];
    for (let i = 1; i < s.length;) {
      const desc = s.startsWith("..", i);
      if (desc) i += 2; else if (s[i] === ".") i++;
      if (s[i] === "[") { const e = closing(s, i); steps.push({ desc, sel: bracket(s.slice(i + 1, e)) }); i = e + 1; continue; }
      if (s[i] === "*") { steps.push({ desc, sel: { wild: true } }); i++; continue; }
      const m = IDENT.exec(s.slice(i));
      if (!m || (!desc && s[i - 1] !== ".")) throw err(T("không hiểu “{s}”", { s: s.slice(i, i + 20) || s }));
      steps.push({ desc, sel: { list: [m[0]] } });
      i += m[0].length;
    }
    return steps;
  }

  function select(node, sel, out, path) {
    const ch = kids(node);
    if (sel.wild) { ch.forEach(([k, v]) => out.push({ node: v, path: [...path, k] })); return; }
    if (sel.filter) { ch.forEach(([k, v]) => { if (sel.filter(v, val)) out.push({ node: v, path: [...path, k] }); }); return; }
    for (const p of sel.list) {
      if (typeof p === "string") { if (node && node.t === "obj") node.items.filter(it => it.k === p).forEach(it => out.push({ node: it.v, path: [...path, p] })); }
      else if (node && node.t === "arr") {
        const n = node.items.length;
        if (typeof p === "number") { const k = p < 0 ? n + p : p; if (k >= 0 && k < n) out.push({ node: node.items[k], path: [...path, k] }); }
        else {
          const st = p.slice[2] || 1, norm = (x, d) => x === null ? d : x < 0 ? Math.max(n + x, st > 0 ? 0 : -1) : Math.min(x, st > 0 ? n : n - 1);
          const a = norm(p.slice[0], st > 0 ? 0 : n - 1), b = norm(p.slice[1], st > 0 ? n : -1);
          for (let k = a; st > 0 ? k < b : k > b; k += st) if (k >= 0 && k < n) out.push({ node: node.items[k], path: [...path, k] });
        }
      }
    }
  }

  function descendants(e, all) {
    all.push(e);
    for (const [k, v] of kids(e.node)) descendants({ node: v, path: [...e.path, k] }, all);
  }

  // → [{ node, path: [key | index] }] (≤ max results; middle steps keep up to 1e6 nodes so a late match is not lost).
  function query(ast, expr, max = 10000) {
    let cur = [{ node: ast, path: [] }];
    const steps = compile(expr), CAP = 1e6;
    steps.forEach((st, k) => {
      const from = [], lim = k === steps.length - 1 ? max : CAP;
      if (st.desc) cur.forEach(e => descendants(e, from)); else from.push(...cur);
      const next = [];
      for (const e of from) { select(e.node, st.sel, next, e.path); if (next.length > lim) break; }
      cur = next.slice(0, lim);
    });
    return cur;
  }

  const pathText = path => "$" + path.map(k => typeof k === "number" ? "[" + k + "]" : /^[A-Za-z_$][\w$]*$/.test(k) ? "." + k : "[" + JSON.stringify(k) + "]").join("");

  return { compile, query, pathText, val, kids };
})();
