// Pure (node test): parsed OpenAPI 3.x / Swagger 2.0 object → endpoints grouped by tag with params, request body and responses as schema trees; internal $ref resolved (cycles + depth + node budget), external $ref reported.
const OpenApiDoc = (() => {
  const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
  const MAX_DEPTH = 8, MAX_NODES = 50000, MAX_OPS = 5000;
  const str = v => typeof v === "string" ? v : "";
  const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;

  function version(spec) {
    if (!obj(spec)) return "";
    if (typeof spec.openapi === "string" && /^3\./.test(spec.openapi)) return "openapi3";
    if (String(spec.swagger) === "2.0") return "swagger2";
    return "";
  }

  // JSON pointer "#/a/b~1c" inside the spec.
  function pointer(spec, ref) {
    if (typeof ref !== "string" || !ref.startsWith("#")) return { external: true };
    let cur = spec;
    for (const raw of ref.slice(1).split("/").filter(Boolean)) {
      const k = raw.replace(/~1/g, "/").replace(/~0/g, "~");
      if (!cur || typeof cur !== "object" || !Object.hasOwn(cur, k)) return { missing: true };
      cur = cur[k];
    }
    return { value: cur };
  }

  function build(spec) {
    const kind = version(spec);
    if (!kind) throw Object.assign(new Error("notSpec"), { code: "notSpec" });
    const ctx = { spec, nodes: 0, notes: new Map(), cut: false };
    const note = (code, v) => { const k = code + " " + (v || ""); if (!ctx.notes.has(k)) ctx.notes.set(k, { code, v: v || "" }); };
    ctx.note = note;
    const info = obj(spec.info) || {}, tagDesc = new Map((Array.isArray(spec.tags) ? spec.tags : []).filter(obj).map(t => [str(t.name), str(t.description)]));
    const groups = new Map([...tagDesc.keys()].map(k => [k, []]));
    const paths = obj(spec.paths) || {};
    let count = 0;
    for (const [path, rawItem] of Object.entries(paths)) {
      const item = deref(ctx, rawItem).v;
      if (!obj(item)) continue;
      for (const m of METHODS) {
        const op = obj(item[m]);
        if (!op) continue;
        if (++count > MAX_OPS) { note("opsCut", MAX_OPS); break; }
        const e = { method: m.toUpperCase(), path, summary: str(op.summary) || str(op.operationId), desc: str(op.description), opId: str(op.operationId), deprecated: op.deprecated === true,
          params: params(ctx, [...(Array.isArray(item.parameters) ? item.parameters : []), ...(Array.isArray(op.parameters) ? op.parameters : [])], kind), body: null, responses: [] };
        if (kind === "openapi3" && op.requestBody) { const rb = deref(ctx, op.requestBody).v; if (obj(rb)) e.body = { required: rb.required === true, desc: str(rb.description), content: content(ctx, rb.content) }; }
        if (kind === "swagger2") {
          const b = e.params.find(p => p.in === "body");
          if (b) { e.body = { required: b.required, desc: b.desc, content: [{ type: (op.consumes || spec.consumes || ["application/json"])[0], tree: b.tree }] }; e.params = e.params.filter(p => p !== b); }
        }
        for (const [code, rawR] of Object.entries(obj(op.responses) || {})) {
          const r = deref(ctx, rawR).v;
          if (!obj(r)) continue;
          const c = kind === "openapi3" ? content(ctx, r.content) : r.schema ? [{ type: (op.produces || spec.produces || ["application/json"])[0], tree: tree(ctx, r.schema, 0, []) }] : [];
          e.responses.push({ code, desc: str(r.description), content: c });
        }
        const tags = Array.isArray(op.tags) && op.tags.length ? op.tags.map(String) : [""];
        for (const t of tags) { if (!groups.has(t)) groups.set(t, []); groups.get(t).push(e); }
      }
      if (count > MAX_OPS) break;
    }
    if (ctx.cut) note("budget", MAX_NODES);
    const servers = kind === "openapi3" ? (Array.isArray(spec.servers) ? spec.servers : []).map(s => str(s?.url)).filter(Boolean) : spec.host ? [(spec.schemes?.[0] || "https") + "://" + spec.host + str(spec.basePath)] : [];
    return { kind, title: str(info.title), version: str(info.version), desc: str(info.description), servers, count: Math.min(count, MAX_OPS),
      groups: [...groups].filter(([, ops]) => ops.length).map(([tag, ops]) => ({ tag, desc: tagDesc.get(tag) || "", ops })), notes: [...ctx.notes.values()] };
  }

  // { v, name, err }: follows $ref chains (cycle-safe) to a value.
  function deref(ctx, v, seen = new Set()) {
    let name = "";
    while (obj(v) && typeof v.$ref === "string") {
      const ref = v.$ref;
      if (seen.has(ref)) return { v: null, name, err: "cycle" };
      seen.add(ref);
      const p = pointer(ctx.spec, ref);
      if (p.external) { ctx.note("external", ref); return { v: null, name: ref, err: "external" }; }
      if (p.missing) { ctx.note("missing", ref); return { v: null, name: ref, err: "missing" }; }
      name = ref.split("/").pop();
      v = p.value;
    }
    return { v, name };
  }

  function params(ctx, list, kind) {
    const out = [], keys = new Set();
    for (const raw of list.slice().reverse()) {
      const p = deref(ctx, raw).v;
      if (!obj(p) || keys.has(p.in + " " + p.name)) continue;
      keys.add(p.in + " " + p.name);
      const schema = p.schema || (kind === "swagger2" && p.in !== "body" ? p : null);
      out.unshift({ name: str(p.name), in: str(p.in), required: p.required === true, desc: str(p.description), deprecated: p.deprecated === true, tree: schema ? tree(ctx, schema, 0, []) : null });
    }
    return out;
  }
  const content = (ctx, c) => Object.entries(obj(c) || {}).map(([type, mt]) => ({ type, tree: obj(mt)?.schema ? tree(ctx, mt.schema, 0, []) : null }));

  // Schema → { type, name?, format?, desc?, enum?, required?, ref?, circular?, kids?: [{ key, … }] }; stack = $ref names on the way down.
  function tree(ctx, raw, depth, stack) {
    if (++ctx.nodes > MAX_NODES) { ctx.cut = true; return { type: "…" }; }
    const d = deref(ctx, raw), s = obj(d.v);
    if (d.err === "external") return { type: "$ref", ref: d.name, external: true };
    if (d.err) return { type: "$ref", ref: d.name || raw?.$ref, missing: d.err === "missing", circular: d.err === "cycle" };
    if (!s) return { type: "any" };
    if (d.name && stack.includes(d.name)) return { type: d.name, ref: d.name, circular: true };
    if (depth >= MAX_DEPTH) { ctx.note("depth", MAX_DEPTH); return { type: d.name || str(s.type) || "object", ref: d.name || undefined, cut: true }; }
    const st = d.name ? [...stack, d.name] : stack;
    const n = { type: Array.isArray(s.type) ? s.type.join(" | ") : str(s.type), ref: d.name || undefined, format: str(s.format) || undefined, desc: str(s.description) || undefined,
      enum: Array.isArray(s.enum) ? s.enum.slice(0, 50).map(x => JSON.stringify(x)) : undefined, nullable: s.nullable === true || undefined, deprecated: s.deprecated === true || undefined };
    const kids = [], req = new Set(Array.isArray(s.required) ? s.required : []);
    for (const k of ["allOf", "oneOf", "anyOf"]) if (Array.isArray(s[k])) {
      if (k === "allOf") { for (const part of s[k]) { const t = tree(ctx, part, depth + 1, st); if (t.kids && !t.circular) kids.push(...t.kids); else kids.push({ key: "allOf", ...t }); } n.type ||= "object"; }
      else { n.type ||= k; s[k].forEach((part, i) => kids.push({ key: k + "[" + i + "]", ...tree(ctx, part, depth + 1, st) })); }
    }
    for (const [k, v] of Object.entries(obj(s.properties) || {})) kids.push({ key: k, required: req.has(k) || undefined, ...tree(ctx, v, depth + 1, st) });
    if (s.items) { const t = tree(ctx, s.items, depth + 1, st); n.type ||= "array"; n.items = (t.ref || t.type || "any") + (t.format ? " (" + t.format + ")" : ""); if (t.kids || t.circular) kids.push({ key: "[]", ...t }); }
    if (obj(s.additionalProperties)) kids.push({ key: "{*}", ...tree(ctx, s.additionalProperties, depth + 1, st) });
    if (!n.type && kids.length) n.type = "object";
    if (kids.length) n.kids = kids;
    return n;
  }

  // Filter on method / path / summary / operationId / tag (case-insensitive text, no regex).
  function filter(doc, q) {
    const s = str(q).trim().toLowerCase();
    if (!s) return doc.groups;
    return doc.groups.map(g => ({ ...g, ops: g.tag.toLowerCase().includes(s) ? g.ops : g.ops.filter(e => (e.method + " " + e.path + " " + e.summary + " " + e.opId).toLowerCase().includes(s)) })).filter(g => g.ops.length);
  }

  const typeText = t => (t.ref && t.type !== t.ref ? t.ref : t.type === "array" && t.items ? t.items + "[]" : t.type || "any") + (t.format ? " (" + t.format + ")" : "") + (t.circular ? " ↺" : "") + (t.external ? " (external)" : "");

  // Markdown summary: ## tag, - `METHOD path` — summary.
  function markdown(doc) {
    const out = ["# " + (doc.title || "API") + (doc.version ? " " + doc.version : ""), ""];
    if (doc.servers.length) out.push(...doc.servers.map(s => "- " + s), "");
    for (const g of doc.groups) {
      out.push("## " + (g.tag || "(no tag)"), "");
      for (const e of g.ops) out.push("- `" + e.method + " " + e.path + "`" + (e.summary ? " — " + e.summary : "") + (e.deprecated ? " *(deprecated)*" : ""));
      out.push("");
    }
    return out.join("\n");
  }

  return { build, filter, markdown, typeText, version, METHODS };
})();
