// JSONPath filter "[?( … )]" compiled to a function by a small recursive-descent parser — no eval / new Function (the page CSP forbids them anyway).
const JsonPathFilter = (() => {
  const err = msg => new Error(T("JSONPath lỗi: {msg}", { msg }));
  const OPS = ["==", "!=", "<=", ">=", "=~", "<", ">", "&&", "||", "!", "(", ")"];

  function tokens(s) {
    const out = [];
    for (let i = 0; i < s.length;) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'" || c === '"') { let v = ""; for (i++; i < s.length && s[i] !== c; i++) v += s[i] === "\\" ? s[++i] : s[i]; if (i >= s.length) throw err(T("thiếu dấu đóng nháy")); out.push({ lit: v }); i++; continue; }
      if (c === "/" && out.length && out[out.length - 1].op === "=~") {
        const m = /^\/((?:\\.|[^/\\])*)\/([gimsuy]*)/.exec(s.slice(i));
        if (!m) throw err(T("regex chưa đóng"));
        try { out.push({ lit: new RegExp(m[1], m[2].replace(/[gy]/g, "")) }); } catch (e) { throw err(e.message); }
        i += m[0].length; continue;
      }
      if (c === "@") { const m = /^@((?:\.[A-Za-z_$][\w$-]*|\[\s*(?:-?\d+|'[^']*'|"[^"]*")\s*\])*)/.exec(s.slice(i)); out.push({ path: parsePath(m[1]) }); i += m[0].length; continue; }
      const num = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i.exec(s.slice(i));
      if (num) { out.push({ lit: +num[0] }); i += num[0].length; continue; }
      const word = /^(true|false|null)\b/.exec(s.slice(i));
      if (word) { out.push({ lit: word[1] === "null" ? null : word[1] === "true" }); i += word[0].length; continue; }
      const op = OPS.find(o => s.startsWith(o, i));
      if (!op) throw err(T("không hiểu “{s}”", { s: s.slice(i, i + 12) }));
      out.push({ op }); i += op.length;
    }
    return out;
  }

  const parsePath = p => [...p.matchAll(/\.([A-Za-z_$][\w$-]*)|\[\s*(-?\d+|'[^']*'|"[^"]*")\s*\]/g)].map(m => m[1] ?? (/^-?\d/.test(m[2]) ? +m[2] : m[2].slice(1, -1)));

  // or := and ('||' and)* · and := not ('&&' not)* · not := '!' not | cmp · cmp := term (op term)? · term := '(' or ')' | @path | literal
  function compile(expr) {
    const t = tokens(expr);
    let i = 0;
    const peek = () => t[i] && t[i].op, take = op => peek() === op && ++i;
    function or() { let l = and(); while (take("||")) { const a = l, b = and(); l = (n, v) => a(n, v) || b(n, v); } return l; }
    function and() { let l = not(); while (take("&&")) { const a = l, b = not(); l = (n, v) => a(n, v) && b(n, v); } return l; }
    function not() { if (take("!")) { const a = not(); return (n, v) => !a(n, v); } return cmp(); }
    function term() {
      if (take("(")) { const e = or(); if (!take(")")) throw err(T("thiếu dấu )")); return { fn: e }; }
      const x = t[i++];
      if (!x || x.op) throw err(T("thiếu giá trị"));
      return x;
    }
    const get = (x, n, v) => {
      if ("lit" in x) return x.lit;
      if (x.fn) return x.fn(n, v);
      let cur = n;
      for (const k of x.path) {
        const items = cur && (cur.t === "obj" ? cur.items.filter(it => it.k === k).map(it => it.v) : cur.t === "arr" && typeof k === "number" ? [cur.items[k < 0 ? cur.items.length + k : k]] : []);
        cur = items && items[0];
        if (!cur) return undefined;
      }
      return v(cur);
    };
    function cmp() {
      const a = term(), op = ["==", "!=", "<", "<=", ">", ">=", "=~"].includes(peek()) ? t[i++].op : "";
      if (!op) return a.fn || ((n, v) => get(a, n, v) !== undefined);
      const b = term();
      return (n, v) => {
        const x = get(a, n, v), y = get(b, n, v);
        if (op === "=~") return typeof x === "string" && y instanceof RegExp && y.test(x);
        if (op === "==") return x === y;
        if (op === "!=") return x !== y;
        if (x === undefined || y === undefined || x === null || y === null || typeof x !== typeof y) return false;
        return op === "<" ? x < y : op === "<=" ? x <= y : op === ">" ? x > y : x >= y;
      };
    }
    const fn = or();
    if (i < t.length) throw err(T("không hiểu “{s}”", { s: expr }));
    return fn;
  }

  return { compile };
})();
