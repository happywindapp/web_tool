// Fake records, pure: from a JSON Schema (type / format / enum / const / min–max / simple pattern / required / items / $ref "#/…" / oneOf / anyOf / allOf) or a column list "id:uuid, name:name"; seeded ⇒ the same seed gives the same rows. English, fake.
const FakeData = (() => {
  const MAX_ROWS = 10000, MAX_DEPTH = 8, MAX_ITEMS = 50, MAX_STR = 10000, MAX_NODES = 500000;
  const FIRST = ["Alex", "Blair", "Casey", "Drew", "Emery", "Finley", "Gray", "Harper", "Indy", "Jordan", "Kai", "Logan", "Morgan", "Noel", "Oakley", "Parker", "Quinn", "Reese", "Sage", "Taylor"];
  const LAST = ["Carter", "Novak", "Lin", "Patel", "Stone", "Rivera", "Brooks", "Hayes", "Kim", "Moreno", "Walsh", "Ortiz", "Fischer", "Nakamura", "Silva", "Reed", "Ellis", "Vance", "Shaw", "Duarte"];
  const WORDS = ["alpha", "bravo", "cobalt", "delta", "ember", "falcon", "granite", "harbor", "ion", "juniper", "kestrel", "lumen", "meridian", "nova", "orbit", "pixel", "quartz", "ripple", "summit", "tundra"];
  const CITIES = ["Springfield", "Riverton", "Lakeside", "Fairview", "Oak Ridge", "Maple Bay", "Westport", "Brookfield"], COUNTRIES = ["US", "GB", "DE", "JP", "SG", "AU", "CA", "VN"];
  const STATUS = ["NEW", "OPEN", "FILLED", "CANCELED", "REJECTED"], SIDES = ["BUY", "SELL"], CCY = ["USD", "EUR", "JPY", "GBP", "VND"];

  // FNV-1a of the seed → mulberry32.
  function rng(seed) {
    let h = 0x811c9dc5;
    for (const ch of String(seed)) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
    let a = h >>> 0;
    const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    return { next, int, pick: list => list[int(0, list.length - 1)] };
  }

  const pad = (n, k) => String(n).padStart(k, "0");
  const hex = (r, n) => Array.from({ length: n }, () => r.int(0, 15).toString(16)).join("");
  const date = r => new Date(Date.UTC(2026, 0, 1) + r.int(0, 364) * 86400000 + r.int(0, 86399) * 1000);
  const KINDS = {
    uuid: r => hex(r, 8) + "-" + hex(r, 4) + "-4" + hex(r, 3) + "-" + r.pick(["8", "9", "a", "b"]) + hex(r, 3) + "-" + hex(r, 12),
    id: (r, i) => i + 1,
    name: r => r.pick(FIRST) + " " + r.pick(LAST), first: r => r.pick(FIRST), last: r => r.pick(LAST),
    email: r => (r.pick(FIRST) + "." + r.pick(LAST)).toLowerCase() + r.int(1, 99) + "@" + r.pick(["example.com", "example.org", "example.net"]),
    // 555-01xx numbers are reserved for fiction.
    phone: r => "+1-555-01" + pad(r.int(0, 99), 2),
    date: r => date(r).toISOString().slice(0, 10), datetime: r => date(r).toISOString().replace(/\.\d+Z$/, "Z"), time: r => date(r).toISOString().slice(11, 19),
    int: r => r.int(0, 1000), number: r => Math.round(r.next() * 100000) / 100, bool: r => r.next() < 0.5,
    price: r => Math.round((5 + r.next() * 195) * 100) / 100, qty: r => r.int(1, 50) * 100,
    ticker: r => Array.from({ length: r.int(3, 4) }, () => String.fromCharCode(65 + r.int(0, 25))).join(""),
    account: r => "DEMO" + pad(r.int(0, 999999), 6),
    side: r => r.pick(SIDES), status: r => r.pick(STATUS), currency: r => r.pick(CCY),
    word: r => r.pick(WORDS), sentence: r => { const w = Array.from({ length: r.int(4, 9) }, () => r.pick(WORDS)).join(" "); return w[0].toUpperCase() + w.slice(1) + "."; },
    city: r => r.pick(CITIES), country: r => r.pick(COUNTRIES), ip: r => "10." + r.int(0, 255) + "." + r.int(0, 255) + "." + r.int(1, 254),
    url: r => "https://" + r.pick(["example.com", "example.org"]) + "/" + r.pick(WORDS) + "/" + r.int(1, 999),
  };
  const BY_NAME = [[/uuid|guid/i, "uuid"], [/e-?mail/i, "email"], [/phone|mobile|tel/i, "phone"], [/^(first_?name|given)/i, "first"], [/^(last_?name|surname|family)/i, "last"], [/name|owner|customer|trader/i, "name"],
    [/symbol|ticker/i, "ticker"], [/account|acct/i, "account"], [/city/i, "city"], [/country/i, "country"], [/currency|ccy/i, "currency"], [/side/i, "side"], [/status|state/i, "status"],
    [/url|link|website/i, "url"], [/ip(_?addr)?$/i, "ip"], [/desc|note|comment|text|title/i, "sentence"]];
  const NUM_BY_NAME = [[/price|amount|total|value|px/i, "price"], [/qty|quantity|size|volume/i, "qty"]];
  const byName = (name, table) => table.find(([re]) => re.test(name || ""))?.[1];

  // Column list: "id:uuid, name, amount:price" (no kind ⇒ guess from the name, else word).
  function parseCols(spec) {
    const cols = [], bad = [];
    for (const part of String(spec || "").split(/[,\n;]/)) {
      const m = /^\s*([^:\s][^:]*?)\s*(?::\s*(\w+)\s*)?$/.exec(part);
      if (!part.trim()) continue;
      if (!m) { bad.push(part.trim()); continue; }
      const kind = m[2] ? m[2].toLowerCase() : byName(m[1], NUM_BY_NAME) || byName(m[1], BY_NAME) || "word";
      if (!Object.hasOwn(KINDS, kind)) { bad.push(m[2]); continue; }
      cols.push({ name: m[1], kind });
    }
    return { cols, bad };
  }
  const clampN = n => Math.max(1, Math.min(MAX_ROWS, Math.floor(+n) || 1));
  const fromColumns = (cols, n, seed) => { const r = rng(seed); return Array.from({ length: clampN(n) }, (x, i) => Object.fromEntries(cols.map(c => [c.name, KINDS[c.kind](r, i)]))); };

  // Simple regex → a matching string: literals, \d \w \s, [classes], (groups|alternatives), ? * + {n,m}; anything else ⇒ null.
  function fromPattern(src, r) {
    let i = 0;
    const CLASS = { d: "0123456789", w: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_", s: " " };
    function set() {
      let chars = "", neg = false;
      if (src[i] === "^") { neg = true; i++; }
      while (i < src.length && src[i] !== "]") {
        let c = src[i++];
        if (c === "\\") { const e = src[i++]; if (CLASS[e]) { chars += CLASS[e]; continue; } c = e; }
        if (src[i] === "-" && src[i + 1] && src[i + 1] !== "]") { const to = src[i + 1]; i += 2; for (let k = c.charCodeAt(0); k <= to.charCodeAt(0) && k - c.charCodeAt(0) < 128; k++) chars += String.fromCharCode(k); } else chars += c;
      }
      if (src[i++] !== "]" || neg || !chars) throw 0;
      return () => chars[r.int(0, chars.length - 1)];
    }
    function atom() {
      const c = src[i++];
      if (c === "(") { if (src[i] === "?") { if (src[i + 1] !== ":") throw 0; i += 2; } const g = alt(); if (src[i++] !== ")") throw 0; return g; }
      if (c === "[") return set();
      if (c === "\\") { const e = src[i++]; if (CLASS[e]) return () => CLASS[e][r.int(0, CLASS[e].length - 1)]; if (/[\p{L}\p{N}]/u.test(e)) throw 0; return () => e; }
      if (c === ".") return () => r.pick(WORDS)[0];
      if ("*+?{|)".includes(c)) throw 0;
      return () => c;
    }
    function seq() {
      const parts = [];
      while (i < src.length && src[i] !== "|" && src[i] !== ")") {
        if (src[i] === "^" || src[i] === "$") { i++; continue; }
        const a = atom();
        let lo = 1, hi = 1;
        const q = /^(?:\{(\d+)(,(\d*))?\}|[?*+])/.exec(src.slice(i));
        if (q) { i += q[0].length; if (q[0] === "?") { lo = 0; hi = 1; } else if (q[0] === "*") { lo = 0; hi = 3; } else if (q[0] === "+") { lo = 1; hi = 3; } else { lo = +q[1]; hi = q[2] ? (q[3] ? +q[3] : lo + 3) : lo; } }
        if (hi > 64 || lo > hi) throw 0;
        parts.push(() => { let s = ""; for (let k = r.int(lo, hi); k > 0; k--) { s += a(); if (s.length > MAX_STR) throw 0; } return s; });
      }
      return () => parts.map(f => f()).join("");
    }
    function alt() { const opts = [seq()]; while (src[i] === "|") { i++; opts.push(seq()); } return () => r.pick(opts)(); }
    // Never run the pattern itself (it may come from a link: catastrophic backtracking on the main thread).
    try { const g = alt(); if (i < src.length) return null; const out = g(); return out.length <= MAX_STR ? out : null; } catch { return null; }
  }

  const validRe = src => { try { new RegExp(src, "u"); return true; } catch { return false; } };

  // → { rows, notes: [{ kind: "ref" | "missing" | "pattern" | "badPattern" | "depth" | "budget", path }] }.
  function fromSchema(schema, n, seed) {
    const r = rng(seed), notes = [], noted = new Set();
    const note = (kind, path) => { if (!noted.has(kind + path) && notes.length < 20) { noted.add(kind + path); notes.push({ kind, path }); } };
    function deref(s, path, depth) {
      if (depth > MAX_DEPTH) { note("depth", path); return {}; }
      for (let k = 0; s && typeof s === "object" && typeof s.$ref === "string" && k < MAX_DEPTH; k++) {
        if (!s.$ref.startsWith("#")) { note("ref", path); return {}; }
        let t = schema;
        for (const seg of s.$ref.slice(1).split("/").filter(Boolean)) t = t?.[decodeURIComponent(seg).replace(/~1/g, "/").replace(/~0/g, "~")];
        if (!t || typeof t !== "object") { note("missing", path); return {}; }
        s = { ...t, ...Object.fromEntries(Object.entries(s).filter(([k2]) => k2 !== "$ref")) };
      }
      if (s && Array.isArray(s.allOf)) s = s.allOf.reduce((m, x) => { const y = deref(x, path, depth + 1); return { ...m, ...y, properties: { ...m.properties, ...y.properties }, required: [...(m.required || []), ...(y.required || [])] }; }, { ...s, allOf: undefined });
      const any = s && (s.oneOf || s.anyOf);
      if (Array.isArray(any) && any.length) s = deref(r.pick(any), path, depth + 1);
      return s && typeof s === "object" ? s : {};
    }
    function num(s, name, int) {
      const exMin = typeof s.exclusiveMinimum === "number" ? s.exclusiveMinimum : null, exMax = typeof s.exclusiveMaximum === "number" ? s.exclusiveMaximum : null;
      const kind = byName(name, NUM_BY_NAME);
      let lo = s.minimum ?? (exMin != null ? exMin + (int ? 1 : 0.01) : kind === "price" ? 5 : kind === "qty" ? 100 : 0);
      let hi = s.maximum ?? (exMax != null ? exMax - (int ? 1 : 0.01) : Math.max(lo, kind === "qty" ? 5000 : 1000) + (s.minimum != null && s.maximum == null ? 1000 : 0));
      if (s.exclusiveMinimum === true) lo += int ? 1 : 0.01;
      if (s.exclusiveMaximum === true) hi -= int ? 1 : 0.01;
      if (hi < lo) hi = lo;
      const step = s.multipleOf > 0 ? s.multipleOf : int ? 1 : kind === "qty" ? 100 : 0;
      if (step) { const a = Math.ceil(lo / step), b = Math.floor(hi / step); return b >= a ? +(r.int(a, b) * step).toFixed(10) : lo; }
      return Math.round((lo + r.next() * (hi - lo)) * 100) / 100;
    }
    function str(s, name, path, i) {
      const F = { email: "email", uuid: "uuid", date: "date", "date-time": "datetime", time: "time", uri: "url", url: "url", ipv4: "ip", hostname: "word" };
      let v;
      if (typeof s.pattern === "string") { v = fromPattern(s.pattern, r); if (v == null) note(validRe(s.pattern) ? "pattern" : "badPattern", path); }
      if (v == null) v = String(KINDS[F[s.format] || byName(name, BY_NAME) || "word"](r, i));
      if (s.maxLength >= 0 && v.length > s.maxLength) v = v.slice(0, s.maxLength);
      const min = Math.min(+s.minLength || 0, MAX_STR);
      while (min > v.length) v += r.pick(WORDS).slice(0, min - v.length);
      return v;
    }
    let nodes = 0;
    function value(s0, name, path, depth, i) {
      if (depth > MAX_DEPTH) { note("depth", path); return null; }
      if (++nodes > MAX_NODES) { note("budget", path); return null; }
      const s = deref(s0, path, depth);
      if ("const" in s) return s.const;
      if (Array.isArray(s.enum) && s.enum.length) return r.pick(s.enum);
      let type = Array.isArray(s.type) ? s.type.find(t => t !== "null") || "null" : s.type;
      type ??= s.properties ? "object" : s.items || s.prefixItems ? "array" : name && byName(name, NUM_BY_NAME) ? "number" : "string";
      if (type === "object") {
        const o = {}, req = new Set(Array.isArray(s.required) ? s.required : []);
        for (const [k, p] of Object.entries(s.properties || {})) if (req.has(k) || r.next() < 0.8) o[k] = value(p, k, path + "/" + k, depth + 1, i);
        return o;
      }
      if (type === "array") {
        const lo = Math.max(0, s.minItems | 0), hi = Math.min(MAX_ITEMS, Math.max(lo, s.maxItems ?? lo + 3)), pre = Array.isArray(s.prefixItems) ? s.prefixItems : [];
        return Array.from({ length: Math.max(r.int(lo, hi), pre.length) }, (x, k) => value(pre[k] || s.items || {}, name, path + "/" + k, depth + 1, k));
      }
      if (type === "integer" || type === "number") return num(s, name, type === "integer");
      if (type === "boolean") return r.next() < 0.5;
      if (type === "null") return null;
      return str(s, name, path, i);
    }
    // A root array schema yields its items as the rows.
    const root = deref(schema, "", 0), rowSchema = (root.type === "array" || (!root.type && root.items)) && root.items ? root.items : schema;
    return { rows: Array.from({ length: clampN(n) }, (x, i) => value(rowSchema, "", "", 0, i)), notes };
  }

  // CSV of the rows' top-level keys (nested values as JSON).
  function toCsv(rows) {
    const cols = [...new Set(rows.flatMap(o => o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o) : ["value"]))];
    const cell = v => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [cols.join(","), ...rows.map(o => cols.map(c => cell(o && typeof o === "object" && !Array.isArray(o) ? o[c] : o)).join(","))].join("\n") + "\n";
  }

  return { MAX_ROWS, KINDS: Object.keys(KINDS), rng, parseCols, fromColumns, fromPattern, fromSchema, toCsv };
})();
