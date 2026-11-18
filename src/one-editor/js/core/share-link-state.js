// Share-link / demo payload ↔ tabs: { v:1, views:[[{ n:name, l:language ("" = auto), t:text }], […]], wrap, run? }. Untrusted: only known fields of known types are kept.
const ShareState = (() => {
  const MAX_TABS = 30;
  const tab = d => ({ n: d.name, l: d.lang || "", t: d.text });
  const build = (views, wrap) => ({ v: 1, views: views.map(list => list.map(tab)), wrap: !!wrap });
  const cleanName = n => typeof n === "string" ? n.replace(/[\p{Cc}\\/:*?"<>|]+/gu, "_").trim().slice(0, 120) : "";

  // → { views: [[{ name, lang, text }], [...]], wrap, run }; throws on a payload with no usable tab.
  function parse(obj) {
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.views)) throw new Error(T("Link không đúng định dạng của One Editor."));
    const views = obj.views.slice(0, 2).map(list => (Array.isArray(list) ? list : []).slice(0, MAX_TABS)
      .filter(x => x && typeof x === "object" && typeof x.t === "string")
      .map(x => ({ name: cleanName(x.n), lang: LangDetect.ids.includes(x.l) ? x.l : "", text: x.t })));
    while (views.length < 2) views.push([]);
    if (!views[0].length && !views[1].length) throw new Error(T("Link không có tab nào."));
    return { views, wrap: obj.wrap === true, run: OutputOps.get(obj.run) ? obj.run : "" };
  }

  return { build, parse, cleanName, MAX_TABS };
})();
