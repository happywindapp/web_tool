// Value model shared by converters: plain JS values, but numbers stay raw text (Num) so big ids/decimals never lose precision.
const Val = (() => {
  class Num { constructor(raw) { this.raw = raw; } }
  const NUM_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
  const isNum = v => v instanceof Num;
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v) && !isNum(v);
  const isScalar = v => v === null || typeof v !== "object" || isNum(v);
  // Own-property define so keys like "__proto__" stay plain data instead of touching the prototype.
  const put = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });

  // An object can hold one value per key, so duplicate JSON keys keep the last value — reported via notes.
  function fromAst(n, notes = null) {
    if (n.t === "str") return n.v;
    if (n.t === "num") return new Num(n.raw);
    if (n.t === "lit") return n.v === "null" ? null : n.v === "true";
    if (n.t === "arr") return n.items.map(x => fromAst(x, notes));
    const o = {};
    for (const it of n.items) {
      if (notes && Object.hasOwn(o, it.k)) notes.push(T('Khóa "{k}" bị trùng → khi chuyển đổi chỉ giữ giá trị sau', it));
      put(o, it.k, fromAst(it.v, notes));
    }
    return o;
  }

  function toAst(v) {
    if (v === null || v === undefined) return { t: "lit", v: "null" };
    if (isNum(v)) return { t: "num", raw: v.raw };
    if (typeof v === "boolean") return { t: "lit", v: String(v) };
    if (typeof v === "number") return Number.isFinite(v) ? { t: "num", raw: String(v) } : { t: "lit", v: "null" };
    if (typeof v === "string") return { t: "str", v };
    if (Array.isArray(v)) return { t: "arr", items: v.map(toAst) };
    return { t: "obj", items: Object.keys(v).map(k => ({ k, v: toAst(v[k]) })) };
  }

  // Leading zeros ("007", account codes) do not match NUM_RE, so they stay strings.
  const infer = s => NUM_RE.test(s) ? new Num(s) : s === "true" ? true : s === "false" ? false : s;
  const text = v => v === null || v === undefined ? "" : isNum(v) ? v.raw : String(v);

  // For js-yaml: numbers that survive Number() exactly become numbers, the rest stay strings (counted in notes.keptAsText).
  function toPlain(v, notes) {
    if (isNum(v)) { const n = Number(v.raw); if (String(n) === v.raw) return n; notes.keptAsText = (notes.keptAsText || 0) + 1; return v.raw; }
    if (Array.isArray(v)) return v.map(x => toPlain(x, notes));
    if (isObj(v)) { const o = {}; for (const k of Object.keys(v)) put(o, k, toPlain(v[k], notes)); return o; }
    return v;
  }

  function fromPlain(v) {
    if (typeof v === "number") return Number.isFinite(v) ? new Num(String(v)) : null;
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(fromPlain);
    if (v !== null && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) put(o, k, fromPlain(v[k])); return o; }
    return v === undefined ? null : v;
  }

  return { Num, isNum, isObj, isScalar, put, fromAst, toAst, infer, text, toPlain, fromPlain };
})();
