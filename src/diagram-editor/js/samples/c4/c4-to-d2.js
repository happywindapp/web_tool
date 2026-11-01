// D2 has no C4 macros: each element type becomes a reusable class holding the standard C4 colours.
const C4ToD2 = (() => {
  const box = (fill, ink, shape = "rectangle") => `{shape: ${shape}; style: {fill: "${fill}"; stroke: "${fill}"; font-color: "${ink}"}}`;
  const CLASSES = {
    person: box("#08427b", "#ffffff", "c4-person"), system: box("#1168bd", "#ffffff"), external: box("#8a8a8a", "#ffffff"),
    container: box("#438dd5", "#ffffff"), db: box("#438dd5", "#ffffff", "cylinder"), queue: box("#438dd5", "#ffffff", "queue"), component: box("#85bbf0", "#000000"),
    boundary: `{style: {fill: transparent; stroke: "#666666"; stroke-dash: 4; font-color: "#444444"}}`,
  };
  const IMPLEMENTS = "{style.stroke-dash: 4; target-arrowhead: {shape: triangle; style.filled: false}}";
  const title = text => `title: "${text}" {near: top-center; shape: text; style: {font-size: 22; bold: true}}`;

  const label = e => [e.name, C4Views.caption(e), ...C4Views.wrap(e.desc)].join("\\n");
  const node = e => `${e.id}: "${label(e)}" {class: ${e.type}}`;

  function build(m, key) {
    if (key === "code") return code(C4Views.code(m));
    const v = C4Views.view(m, key), inner = new Set(v.boundary ? v.inside.map(e => e.id) : []);
    const ref = id => (inner.has(id) ? `${v.boundary.id}.${id}` : id);
    const types = new Set([...v.inside, ...v.outside].map(e => e.type));
    if (v.boundary) types.add("boundary");
    const core = v.boundary ? [`${v.boundary.id}: "${v.boundary.name}" {`, "  class: boundary", ...v.inside.map(e => `  ${node(e)}`), "}"] : v.inside.map(node);
    return [title(v.title), "direction: down", "", "classes: {", ...[...types].map(t => `  ${t}: ${CLASSES[t]}`), "}", "",
      ...v.outside.map(node), ...core, "",
      ...v.rels.map(([from, to, text, tech]) => `${ref(from)} -> ${ref(to)}: "${text}${tech ? `\\n[${tech}]` : ""}"`)].join("\n");
  }

  const member = x => {
    const cut = x.lastIndexOf(": ");
    return cut < 0 ? `  "${x}"` : `  "${x.slice(0, cut)}": "${x.slice(cut + 2)}"`;
  };
  const head = c => (c.kind ? `${c.name}: "«${c.kind}» ${c.name}"` : `${c.name}`);

  function code(v) {
    return [title(v.title), "direction: right", "",
      ...v.classes.flatMap(c => [`${head(c)} {`, "  shape: class", ...c.members.map(member), "}"]), "",
      ...v.rels.map(([from, to, text]) => (text === "implements" ? `${from} -> ${to}: implements ${IMPLEMENTS}` : `${from} -> ${to}: ${text}`))].join("\n");
  }

  return { build };
})();
