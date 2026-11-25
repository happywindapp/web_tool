// Profile backup file (pure, node test): { app: "one-editor-profile", version: 1, prefs, meta, notes, history? }; folder / file handles cannot leave the browser (counted as skipped); import cleans untrusted JSON and also reads a "one-editor-library" file.
const ProfileFile = (() => {
  const APP = "one-editor-profile", VERSION = 1, MAX_BYTES = 200 * 1024 * 1024;
  const META_KEYS = ["groups", "pinned", "tags", "snippets", "macros", "replaceSets", "recipes", "keybindings"];
  const BAD = new Set(["__proto__", "constructor", "prototype"]), SECRET_PREFS = new Set(["gdriveKey"]);
  const fail = code => Object.assign(new Error(code), { code });
  const arr = v => (Array.isArray(v) ? v : []);
  const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : null);
  const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
  const B64 = /^[\w+/=-]*$/;

  // Group / pinned item without a handle: a note by id or a cloud folder link.
  const item = p => p?.kind === "note" && typeof p.id === "string" ? { kind: "note", id: p.id.slice(0, 80) }
    : p?.kind === "cloud" && typeof p.link === "string" && typeof p.name === "string" ? { kind: "cloud", name: p.name.slice(0, 200), link: p.link.slice(0, 2000) } : null;
  const items = list => arr(list).map(item).filter(Boolean);
  const groups = list => arr(list).filter(g => g && typeof g.id === "string" && typeof g.name === "string").slice(0, 200).map(g => ({ id: g.id.slice(0, 80), name: g.name.slice(0, 120), items: items(g.items).slice(0, 2000) }));
  function tags(o) {
    const out = {}, COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];
    for (const [k, v] of Object.entries(obj(o) || {}).slice(0, 5000)) if (k && !BAD.has(k) && COLORS.includes(v)) out[k] = v;
    return out;
  }
  function keybindings(o) {
    const out = {};
    for (const [k, v] of Object.entries(obj(o) || {}).slice(0, 2000)) if (!BAD.has(k) && (typeof v === "string" || (Array.isArray(v) && v.every(x => typeof x === "string")))) out[k.slice(0, 80)] = Array.isArray(v) ? v.slice(0, 8).map(x => x.slice(0, 40)) : v.slice(0, 40);
    return out;
  }
  // PBKDF2 rounds from a file are clamped: a huge count would hang the tab.
  const rounds = (it, def) => Number.isInteger(it) ? Math.min(2000000, Math.max(100000, it)) : def;
  function sealed(s) { return obj(s) && typeof s.salt === "string" && typeof s.iv === "string" && typeof s.ct === "string" && B64.test(s.salt + s.iv) ? { salt: s.salt, iv: s.iv, ct: s.ct, it: rounds(s.it, 310000) } : undefined; }
  const notes = list => arr(list).filter(n => n && typeof n.id === "string" && typeof n.text === "string").slice(0, 20000).map(n => ({
    id: n.id.slice(0, 80), kind: "note", name: str(n.name, 200) || "note", lang: str(n.lang, 40), text: n.text, updated: Number.isFinite(n.updated) ? n.updated : 0,
    marks: arr(n.marks).filter(Number.isInteger).slice(0, 5000), eol: n.eol === "\r\n" || n.eol === "\r" ? n.eol : "\n", sealed: sealed(n.sealed), spell: typeof n.spell === "boolean" ? n.spell : undefined, pending: false }));
  const history = list => arr(list).filter(h => h && obj(h.rec) && typeof h.rec.id === "string" && typeof h.text === "string").slice(0, 5000)
    .map(h => ({ rec: { id: h.rec.id.slice(0, 80), key: str(h.rec.key, 300), name: str(h.rec.name, 200), t: +h.rec.t || 0, size: +h.rec.size || 0, sum: str(h.rec.sum, 80) }, text: h.text }));
  function prefs(o) {
    const out = {};
    for (const [k, v] of Object.entries(obj(o) || {}).slice(0, 1000)) if (!BAD.has(k) && !SECRET_PREFS.has(k) && v !== undefined && JSON.stringify(v).length <= 100000) out[k.slice(0, 80)] = v;
    return out;
  }
  // Snippets / macros / replace sets / recipes are cleaned by the My library rules.
  const library = m => MyLibrary.parse(JSON.stringify({ version: MyLibrary.VERSION, snippets: m.snippets, macros: m.macros, replaceSets: m.replaceSets, recipes: m.recipes }), MAX_BYTES);

  // Saved state → { profile, skipped }: handles stay behind (a group / pin of a folder, bookmarks of closed files).
  function build({ prefs: p = {}, meta = {}, notes: ns = [], history: hs = null, created = new Date().toISOString() }) {
    const handles = list => arr(list).filter(x => x && (x.kind === "dir" || x.kind === "file")).length;
    const skipped = handles(meta.pinned) + arr(meta.groups).reduce((n, g) => n + handles(g?.items), 0) + arr(meta.bookmarks).length;
    const m = { groups: groups(meta.groups), pinned: items(meta.pinned), tags: tags(meta.tags), keybindings: keybindings(meta.keybindings), snippets: arr(meta.snippets), macros: obj(meta.macros) || {}, replaceSets: arr(meta.replaceSets), recipes: arr(meta.recipes) };
    const profile = { app: APP, version: VERSION, created, prefs: prefs(p), meta: m, notes: notes(ns), ...(hs ? { history: history(hs) } : {}) };
    return { profile, skipped };
  }

  // Untrusted text → a clean profile; throws .code "big" | "json" | "format".
  function parse(text) {
    if (typeof text !== "string" || text.length > MAX_BYTES) throw fail("big");
    let o;
    try { o = JSON.parse(text); } catch { throw fail("json"); }
    if (o?.app === "one-editor-library") {
      const lib = MyLibrary.parse(text);
      return { app: APP, version: VERSION, created: "", prefs: {}, meta: { snippets: lib.snippets, macros: Object.fromEntries(lib.macros.map(x => [x.name, x.steps])), replaceSets: lib.replaceSets, recipes: lib.recipes }, notes: [], has: { notes: false, prefs: false }, fromLibrary: true };
    }
    if (o?.app !== APP || o.version !== VERSION || !obj(o.meta)) throw fail("format");
    const m = o.meta, lib = library(m), out = { snippets: lib.snippets, macros: Object.fromEntries(lib.macros.map(x => [x.name, x.steps])), replaceSets: lib.replaceSets, recipes: lib.recipes };
    if ("groups" in m) out.groups = groups(m.groups);
    if ("pinned" in m) out.pinned = items(m.pinned);
    if ("tags" in m) out.tags = tags(m.tags);
    if ("keybindings" in m) out.keybindings = keybindings(m.keybindings);
    return { app: APP, version: VERSION, created: str(o.created, 40), prefs: prefs(o.prefs), meta: out, notes: notes(o.notes), has: { notes: Array.isArray(o.notes), prefs: !!obj(o.prefs) }, ...(Array.isArray(o.history) ? { history: history(o.history) } : {}) };
  }

  function counts(p) {
    const m = p.meta;
    return { prefs: Object.keys(p.prefs).length, keybindings: Object.keys(m.keybindings || {}).length, groups: arr(m.groups).length, pinned: arr(m.pinned).length, tags: Object.keys(m.tags || {}).length,
      snippets: arr(m.snippets).length, macros: Object.keys(m.macros || {}).length, replaceSets: arr(m.replaceSets).length, recipes: arr(m.recipes).length, notes: p.notes.length, history: arr(p.history).length };
  }

  const snipKey = s => s.prefix + "\u0000" + (s.lang || "");
  const byName = x => x.name, byId = x => x.id;
  const macroList = m => Object.entries(m || {}).map(([name, steps]) => ({ name, steps }));
  const overlap = (a, b, key) => { const s = new Set(arr(a).map(key)); return arr(b).filter(x => s.has(key(x))).length; };
  // A note already here with the same name and text is the same note (re-importing one's own backup).
  const noteKey = n => n.id + "\u0000" + n.name + "\u0000" + n.text;
  const sameNotes = cur => new Set(arr(cur.notes).map(noteKey));
  // Same name / id in the current data and the file (snippets, macros, replace sets, recipes, changed notes); same-id groups are joined.
  const clashes = (cur, inc) => overlap(cur.meta.snippets, inc.meta.snippets, snipKey) + overlap(macroList(cur.meta.macros), macroList(inc.meta.macros), byName)
    + overlap(cur.meta.replaceSets, inc.meta.replaceSets, byName) + overlap(cur.meta.recipes, inc.meta.recipes, byName) + overlap(cur.notes, inc.notes.filter(n => !sameNotes(cur).has(noteKey(n))), byId);

  // mode "all" = the file replaces every kind it has; "replace" / "keep" merge (same name: take the file's / keep both, the file's renamed).
  // cur / inc: { meta, notes, history? } → { meta, notes (to write), dropNotes (ids), history (to add) }.
  function plan(cur, inc, mode, newId = id => id + "-" + Math.random().toString(36).slice(2, 8)) {
    const cm = cur.meta, im = inc.meta;
    // Kinds the file does not have (a library file has no notes) stay as they are.
    if (mode === "all") {
      const keep = new Set(inc.notes.map(byId));
      return { meta: { ...im }, notes: inc.notes, dropNotes: inc.has?.notes === false ? [] : arr(cur.notes).map(byId).filter(id => !keep.has(id)), history: arr(inc.history) };
    }
    const replace = mode === "replace", opt = (key, field, sep) => ({ key, field, replace, sep });
    // Notes kept side by side get a new id; groups / pins of the file follow it.
    const curIds = new Set(arr(cur.notes).map(byId)), ids = new Map(), noteNames = new Set(arr(cur.notes).map(n => n.name));
    const same = sameNotes(cur);
    const notesOut = inc.notes.filter(n => !same.has(noteKey(n))).map(n => {
      if (!curIds.has(n.id) || replace) return n;
      const id = newId(n.id), name = MyLibrary.uniqueName(n.name, noteNames);
      ids.set(n.id, id); noteNames.add(name);
      return { ...n, id, name };
    });
    const remap = list => arr(list).map(p => p.kind === "note" && ids.has(p.id) ? { ...p, id: ids.get(p.id) } : p);
    const meta = {};
    if (im.snippets) meta.snippets = MyLibrary.merge(arr(cm.snippets), im.snippets, opt(snipKey, "prefix", ""));
    if (im.macros) meta.macros = Object.fromEntries(MyLibrary.merge(macroList(cm.macros), macroList(im.macros), opt(byName, "name", " ")).map(x => [x.name, x.steps]));
    if (im.replaceSets) meta.replaceSets = MyLibrary.merge(arr(cm.replaceSets), im.replaceSets, opt(byName, "name", " "));
    if (im.recipes) meta.recipes = MyLibrary.merge(arr(cm.recipes), im.recipes, opt(byName, "name", " "));
    // Same group id: the items are joined, so the folders / files kept here (handles a file cannot carry) stay.
    if (im.groups) {
      const itemKey = p => p.kind + ":" + (p.id || p.link || p.name), out = arr(cm.groups).map(g => ({ ...g, items: arr(g.items).slice() }));
      for (const g of im.groups) {
        const old = out.find(x => x.id === g.id), items = remap(g.items);
        if (!old) { out.push({ ...g, items }); continue; }
        const seen = new Set(old.items.map(itemKey));
        old.items.push(...items.filter(p => !seen.has(itemKey(p))));
        if (replace) old.name = g.name;
      }
      meta.groups = out;
    }
    if (im.pinned) { const k = p => p.kind + ":" + (p.id || p.link), seen = new Set(arr(cm.pinned).map(k)); meta.pinned = [...arr(cm.pinned), ...remap(im.pinned).filter(p => !seen.has(k(p)))]; }
    if (im.tags) meta.tags = replace ? { ...cm.tags, ...im.tags } : { ...im.tags, ...cm.tags };
    if (im.keybindings) meta.keybindings = replace ? { ...cm.keybindings, ...im.keybindings } : { ...im.keybindings, ...cm.keybindings };
    const have = new Set(arr(cur.history).map(h => h.rec.id));
    return { meta, notes: notesOut, dropNotes: [], history: arr(inc.history).filter(h => !have.has(h.rec.id)) };
  }

  return { APP, VERSION, MAX_BYTES, META_KEYS, build, parse, counts, clashes, plan, rounds };
})();
