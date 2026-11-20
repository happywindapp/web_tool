// Preview body for Markdown: DOM built only from MdRender's whitelisted tree (no innerHTML); scrolling follows the source editor (MdScrollSync).
const PvMarkdown = (() => {
  const ALIGN = new Set(["left", "center", "right"]);
  const mk = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {});

  function figure(n) {
    const f = mk("figure", "md-diagram");
    f.dataset.line = n.line;
    if (n.src) { const img = mk("img"); img.src = n.src; img.alt = n.engine; if (n.w) img.style.width = Math.round(n.w) + "px"; f.append(img); return f; }
    const pre = mk("pre", n.pending ? "md-diagram-wait" : "md-diagram-err");
    pre.textContent = n.pending ? T("⏳ Đang vẽ {engine}…", { engine: n.engine }) : n.skipped ? T("Quá {n} sơ đồ — khối này không vẽ.", { n: n.skipped }) : "✖ " + n.error;
    f.append(pre);
    return f;
  }

  function build(n) {
    if (typeof n === "string") return document.createTextNode(n);
    if (n.t === "diagram") return figure(n);
    if (!Object.hasOwn(MdRender.TAGS, n.t)) return document.createTextNode("");
    const el = mk(n.t), allow = MdRender.TAGS[n.t];
    for (const [k, val] of Object.entries(n.a || {})) {
      if (!allow.includes(k)) continue;
      if (k === "align") { if (ALIGN.has(val)) el.style.textAlign = val; }
      else if (k === "href") { const u = MdInline.safeUrl(val); if (u) el.setAttribute("href", u); }
      else if (k === "src") { const u = MdInline.safeImg(val); if (u) el.setAttribute("src", u); }
      else el.setAttribute(k, val);
    }
    if (n.t === "a" && !/^#/.test(el.getAttribute("href") || "#")) { el.target = "_blank"; el.rel = "noopener noreferrer"; }
    if (n.line) el.dataset.line = n.line;
    if (n.slug) el.dataset.slug = n.slug;
    el.append(...(n.c || []).map(build));
    return el;
  }

  function jump(v, a) {
    let slug = a.getAttribute("href").slice(1);
    try { slug = decodeURIComponent(slug); } catch { /* keep the raw fragment */ }
    const h = [...v.el.querySelectorAll("[data-slug]")].find(x => x.dataset.slug === slug.toLowerCase());
    if (h) v.el.scrollTop = MdScrollSync.topOf(v.el, h);
  }

  function create(p) {
    const v = { el: mk("div", "pv-md"), tools: [], srcId: Docs.get(p.doc)?.link?.src, last: null, marks: null };
    v.el.addEventListener("click", e => { const a = e.target.closest("a[href^='#']"); if (a) { e.preventDefault(); jump(v, a); } });
    v.labels = () => { if (v.last) v.show(v.last); };
    v.mounted = () => requestAnimationFrame(() => MdScrollSync.syncNow(v));
    v.show = d => {
      v.last = d;
      v.el.replaceChildren(...(d.empty ? [] : d.nodes.map(build)));
      p.type.textContent = "Markdown";
      requestAnimationFrame(() => MdScrollSync.syncNow(v));
      return !d.empty;
    };
    v.destroy = () => MdScrollSync.detach(v);
    MdScrollSync.attach(v);
    return v;
  }

  return { create, build, init: () => MdScrollSync.init() };
})();
