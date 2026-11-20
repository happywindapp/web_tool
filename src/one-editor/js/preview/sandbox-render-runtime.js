// Runs inside tools/one-editor-preview-sandbox.html (sandboxed iframe, origin null): { id, engine, code, cfg, lang } in → { id, svg, … } or { id, error } back to the parent, nothing else.
const GraphvizEngine = {
  ready: () => Graphviz.ready(),
  render(code) {
    try { return { svg: Graphviz.svg(code), type: "Graphviz", bg: "#ffffff" }; }
    catch (e) { const m = /line (\d+)/i.exec(e.message); throw new DiagramError(e.message, { line: m ? +m[1] : 0, syntax: true }); }
  },
};

(() => {
  const ENGINES = { mermaid: MermaidEngine, plantuml: PlantumlEngine, d2: D2Engine, dbml: DbmlEngine, structurizr: StructurizrEngine, graphviz: GraphvizEngine };
  const loaded = {};
  let seq = 0;
  const reply = m => parent.postMessage(m, "*");
  const load = name => loaded[name] ??= ENGINES[name].ready().catch(e => { delete loaded[name]; throw Object.assign(new Error(String(e?.message || e)), { load: true }); });

  addEventListener("message", async e => {
    const m = e.data;
    if (e.source !== parent || !m || typeof m !== "object" || typeof m.id !== "number" || typeof m.code !== "string" || !Object.hasOwn(ENGINES, m.engine)) return;
    if (m.lang === "vi" || m.lang === "en") I18n.set(m.lang);
    try {
      await load(m.engine);
      const r = await ENGINES[m.engine].render(m.code, m.cfg && typeof m.cfg === "object" ? m.cfg : {}, ++seq);
      const pick = r.pick ? { key: String(r.pick.key), value: String(r.pick.value), options: r.pick.options.map(([v, l]) => [String(v), String(l)]) } : null;
      reply({ id: m.id, svg: String(r.svg), type: String(r.type || ""), bg: String(r.bg || "#ffffff"), warnings: (r.warnings || []).map(String), pick });
    } catch (err) {
      reply({ id: m.id, error: { message: String(err?.message || err), line: +err?.line || 0, syntax: !!err?.syntax, what: String(err?.what || ""), load: !!err?.load } });
    }
  });
  reply({ ready: true });
})();
