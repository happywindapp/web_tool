// UI language VI/EN: saved choice (shared by every tool) → browser language; English dictionary is keyed by the Vietnamese text.
const I18n = (() => {
  const KEY = "web_tool.lang", EN = {}, listeners = [];
  const SKIP = "script,style,textarea,pre,code,svg,table,[contenteditable],[data-i18n-skip]";
  const origText = new WeakMap(), origAttr = new WeakMap();
  let origTitle = null;
  let lang = (() => {
    try { const v = localStorage.getItem(KEY); if (v === "vi" || v === "en") return v; } catch { /* storage blocked */ }
    const nav = globalThis.navigator;
    return !nav || /^vi\b/i.test(nav.language || "") ? "vi" : "en";
  })();

  const word = s => lang === "en" && Object.hasOwn(EN, s) ? EN[s] : s;
  const t = (vi, params) => params ? word(vi).replace(/\{(\w+)\}/g, (m, k) => Object.hasOwn(params, k) ? String(params[k]) : m) : word(vi);
  const num = n => n.toLocaleString(lang);
  const swap = src => { const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(src); return m[1] + word(m[2]) + m[3]; };

  // Static markup keeps its Vietnamese source; the original of each text node / attribute is remembered so switching back is exact.
  function apply(root = document.body) {
    document.documentElement.lang = lang;
    if (origTitle === null) origTitle = document.title;
    document.title = word(origTitle);
    for (const el of [root, ...root.querySelectorAll("*")]) {
      if (el.parentElement && el.parentElement.closest(SKIP)) continue;
      if (!el.matches(SKIP)) for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.data.trim()) continue;
        if (!origText.has(n)) origText.set(n, n.data);
        n.data = swap(origText.get(n));
      }
      for (const a of ["title", "placeholder"]) {
        if (!el.hasAttribute(a)) continue;
        if (!origAttr.has(el)) origAttr.set(el, {});
        const o = origAttr.get(el);
        o[a] ??= el.getAttribute(a);
        el.setAttribute(a, swap(o[a]));
      }
    }
    document.querySelectorAll("[data-lang]").forEach(b => { b.classList.toggle("on", b.dataset.lang === lang); b.setAttribute("aria-pressed", b.dataset.lang === lang); });
  }

  function set(l) {
    if (l === lang) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch { /* storage blocked → choice lasts until reload */ }
    apply();
    listeners.forEach(f => f(l));
  }

  function init() {
    document.querySelectorAll("[data-lang]").forEach(b => { b.onclick = () => set(b.dataset.lang); });
    apply();
  }

  return { t, num, set, init, add: d => Object.assign(EN, d), onChange: f => listeners.push(f), get lang() { return lang; } };
})();
const T = I18n.t;
