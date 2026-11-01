// Mermaid and PlantUML share the C4 macro names (Person, Container, Rel…); only the wrapper and the Code level differ.
const C4ToText = (() => {
  const MACRO = { person: "Person", system: "System", external: "System_Ext", container: "Container", db: "ContainerDb", queue: "ContainerQueue", component: "Component" };
  const BOUNDARY = { system: "System_Boundary", container: "Container_Boundary" };
  const MERMAID_HEAD = { context: "C4Context", container: "C4Container", component: "C4Component" };
  const PLANTUML_LIB = { context: "C4_Context", container: "C4_Container", component: "C4_Component" };

  const element = e => `${MACRO[e.type]}(${e.id}, "${e.name}", ${e.tech ? `"${e.tech}", ` : ""}"${e.desc}")`;
  const rel = ([from, to, label, tech]) => `Rel(${from}, ${to}, "${label}"${tech ? `, "${tech}"` : ""})`;

  function macros(v) {
    const people = v.outside.filter(e => e.type === "person"), others = v.outside.filter(e => e.type !== "person");
    const core = v.boundary ? [`${BOUNDARY[v.boundary.type]}(${v.boundary.id}, "${v.boundary.name}") {`, ...v.inside.map(e => `    ${element(e)}`), "}"] : v.inside.map(element);
    // Mermaid lays shapes out in declaration order: a system between two people keeps L1 edges off the person boxes.
    return [...people.slice(0, 1).map(element), ...core, ...people.slice(1).map(element), ...others.map(element), "", ...v.rels.map(rel)];
  }

  const indent = lines => lines.map(l => (l ? `    ${l}` : l));

  function mermaidClass(c) {
    const stereotype = c.kind ? [`    <<${c.kind === "enum" ? "enumeration" : c.kind}>>`] : [];
    return [`class ${c.name} {`, ...stereotype, ...c.members.map(x => `    ${x.replace("): ", ") ")}`), "}"];
  }
  const mermaidRel = ([from, to, label]) => (label === "implements" ? `${to} <|.. ${from}` : `${from} --> ${to} : ${label}`);

  function mermaid(m, key) {
    if (key === "code") {
      const v = C4Views.code(m);
      return ["---", `title: "${v.title}"`, "---", "classDiagram", ...indent(["direction LR", ...v.classes.flatMap(mermaidClass), "", ...v.rels.map(mermaidRel)])].join("\n");
    }
    const v = C4Views.view(m, key);
    return [MERMAID_HEAD[key], ...indent([`title ${v.title}`, `UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")`, "", ...macros(v)])].join("\n");
  }

  const plantumlClass = c => [`${c.kind || "class"} ${c.name} {`, ...c.members.map(x => `  ${x}`), "}"];
  const plantumlRel = ([from, to, label]) => (label === "implements" ? `${from} ..|> ${to}` : `${from} --> ${to} : ${label}`);

  function plantuml(m, key) {
    if (key === "code") {
      const v = C4Views.code(m);
      return ["@startuml", `title ${v.title}`, "left to right direction", ...v.classes.flatMap(plantumlClass), "", ...v.rels.map(plantumlRel), "@enduml"].join("\n");
    }
    const v = C4Views.view(m, key);
    return ["@startuml", `!include <C4/${PLANTUML_LIB[key]}>`, `title ${v.title}`, "", ...macros(v), "@enduml"].join("\n");
  }

  return { mermaid, plantuml };
})();
