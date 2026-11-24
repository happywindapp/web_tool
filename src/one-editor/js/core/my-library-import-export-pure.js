// My library file (pure): export JSON { version, snippets, macros, replaceSets, recipes }; import parses untrusted JSON (≤ 5 MB), keeps only well-formed fields, merges by name (replace or "name (2)").
const MyLibrary = (() => {
  const VERSION = 1, MAX_BYTES = 5 * 1024 * 1024, BAD_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const arr = v => (Array.isArray(v) ? v : []);
  const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
  const fail = code => Object.assign(new Error(code), { code });

  const snippets = list => arr(list).filter(s => s && typeof s.prefix === "string" && s.prefix.trim() && typeof s.body === "string").slice(0, 500)
    .map(s => ({ prefix: s.prefix.trim().slice(0, 60), body: s.body.slice(0, 100000), lang: str(s.lang, 40), desc: str(s.desc, 120) }));

  const KEY_FLAGS = ["ctrlKey", "shiftKey", "altKey", "metaKey"];
  function step(s) {
    if (!s || typeof s !== "object") return null;
    if (typeof s.c === "string") return { c: s.c.slice(0, 80) };
    if (typeof s.t === "string") return { t: s.t.slice(0, 10000) };
    if (typeof s.p === "string") return { p: s.p.slice(0, 100000) };
    if (s.k && typeof s.k === "object" && typeof s.k.key === "string") {
      const k = { key: s.k.key.slice(0, 30), code: str(s.k.code, 30) };
      for (const f of KEY_FLAGS) if (s.k[f] === true) k[f] = true;
      return { k };
    }
    return null;
  }
  // Object { name: steps } → [{ name, steps }] (prototype keys refused).
  function macros(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
    return Object.keys(obj).filter(n => !BAD_KEYS.has(n) && n.trim()).slice(0, 200)
      .map(n => ({ name: n.trim().slice(0, 80), steps: arr(obj[n]).slice(0, 20000).map(step).filter(Boolean) })).filter(m => m.steps.length);
  }
  // Rules / steps are cleaned again by their own store (BatchRules.clean, RecipeRun.clean).
  const named = (list, field) => arr(list).filter(x => x && typeof x.name === "string" && x.name.trim()).slice(0, 100).map(x => ({ name: x.name.trim().slice(0, 80), [field]: arr(x[field]) }));

  // text → { snippets, macros: [{ name, steps }], replaceSets, recipes }; throws .code "big" | "json" | "format".
  function parse(text) {
    if (typeof text !== "string" || text.length > MAX_BYTES) throw fail("big");
    let o;
    try { o = JSON.parse(text); } catch { throw fail("json"); }
    if (!o || typeof o !== "object" || o.version !== VERSION) throw fail("format");
    return { snippets: snippets(o.snippets), macros: macros(o.macros), replaceSets: named(o.replaceSets, "rules"), recipes: named(o.recipes, "steps") };
  }

  const pack = ({ snippets = [], macros = {}, replaceSets = [], recipes = [] }) => JSON.stringify({ version: VERSION, app: "one-editor-library", snippets, macros, replaceSets, recipes }, null, 2);

  function uniqueName(name, taken, sep = " ") {
    if (!taken.has(name)) return name;
    for (let i = 2; ; i++) { const n = sep === " " ? `${name} (${i})` : name + i; if (!taken.has(n)) return n; }
  }

  // Same key: replace=true swaps the old item in place, false keeps both with the new one renamed (field = the name field).
  function merge(old, incoming, { key, field, replace, sep = " " }) {
    const out = old.slice(), taken = new Set(old.map(key)), names = new Set(old.map(x => x[field]));
    for (const it of incoming) {
      const at = out.findIndex(x => key(x) === key(it));
      if (at < 0) { out.push(it); taken.add(key(it)); names.add(it[field]); continue; }
      if (replace) { out[at] = it; continue; }
      const renamed = { ...it, [field]: uniqueName(it[field], names, sep) };
      names.add(renamed[field]);
      out.push(renamed);
    }
    return out;
  }
  const clashes = (old, incoming, key) => { const s = new Set(old.map(key)); return incoming.filter(x => s.has(key(x))).length; };

  return { VERSION, MAX_BYTES, parse, pack, merge, clashes, uniqueName };
})();
