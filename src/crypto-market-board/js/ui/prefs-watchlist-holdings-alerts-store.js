// Browser-only personal data (prefixed localStorage, survives blocked storage): options, ★ watchlist, holdings (qty + avg cost), notes, price alerts.
const Prefs = (() => {
  const P = "web_tool.crypto-market-board.";
  const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; } };
  return { get, set, P };
})();

const Watch = (() => {
  const DEFAULT = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "LINK"];
  let list = CoinParse.clean(Prefs.get("watch", DEFAULT));
  let backup = Prefs.get("watchBackup", null);
  const fns = [];
  const changed = () => { Prefs.set("watch", list); fns.forEach(f => f()); };
  const has = s => list.includes(s);
  function add(syms) { const fresh = syms.filter(s => !list.includes(s)); list = list.concat(fresh).slice(0, 200); if (fresh.length) changed(); return fresh; }
  function remove(syms) { const n = list.length; list = list.filter(s => !syms.includes(s)); if (list.length !== n) changed(); }
  const toggle = s => has(s) ? (remove([s]), false) : (add([s]), true);
  // Sample / share link replaces the list but keeps the viewer's own list for "↶ Khôi phục danh mục trước".
  function replace(syms) {
    const next = CoinParse.clean(syms);
    if (next.join() === list.join()) return false;
    if (!backup) { backup = list; Prefs.set("watchBackup", backup); }
    list = next; changed();
    return true;
  }
  function undo() { if (!backup) return; list = CoinParse.clean(backup); backup = null; Prefs.set("watchBackup", null); changed(); }
  return { all: () => [...list], has, add, remove, toggle, replace, undo, hasBackup: () => !!backup, onChange: f => fns.push(f) };
})();

// Holdings + note per ticker: { qty, cost, note }. Empty entry is removed.
const Holdings = (() => {
  const num = v => Number.isFinite(+v) && +v > 0 ? +v : null;
  function clean(raw) {
    const out = {};
    if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw)) {
      if (!CoinParse.isSymbol(k) || !v || typeof v !== "object") continue;
      const e = { qty: num(v.qty), cost: num(v.cost), note: typeof v.note === "string" ? v.note.slice(0, 2000) : "" };
      if (e.qty || e.cost || e.note) out[k] = e;
    }
    return out;
  }
  let all = clean(Prefs.get("holdings", {}));
  const fns = [];
  addEventListener("storage", e => { if (e.key === Prefs.P + "holdings") { all = clean(Prefs.get("holdings", {})); fns.forEach(f => f()); } });
  const get = sym => all[sym] || { qty: null, cost: null, note: "" };
  function set(sym, patch) {
    all = clean(Prefs.get("holdings", {}));
    const c = clean({ [sym]: { ...get(sym), ...patch } })[sym];
    if (c) all[sym] = c; else delete all[sym];
    Prefs.set("holdings", all); fns.forEach(f => f());
  }
  const merge = raw => { all = { ...clean(Prefs.get("holdings", {})), ...clean(raw) }; Prefs.set("holdings", all); fns.forEach(f => f()); };
  return { get, set, merge, entries: () => ({ ...all }), any: () => Object.values(all).some(h => h.qty), onChange: f => fns.push(f) };
})();

const Alerts = (() => {
  const MAX = 100;
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = arr => Array.isArray(arr) ? arr.filter(a => AlertRule.valid(a) && CoinParse.isSymbol(a.sym)).slice(0, MAX)
    .map(a => ({ id: /^[a-z0-9]{4,20}$/.test(a.id || "") ? a.id : id(), sym: a.sym, type: a.type, value: +a.value, fired: Number.isFinite(+a.fired) && +a.fired > 0 ? +a.fired : 0 })) : [];
  let list = clean(Prefs.get("alerts", []));
  const fns = [];
  const changed = () => { Prefs.set("alerts", list); fns.forEach(f => f()); };
  // Another tab may fire / edit alerts → re-read before every write.
  const reload = () => { list = clean(Prefs.get("alerts", [])); };
  addEventListener("storage", e => { if (e.key === Prefs.P + "alerts") { reload(); fns.forEach(f => f()); } });

  function add(sym, type, value) {
    reload();
    const a = { id: id(), sym, type, value: +value, fired: 0 };
    if (!AlertRule.valid(a) || !CoinParse.isSymbol(sym) || list.length >= MAX) return false;
    list = [...list, a]; changed();
    return true;
  }
  const remove = aid => { reload(); list = list.filter(a => a.id !== aid); changed(); };
  const rearm = aid => { reload(); list = list.map(a => a.id === aid ? { ...a, fired: 0 } : a); changed(); };
  const merge = raw => { reload(); const have = new Set(list.map(a => `${a.sym}|${a.type}|${a.value}`)); list = [...list, ...clean(raw).filter(a => !have.has(`${a.sym}|${a.type}|${a.value}`))].slice(0, MAX); changed(); };
  function check(rows) {
    reload();
    const r = AlertRule.check(list, rows);
    if (r.hits.length) { list = r.list; changed(); }
    return r.hits;
  }
  return { add, remove, rearm, merge, check, all: () => list.slice(), symbols: () => [...new Set(list.filter(a => !a.fired).map(a => a.sym))], onChange: f => fns.push(f) };
})();
