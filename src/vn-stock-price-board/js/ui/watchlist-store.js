// ★ watchlist + board options in localStorage (prefixed per tool); every access survives blocked storage.
const Prefs = (() => {
  const P = "web_tool.vn-stock-price-board.";
  const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; } };
  return { get, set };
})();

const Watch = (() => {
  const DEFAULT = ["VNM", "FPT", "HPG", "VCB", "MWG", "SSI"];
  let list = WatchParse.clean(Prefs.get("watch", DEFAULT));
  let backup = Prefs.get("watchBackup", null);
  const listeners = [];
  const changed = () => { Prefs.set("watch", list); listeners.forEach(f => f()); };

  const all = () => [...list];
  const has = s => list.includes(s);
  function add(symbols) { const fresh = symbols.filter(s => !list.includes(s)); list = list.concat(fresh); if (fresh.length) changed(); return fresh; }
  function remove(symbols) { const n = list.length; list = list.filter(s => !symbols.includes(s)); if (list.length !== n) changed(); }
  const toggle = s => has(s) ? (remove([s]), false) : (add([s]), true);

  // Demo / share link replace the list but keep the previous one for "↶ Khôi phục danh mục trước".
  function replace(symbols) {
    const next = WatchParse.clean(symbols);
    if (next.join() === list.join()) return false;
    // Keep the user's own list across several samples / links and across reloads.
    if (!backup) { backup = list; Prefs.set("watchBackup", backup); }
    list = next; changed();
    return true;
  }
  function undo() { if (!backup) return; list = WatchParse.clean(backup); backup = null; Prefs.set("watchBackup", null); changed(); }

  return { all, has, add, remove, toggle, replace, undo, hasBackup: () => !!backup, onChange: f => listeners.push(f) };
})();
