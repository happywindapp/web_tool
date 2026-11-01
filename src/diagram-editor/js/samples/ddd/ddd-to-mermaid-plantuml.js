const DddToText = (() => {
  const wrapped = (n, joiner) => [n.name, n.caption, ...C4Views.wrap(n.desc).filter(Boolean)].join(joiner);
  const edgeText = (label, note, joiner) => [label, note && `[${note}]`].filter(Boolean).join(joiner);
  const allNodes = v => [...v.groups.flatMap(g => g.nodes), ...v.nodes];

  function mermaidGraph(v) {
    const node = n => `${n.id}["${wrapped(n, "<br/>")}"]:::${n.type}`;
    const home = new Map(v.groups.flatMap(g => g.nodes.map(n => [n.id, g.id])));
    const groups = v.groups.flatMap(g => [`subgraph ${g.id}["${g.name}"]`, "    direction LR", ...g.nodes.map(n => `    ${node(n)}`), "end"]);
    // A node linked outside its subgraph cancels "direction LR", so step rows link subgraph to subgraph.
    const edge = ([from, to, label, note]) => {
      const crossing = v.rowsAreSteps && home.get(from) !== home.get(to), text = edgeText(label, note, "<br/>");
      // Layout ranks follow edge direction, so "implements" is drawn port-first to keep adapters below their ports.
      if (label === "implements") return `${to} -.-|"implements"| ${from}`;
      return `${crossing ? home.get(from) : from} -->${text ? `|"${text}"|` : ""} ${crossing ? home.get(to) : to}`;
    };
    const styles = [...new Set(allNodes(v).map(n => n.type))].map(t => `classDef ${t} fill:${DddViews.PALETTE[t][0]},stroke:${DddViews.PALETTE[t][0]},color:${DddViews.PALETTE[t][1]}`);
    // Unlinked subgraphs would be placed in reverse order; invisible links keep them top to bottom.
    const order = v.edges.length ? [] : v.groups.slice(1).map((g, i) => `${v.groups[i].id} ~~~ ${g.id}`);
    return ["---", `title: "${v.title}"`, "config:", "  flowchart:", "    wrappingWidth: 320", "---", "flowchart TB", ...[...groups, ...v.nodes.map(node), "", ...order, ...v.edges.map(edge), "", ...styles].map(l => (l ? `    ${l}` : l))].join("\n");
  }

  function mermaidAggregates(v) {
    const cls = c => [`class ${c.name} {`, `    <<${c.kind}>>`, ...c.members.map(x => `    ${x.replace("): ", ") ")}`), "}"];
    const space = g => [`namespace ${g.name.replace(/ (\w)/g, (_, c) => c.toUpperCase())} {`, ...g.classes.flatMap(cls).map(l => `    ${l}`), "}"];
    return ["---", `title: "${v.title}"`, "---", "classDiagram", ...["direction LR", ...v.groups.flatMap(space), "", ...v.rels.map(([a, b, t]) => `${a} --> ${b} : ${t}`)].map(l => (l ? `    ${l}` : l))].join("\n");
  }

  function plantumlGraph(v) {
    // PlantUML rejects a hex value after "text:", only colour names work there.
    const node = n => `rectangle "${wrapped(n, "\\n")}" as ${n.id} ${DddViews.PALETTE[n.type][0]};text:${DddViews.PALETTE[n.type][1] === "#ffffff" ? "white" : "black"}`;
    const home = new Map(v.groups.flatMap(g => g.nodes.map(n => [n.id, g.id])));
    const groups = v.groups.flatMap(g => [`package "${g.name}" {`, ...g.nodes.map(n => `  ${node(n)}`), "}"]);
    const edge = ([from, to, label, note]) => {
      if (label === "implements") return `${to} <.. ${from} : implements`;
      const arrow = v.rowsAreSteps && home.get(from) === home.get(to) ? "-right->" : "-->", text = edgeText(label, note, "\\n");
      return `${from} ${arrow} ${to}${text ? ` : ${text}` : ""}`;
    };
    const order = v.edges.length ? [] : v.groups.slice(1).map((g, i) => `${v.groups[i].nodes[0].id} -[hidden]down- ${g.nodes[0].id}`);
    return ["@startuml", `title ${v.title}`, "", ...groups, ...v.nodes.map(node), "", ...order, ...v.edges.map(edge), "@enduml"].join("\n");
  }

  function plantumlAggregates(v) {
    const cls = c => [`  class ${c.name} <<${c.kind}>> {`, ...c.members.map(x => `    ${x}`), "  }"];
    return ["@startuml", `title ${v.title}`, "", ...v.groups.flatMap(g => [`package "${g.name}" {`, ...g.classes.flatMap(cls), "}"]), "", ...v.rels.map(([a, b, t]) => `${a} --> ${b} : ${t}`), "@enduml"].join("\n");
  }

  const mermaid = (m, key) => (key === "aggregates" ? mermaidAggregates(DddViews.aggregates(m)) : mermaidGraph(DddViews.graph(m, key)));
  const plantuml = (m, key) => (key === "aggregates" ? plantumlAggregates(DddViews.aggregates(m)) : plantumlGraph(DddViews.graph(m, key)));

  return { mermaid, plantuml };
})();
