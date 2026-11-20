// JSON (tolerant AST) → Go struct / TypeScript interface / C# class / Java class / C++ struct: types inferred from the sample, array items merged, keys missing in some items optional.
const TypeGen = (() => {
  const words = s => String(s).replace(/([a-z\d])([A-Z])/g, "$1 $2").split(/[^A-Za-z\d]+/).filter(Boolean);
  const cap = w => w[0].toUpperCase() + w.slice(1).toLowerCase();
  const pascal = s => { const r = words(s).map(cap).join(""); return !r || /^\d/.test(r) ? "T" + r : r; };
  const camel = s => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };
  const snake = s => { const r = words(s).map(w => w.toLowerCase()).join("_"); return !r || /^\d/.test(r) ? "f_" + r : r; };
  const singular = s => s.replace(/ies$/i, "y").replace(/(ss|x|ch|sh)es$/i, "$1").replace(/([^siu])s$/i, "$1");
  const GO_CAPS = /(Id|Url|Uri|Api|Http|Https|Json|Xml|Uuid|Ip|Sql|Html)(?=[A-Z\d]|$)/g;
  const RESERVED = new Set(("abstract auto bool boolean break byte case catch char class const continue default delete do double else enum explicit export extern "
    + "final float for friend goto if implements import inline instanceof int interface long mutable namespace new operator package private protected public "
    + "register return short signed sizeof static struct super switch template this throw transient try typedef typename union unsigned using virtual void volatile while").split(" "));

  function infer(n) {
    if (n.t === "str") return { k: "string" };
    if (n.t === "num") return { k: /^-?\d+$/.test(n.raw) ? "int" : "float" };
    if (n.t === "lit") return { k: n.v === "null" ? "null" : "bool" };
    if (n.t === "arr") return { k: "array", item: n.items.map(infer).reduce(merge, null) };
    const fields = new Map();
    for (const it of n.items) fields.set(it.k, { type: fields.has(it.k) ? merge(fields.get(it.k).type, infer(it.v)) : infer(it.v), opt: false });
    return { k: "object", fields };
  }

  function merge(a, b) {
    if (!a || !b) return a || b;
    if (a.k === "null") return { ...b, nul: true };
    if (b.k === "null") return { ...a, nul: true };
    const nul = !!(a.nul || b.nul);
    if (a.k === "object" && b.k === "object") {
      const fields = new Map();
      for (const [k, f] of a.fields) { const g = b.fields.get(k); fields.set(k, g ? { type: merge(f.type, g.type), opt: f.opt || g.opt } : { ...f, opt: true }); }
      for (const [k, f] of b.fields) if (!a.fields.has(k)) fields.set(k, { ...f, opt: true });
      return { k: "object", fields, nul };
    }
    if (a.k === "array" && b.k === "array") return { k: "array", item: merge(a.item, b.item), nul };
    if (a.k === b.k) return { ...a, nul };
    return { k: a.k !== "string" && b.k !== "string" && [a.k, b.k].every(k => k === "int" || k === "float") ? "float" : "any", nul };
  }

  // Object types get unique PascalCase names; post-order (nested types first).
  function collect(root, rootName) {
    const types = [], used = new Set();
    (function walk(t, name) {
      if (!t) return;
      if (t.k === "array") return walk(t.item, singular(name));
      if (t.k !== "object") return;
      let n = pascal(name), i = 2;
      while (used.has(n)) n = pascal(name) + i++;
      used.add(n);
      t.name = n;
      for (const [k, f] of t.fields) walk(f.type, k);
      types.push(t);
    })(root, rootName);
    return types;
  }

  const box = s => ({ long: "Long", double: "Double", boolean: "Boolean" })[s] || s;
  const LANGS = {
    go: { string: "string", int: "int64", float: "float64", bool: "bool", any: "any", arr: s => "[]" + s, nul: s => s === "any" || s.startsWith("[]") ? s : "*" + s },
    ts: { string: "string", int: "number", float: "number", bool: "boolean", any: "unknown", arr: s => (/[ |]/.test(s) ? "(" + s + ")" : s) + "[]", nul: s => s === "unknown" ? s : s + " | null" },
    cs: { string: "string", int: "long", float: "double", bool: "bool", any: "object", arr: s => "List<" + s + ">", nul: s => s + "?" },
    java: { string: "String", int: "long", float: "double", bool: "boolean", any: "Object", arr: s => "List<" + box(s) + ">", nul: box },
    cpp: { string: "std::string", int: "int64_t", float: "double", bool: "bool", any: "nlohmann::json", arr: s => "std::vector<" + s + ">", nul: s => s === "nlohmann::json" ? s : "std::optional<" + s + ">" },
  };

  const tref = (t, L) => !t || t.k === "null" || t.k === "any" ? L.any : t.k === "object" ? t.name : t.k === "array" ? L.arr(tref(t.item, L)) : L[t.k];
  const fieldType = (f, L, optToo) => { const s = tref(f.type, L); return f.type && (f.type.nul || (optToo && f.opt)) ? L.nul(s) : s; };
  const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));

  // Field identifiers: unique inside one type, never a keyword.
  function names(t, fn) {
    const used = new Set();
    return [...t.fields].map(([key, f]) => {
      let id = fn(key), base = id, i = 2;
      if (RESERVED.has(id)) id = base = id + "_";
      while (used.has(id)) id = base + i++;
      used.add(id);
      return { key, f, id };
    });
  }

  const EMIT = {
    go: types => types.slice().reverse().map(t => {
      const rows = names(t, k => pascal(k).replace(GO_CAPS, m => m.toUpperCase())).map(r => [r.id, fieldType(r.f, LANGS.go), "`json:\"" + r.key + (r.f.opt ? ",omitempty" : "") + "\"`"]);
      const w0 = Math.max(0, ...rows.map(r => r[0].length)), w1 = Math.max(0, ...rows.map(r => r[1].length));
      return "type " + t.name + " struct {\n" + rows.map(r => "\t" + pad(r[0], w0) + " " + pad(r[1], w1) + " " + r[2]).join("\n") + (rows.length ? "\n" : "") + "}";
    }).join("\n\n"),
    ts: types => types.slice().reverse().map(t => "export interface " + t.name + " {\n" + [...t.fields].map(([k, f]) =>
      "  " + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + (f.opt ? "?" : "") + ": " + fieldType(f, LANGS.ts) + ";").join("\n") + (t.fields.size ? "\n" : "") + "}").join("\n\n"),
    cs: types => "using System.Collections.Generic;\nusing System.Text.Json.Serialization;\n\n" + types.slice().reverse().map(t => "public class " + t.name + "\n{\n"
      + names(t, pascal).map(r => "    [JsonPropertyName(" + JSON.stringify(r.key) + ")]\n    public " + fieldType(r.f, LANGS.cs, true) + " " + (r.id === t.name ? r.id + "Value" : r.id) + " { get; set; }").join("\n\n")
      + (t.fields.size ? "\n" : "") + "}").join("\n\n"),
    java: types => "import com.fasterxml.jackson.annotation.JsonProperty;\nimport java.util.List;\n\n" + types.slice().reverse().map((t, i) => {
      const rows = names(t, camel), get = r => (r.f.type && r.f.type.k === "bool" && !r.f.type.nul && !r.f.opt ? "is" : "get") + r.id[0].toUpperCase() + r.id.slice(1);
      const fields = rows.map(r => "    @JsonProperty(" + JSON.stringify(r.key) + ")\n    private " + fieldType(r.f, LANGS.java, true) + " " + r.id + ";").join("\n");
      const access = rows.map(r => { const ty = fieldType(r.f, LANGS.java, true), up = r.id[0].toUpperCase() + r.id.slice(1);
        return "    public " + ty + " " + get(r) + "() { return " + r.id + "; }\n    public void set" + up + "(" + ty + " value) { this." + r.id + " = value; }"; }).join("\n");
      return (i ? "" : "public ") + "class " + t.name + " {\n" + fields + (rows.length ? "\n\n" + access + "\n" : "") + "}";
    }).join("\n\n"),
    cpp: types => {
      const body = types.map(t => "struct " + t.name + " {\n" + names(t, snake).map(r => "    " + fieldType(r.f, LANGS.cpp, true) + " " + r.id + ";").join("\n") + (t.fields.size ? "\n" : "") + "};").join("\n\n");
      const inc = Object.entries({ cstdint: "int64_t", optional: "std::optional", string: "std::string", vector: "std::vector" }).filter(([, use]) => body.includes(use)).map(([h]) => h);
      return inc.map(h => "#include <" + h + ">").join("\n") + (body.includes("nlohmann::") ? "\n#include <nlohmann/json.hpp>" : "") + "\n\n" + body;
    },
  };

  // ast from JsonTool.parse; lang: go | ts | cs | java | cpp.
  function generate(ast, lang, rootName = "Root") {
    const t = ast ? infer(ast) : null, root = t && t.k === "array" ? t.item : t;
    if (!root || root.k !== "object") throw new Error(T("Cần JSON là object hoặc mảng object để sinh kiểu."));
    return EMIT[lang](collect(root, rootName)) + "\n";
  }

  return { generate, pascal, camel, snake, singular, LANGS: Object.keys(EMIT) };
})();
