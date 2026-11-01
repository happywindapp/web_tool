// Structurizr only knows C4, so each DDD diagram is a helper softwareSystem whose containers are the diagram's boxes, drawn as one container view.
const DddToStructurizr = (() => {
  const q = s => `"${s}"`;
  const scoped = (view, id) => `${view.replace(/\W/g, "")}_${id}`;

  const KIND_TAG = { "domain event": "event", "aggregate root": "aggregate" };
  // Structurizr rejects two containers with one name in a system, and event storming repeats aggregates.
  const uniqueNames = nodes => {
    const seen = new Map();
    return nodes.map(n => {
      seen.set(n.name, (seen.get(n.name) || 0) + 1);
      return seen.get(n.name) > 1 ? { ...n, name: `${n.name} (${seen.get(n.name)})` } : n;
    });
  };

  function viewOf(m, key) {
    if (key !== "aggregates") {
      const v = DddViews.graph(m, key);
      return { title: v.title, nodes: uniqueNames([...v.groups.flatMap(g => g.nodes), ...v.nodes].map(n => ({ id: n.id, name: n.name, desc: n.desc, tech: n.caption.slice(1, -1), tag: n.type }))), edges: v.edges };
    }
    const v = DddViews.aggregates(m);
    return { title: v.title, nodes: v.groups.flatMap(g => g.classes.map(c => ({ id: c.name, name: c.name, desc: c.members.join(" · "), tech: c.kind, tag: KIND_TAG[c.kind] || "member" }))), edges: v.rels };
  }

  function build(m) {
    const views = DddViews.VIEWS.map(({ key }) => ({ key, ...viewOf(m, key) }));
    const system = v => [`        ${scoped(v.key, "view")} = softwareSystem ${q(v.title)} {`, ...v.nodes.map(n => `            ${scoped(v.key, n.id)} = container ${q(n.name)} ${q(n.desc)} ${q(n.tech)} ${q(n.tag)}`), "        }"];
    const rel = v => ([from, to, label, note]) => `        ${scoped(v.key, from)} -> ${scoped(v.key, to)} ${q(label)}${note ? ` ${q(note)}` : ""}`;
    const view = v => [`        container ${scoped(v.key, "view")} ${q(`ddd-${v.key}`)} {`, `            title ${q(v.title)}`, "            include *", `            autoLayout ${v.edges.length ? "tb" : "lr"}`, "        }"];
    const tags = [...new Set(views.flatMap(v => v.nodes.map(n => n.tag)))];
    const styles = tags.flatMap(t => [`            element ${q(t)} {`, `                background ${DddViews.PALETTE[t][0]}`, `                color ${DddViews.PALETTE[t][1]}`, "            }"]);
    return [`workspace ${q(m.name)} "DDD sample: subdomains, context map, aggregates, event storming, hexagonal" {`, "", "    model {", ...views.flatMap(system), "", ...views.flatMap(v => v.edges.map(rel(v))), "    }", "", "    views {", ...views.flatMap(view), "        styles {", ...styles, "        }", "    }", "}"].join("\n");
  }

  return { build };
})();
