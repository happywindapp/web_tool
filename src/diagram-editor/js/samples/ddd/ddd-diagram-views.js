// Neutral DDD model (ddd-model-*.js) → language-independent views: box graphs (groups + nodes + edges) and aggregate class groups.
const DddViews = (() => {
  const VIEWS = [
    { key: "subdomains", label: "Miền con (Subdomain map)", title: "Subdomain map" },
    { key: "context-map", label: "Bản đồ ngữ cảnh (Context map)", title: "Context map" },
    { key: "aggregates", label: "Thiết kế Aggregate (Tactical design)", title: "Aggregates" },
    { key: "event-flow", label: "Luồng sự kiện (Event storming)", title: "Event storming" },
    { key: "hexagonal", label: "Kiến trúc lục giác (Hexagonal)", title: "Hexagonal architecture" },
  ];
  const PALETTE = {
    core: ["#b45309", "#ffffff"], supporting: ["#0e7490", "#ffffff"], generic: ["#64748b", "#ffffff"], external: ["#334155", "#ffffff"],
    command: ["#2563eb", "#ffffff"], aggregate: ["#facc15", "#000000"], event: ["#fb923c", "#000000"], policy: ["#a855f7", "#ffffff"],
    adapter: ["#0e7490", "#ffffff"], port: ["#a5f3fc", "#000000"], domain: ["#facc15", "#000000"], member: ["#fef3c7", "#000000"],
  };
  const TYPE_NAME = { core: "Core", supporting: "Supporting", generic: "Generic" };
  const TIERS = ["core", "supporting", "generic"];

  // Partnership and Shared Kernel have no upstream, so these links are drawn without an arrow.
  const isSymmetric = note => /^(?:Partnership|Shared Kernel)/.test(note || "");
  const titleOf = (key, subject) => `${VIEWS.find(v => v.key === key).title}: ${subject}`;

  function subdomains(m) {
    const groups = TIERS.map(type => ({ id: type, name: `${TYPE_NAME[type]} subdomains`, nodes: m.contexts.filter(c => c.type === type)
      .map(c => ({ id: c.id, name: c.subdomain, type, caption: `[${TYPE_NAME[type]} subdomain]`, desc: c.desc })) }));
    return { title: titleOf("subdomains", m.name), rowsAreSteps: false, groups, nodes: [], edges: [] };
  }

  function contextMap(m) {
    const nodes = [...m.externals.map(e => ({ id: e.id, name: e.name, type: "external", caption: "[External system]", desc: e.desc })),
      ...m.contexts.map(c => ({ id: c.id, name: c.name, type: c.type, caption: `[Bounded context · ${TYPE_NAME[c.type]}]`, desc: c.desc }))];
    return { title: titleOf("context-map", m.name), rowsAreSteps: false, groups: [], nodes, edges: m.contextRels };
  }

  function eventFlow(m) {
    const edges = [], groups = m.eventFlow.map((s, i) => {
      const id = `step${i + 1}`, parts = [["command", s.command, "[Command]"], ["aggregate", s.aggregate, "[Aggregate]"], ["event", s.event, "[Domain event]"], ...(s.policy ? [["policy", s.policy, "[Policy]"]] : [])];
      const nodes = parts.map(([type, name, caption]) => ({ id: `${id}${type}`, name, type, caption, desc: "" }));
      nodes.slice(1).forEach((n, k) => edges.push([nodes[k].id, n.id, ""]));
      if (s.policy) edges.push([`${id}policy`, `step${i + 2}command`, ""]);
      return { id, name: `Step ${i + 1}: ${s.actor}`, nodes };
    });
    return { title: titleOf("event-flow", m.name), rowsAreSteps: true, groups, nodes: [], edges };
  }

  function hexagonal(m) {
    const groups = m.hexagonal.layers.map((l, i) => ({ id: `layer${i + 1}`, name: l.name, nodes: l.items.map(([id, name, desc]) => ({ id, name, type: l.type, caption: `[${l.name.replace(/s$/, "")}]`, desc })) }));
    return { title: titleOf("hexagonal", m.tacticalContext), rowsAreSteps: false, groups, nodes: [], edges: m.hexagonal.rels };
  }

  const graph = (m, key) => ({ subdomains, "context-map": contextMap, "event-flow": eventFlow, hexagonal }[key](m));
  const aggregates = m => ({ title: titleOf("aggregates", m.tacticalContext), groups: m.aggregates, rels: m.aggregateRels });

  return { VIEWS, PALETTE, isSymmetric, graph, aggregates };
})();
