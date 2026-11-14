// Personal data kept in this browser only: price alerts and per-ticker notes + own target price.
const Alerts = (() => {
  const MAX = 100;
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = arr => Array.isArray(arr) ? arr.filter(a => AlertRule.valid(a) && WatchParse.isSymbol(a.sym)).slice(0, MAX)
    .map(a => ({ id: /^[a-z0-9]{4,20}$/.test(a.id || "") ? a.id : id(), sym: a.sym, type: a.type, value: +a.value, fired: /^\d{8}$/.test(a.fired || "") ? a.fired : "" })) : [];
  let list = clean(Prefs.get("alerts", []));
  const listeners = [];
  const changed = () => { Prefs.set("alerts", list); listeners.forEach(f => f()); };
  // Another tab may have changed the saved list → re-read before every write and follow its storage events.
  const reload = () => { list = clean(Prefs.get("alerts", [])); };
  addEventListener("storage", e => { if (e.key && e.key.endsWith(".alerts")) { reload(); listeners.forEach(f => f()); } });

  function add(sym, type, value) {
    reload();
    const a = { id: id(), sym, type, value: +value, fired: "" };
    // Indices / typos would be polled forever without ever firing.
    if (!AlertRule.valid(a) || !WatchParse.isSymbol(sym) || (Universe.ready() && !Universe.has(sym)) || list.length >= MAX) return false;
    list = [...list, a]; changed();
    return true;
  }
  const remove = aid => { reload(); list = list.filter(a => a.id !== aid); changed(); };
  const symbols = () => [...new Set(list.map(a => a.sym))];

  // Called after every poll with all fetched quotes; returns the alerts that just fired.
  function check(quotes) {
    reload();
    const r = AlertRule.check(list, quotes, QuoteModel.vnDate());
    if (r.hits.length) { list = r.list; changed(); }
    return r.hits;
  }

  return { add, remove, symbols, check, all: () => list.slice(), onChange: f => listeners.push(f) };
})();

const Notes = (() => {
  const clean = raw => {
    const out = {};
    if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw)) {
      if (!WatchParse.isSymbol(k) || !v || typeof v !== "object") continue;
      const text = typeof v.text === "string" ? v.text.slice(0, 2000) : "", target = Number.isFinite(+v.target) && +v.target > 0 ? +v.target : null;
      if (text || target) out[k] = { text, target };
    }
    return out;
  };
  let all = clean(Prefs.get("notes", {}));
  addEventListener("storage", e => { if (e.key && e.key.endsWith(".notes")) all = clean(Prefs.get("notes", {})); });

  const get = sym => all[sym] || { text: "", target: null };
  // Empty text + no target removes the entry.
  function set(sym, text, target) {
    const c = clean({ [sym]: { text, target } })[sym];
    all = clean(Prefs.get("notes", {}));
    if (c) all[sym] = c; else delete all[sym];
    Prefs.set("notes", all);
  }
  // Board column support: copy the own target onto each quote object (quotes are rebuilt every poll).
  const decorate = quotes => { for (const q of quotes) q.target = all[q.sym]?.target ?? null; };

  return { get, set, decorate, entries: () => ({ ...all }) };
})();
