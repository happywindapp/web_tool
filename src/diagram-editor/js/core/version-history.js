// Version history per engine: auto snapshot at most once a minute on a successful render; newest first, capped.
const VersionHistory = (() => {
  const MAX = 30;
  const list = store => store.get("history", []);
  function add(store, code, config, force) {
    const h = list(store), top = h[0];
    if (!code.trim() || (top && top.code === code && top.config === config)) return false;
    if (!force && top && Date.now() - top.t < 60000) return false;
    h.unshift({ t: Date.now(), code, config });
    for (let n = MAX; n >= 1; n >>= 1) if (store.set("history", h.slice(0, n))) return true;
    return false;
  }
  const remove = (store, t) => store.set("history", list(store).filter(v => v.t !== t));
  return { list, add, remove, clear: store => store.del("history") };
})();
