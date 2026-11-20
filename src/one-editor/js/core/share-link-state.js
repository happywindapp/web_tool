// Share-link / demo payload ↔ tabs: { v:1, views:[[{ n:name, l:language ("" = auto), t:text, p?:true (had a preview) }], … up to 4], layout?, wrap, run? }. Untrusted: only known fields of known types are kept.
const ShareState = (() => {
  const MAX_TABS = 30;
  const tab = d => ({ n: d.name, l: d.lang || "", t: d.text, p: d.preview ? true : undefined });
  const build = (views, wrap, layout, compare, run) => ({ v: 1, views: views.map(list => list.map(tab)), layout, wrap: !!wrap, compare: compare || undefined, run: run || undefined });
  const cleanName = n => typeof n === "string" ? n.replace(/[\p{Cc}\\/:*?"<>|]+/gu, "_").trim().slice(0, 120) : "";

  // → { views: [[{ name, lang, text }], …] (≥ 2 lists), layout, wrap, run }; throws on a payload with no usable tab.
  function parse(obj) {
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.views)) throw new Error(T("Link không đúng định dạng của One Editor."));
    const views = obj.views.slice(0, Layouts.MAX).map(list => (Array.isArray(list) ? list : []).slice(0, MAX_TABS)
      .filter(x => x && typeof x === "object" && typeof x.t === "string")
      .map(x => ({ name: cleanName(x.n), lang: LangDetect.ids.includes(x.l) ? x.l : "", text: x.t, ...(x.p === true ? { preview: true } : {}) })));
    while (views.length > 2 && !views[views.length - 1].length) views.pop();
    while (views.length < 2) views.push([]);
    if (!views.some(v => v.length)) throw new Error(T("Link không có tab nào."));
    const layout = Layouts.get(obj.layout) && Layouts.get(obj.layout).n >= views.length ? obj.layout : views.length > 2 ? Layouts.forCount(views.length) : "";
    // A link never starts a translation (it could send the link's text to MyMemory without a click); 🔗 carries the translation as a plain tab.
    const run = OutputOps.get(obj.run) && obj.run !== "translate" ? obj.run : "";
    // opts: run op settings (checked by the op); a link never runs code.
    const opts = run && obj.opts && typeof obj.opts === "object" ? obj.opts : null;
    // A regex from a link (regex tester, recipe replace / filter) waits for ▶: a catastrophic pattern would hang the page on open.
    const held = run === "regex" || (run === "recipe" && Array.isArray(opts) && opts.some(s => s && (s.op === "replace" || s.op === "filter"))) ? run : "";
    return { views, layout, wrap: obj.wrap === true, run: run === "run-code" || held ? "" : run, ...(opts ? { opts } : {}), ...(held ? { held } : {}), compare: obj.compare === true || obj.compare === "json" ? obj.compare : false };
  }

  return { build, parse, cleanName, MAX_TABS };
})();
