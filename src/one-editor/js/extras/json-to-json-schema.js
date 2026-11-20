// JSON sample → JSON Schema draft 2020-12 (types, required keys seen in every object, array items merged, common string formats). Pure, works on the tolerant AST.
const JsonSchemaGen = (() => {
  const FORMATS = [
    ["date-time", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i],
    ["date", /^\d{4}-\d{2}-\d{2}$/],
    ["uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i],
    ["email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/],
    ["uri", /^https?:\/\/\S+$/i],
  ];

  // Internal shape: { types: Set, props?: Map(key → { s, n }), objects?: count, items?, format? }.
  function infer(n) {
    if (n.t === "obj") {
      const props = new Map();
      for (const it of n.items) props.set(it.k, { s: props.has(it.k) ? merge(props.get(it.k).s, infer(it.v)) : infer(it.v), n: 1 });
      return { types: new Set(["object"]), props, objects: 1 };
    }
    if (n.t === "arr") return { types: new Set(["array"]), items: n.items.reduce((a, it) => a ? merge(a, infer(it)) : infer(it), null) };
    if (n.t === "num") return { types: new Set([/^-?\d+$/.test(n.raw) ? "integer" : "number"]) };
    if (n.t === "str") return { types: new Set(["string"]), format: FORMATS.find(([, re]) => re.test(n.v))?.[0] || null };
    return { types: new Set([n.v === "null" ? "null" : "boolean"]) };
  }

  function merge(a, b) {
    const types = new Set([...a.types, ...b.types]);
    if (types.has("integer") && types.has("number")) types.delete("integer");
    const out = { types };
    if (a.props || b.props) {
      out.objects = (a.objects || 0) + (b.objects || 0);
      out.props = new Map();
      for (const src of [a.props, b.props]) for (const [k, v] of src || []) {
        const cur = out.props.get(k);
        out.props.set(k, cur ? { s: merge(cur.s, v.s), n: cur.n + v.n } : { ...v });
      }
    }
    if (a.items !== undefined || b.items !== undefined) out.items = a.items && b.items ? merge(a.items, b.items) : a.items || b.items || null;
    if (types.has("string")) {
      const fa = a.types.has("string") ? a.format : undefined, fb = b.types.has("string") ? b.format : undefined;
      out.format = fa === undefined ? fb : fb === undefined || fa === fb ? fa : null;
    }
    return out;
  }

  // Internal → schema object; key order follows the sample.
  function emit(s) {
    const types = [...s.types], o = {};
    o.type = types.length === 1 ? types[0] : types;
    if (s.format) o.format = s.format;
    if (s.props) {
      o.properties = {};
      for (const [k, v] of s.props) o.properties[k] = emit(v.s);
      const req = [...s.props].filter(([, v]) => v.n === s.objects).map(([k]) => k);
      if (req.length) o.required = req;
    }
    if (s.types.has("array")) o.items = s.items ? emit(s.items) : {};
    return o;
  }

  function generate(text, title = "") {
    const r = JsonTool.parse(text);
    if (!r.ast) throw new Error(T("Chưa có JSON để sinh schema."));
    const schema = { $schema: "https://json-schema.org/draft/2020-12/schema", ...(title ? { title } : {}), ...emit(infer(r.ast)) };
    return { text: JSON.stringify(schema, null, 2) + "\n", fixes: r.fixes };
  }

  return { generate };
})();
