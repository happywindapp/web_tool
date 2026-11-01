const DddToD2 = (() => {
  const title = text => `title: "${text}" {near: top-center; shape: text; style: {font-size: 22; bold: true}}`;
  const label = n => [n.name, n.caption, ...C4Views.wrap(n.desc).filter(Boolean)].join("\\n");
  const paint = t => `${t}: {style: {fill: "${DddViews.PALETTE[t][0]}"; stroke: "${DddViews.PALETTE[t][0]}"; font-color: "${DddViews.PALETTE[t][1]}"}}`;
  const GROUP = `style: {fill: transparent; stroke: "#666666"; stroke-dash: 4; font-color: "#444444"}`;

  function graph(v) {
    const home = new Map(v.groups.flatMap(g => g.nodes.map(n => [n.id, g.id]))), ref = id => (home.has(id) ? `${home.get(id)}.${id}` : id);
    const node = n => `${n.id}: "${label(n)}" {class: ${n.type}}`;
    const types = new Set([...v.groups.flatMap(g => g.nodes), ...v.nodes].map(n => n.type));
    const groups = v.groups.flatMap(g => [`${g.id}: "${g.name}" {`, `  ${GROUP}`, `  grid-rows: 1`, `  horizontal-gap: 120`, ...g.nodes.map(n => `  ${node(n)}`), "}"]);
    const edge = ([from, to, text, note]) => `${ref(from)} ${DddViews.isSymmetric(note) ? "--" : "->"} ${ref(to)}${text ? `: "${text}${note ? `\\n[${note}]` : ""}"` : ""}`;
    return [title(v.title), v.groups.length ? "grid-columns: 1" : "direction: down", "", "classes: {", ...[...types].map(t => `  ${paint(t)}`), "}", "", ...groups, ...v.nodes.map(node), "", ...v.edges.map(edge)].join("\n");
  }

  const member = x => {
    const cut = x.lastIndexOf(": ");
    return cut < 0 ? `  "${x}"` : `  "${x.slice(0, cut)}": "${x.slice(cut + 2)}"`;
  };

  function aggregates(v) {
    const home = new Map(v.groups.flatMap(g => g.classes.map(c => [c.name, g.id]))), ref = n => `${home.get(n)}.${n}`;
    const cls = c => [`${c.name}: "«${c.kind}» ${c.name}" {`, "  shape: class", ...c.members.map(member), "}"];
    const group = g => [`${g.id}: "${g.name}" {`, `  ${GROUP}`, ...g.classes.flatMap(cls).map(l => `  ${l}`), "}"];
    return [title(v.title), "direction: down", "", ...v.groups.flatMap(group), "", ...v.rels.map(([a, b, t]) => `${ref(a)} -> ${ref(b)}: ${t}`)].join("\n");
  }

  const build = (m, key) => (key === "aggregates" ? aggregates(DddViews.aggregates(m)) : graph(DddViews.graph(m, key)));
  return { build };
})();
