// UI size small / medium / large: one localStorage key shared by every tool; sets html[data-ui-size] and binds every select.ui-size-pick.
const UiSize = (() => {
  const KEY = "web-tool.ui-size", SIZES = ["small", "medium", "large"], listeners = [];
  const get = () => { try { const v = localStorage.getItem(KEY); return SIZES.includes(v) ? v : "medium"; } catch { return "medium"; } };
  const picks = () => document.querySelectorAll("select.ui-size-pick");
  function apply(v) {
    document.documentElement.dataset.uiSize = v;
    picks().forEach(s => { s.value = v; });
    listeners.forEach(fn => fn(v));
  }
  function set(v) {
    if (!SIZES.includes(v)) return;
    try { localStorage.setItem(KEY, v); } catch { /* private mode: size lasts this page only */ }
    apply(v);
  }
  const onChange = fn => listeners.push(fn);
  apply(get());
  picks().forEach(s => s.addEventListener("change", () => set(s.value)));
  addEventListener("storage", e => { if (e.key === KEY) apply(get()); });
  return { SIZES, get, set, onChange };
})();
