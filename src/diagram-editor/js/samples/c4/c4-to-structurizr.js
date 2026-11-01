// One workspace per system, four views. Structurizr has no code level, so classes live as components of a helper container shown only at L4.
const C4ToStructurizr = (() => {
  const VIEW = { context: ["systemContext", "L1-context"], container: ["container", "L2-container"], component: ["component", "L3-component"] };
  const TAG = { external: "External", db: "Database", queue: "Queue" };
  const q = s => `"${s}"`;

  const declare = (keyword, e, pad = "") => [`${pad}${e.id} = ${keyword} ${q(e.name)} ${q(e.desc)}`, e.tech && q(e.tech), TAG[e.kind] && q(TAG[e.kind])].filter(Boolean).join(" ");
  const classId = name => `cls${name}`;

  function container(m, c) {
    if (c.id !== m.focus) return [declare("container", c, "            ")];
    return [`${declare("container", c, "            ")} {`, ...m.components.map(x => declare("component", x, "                ")), "            }"];
  }

  function codeContainer(m) {
    const classes = m.classes.map(c => `                ${classId(c.name)} = component ${q(c.name)} ${q(c.members.join(" · "))} ${q(c.kind || "class")}`);
    return [`${declare("container", m.codeFocus, "            ")} {`, ...classes, "            }"];
  }

  function relationships(m) {
    const line = ([from, to, label, tech]) => `        ${from} -> ${to} ${q(label)}${tech ? ` ${q(tech)}` : ""}`;
    const code = m.rels.code.map(([from, to, label]) => line([classId(from), classId(to), label]));
    return [...m.rels.context, ...m.rels.container, ...m.rels.component].map(line).concat(code);
  }

  function view(m, key) {
    const [kind, id] = VIEW[key], v = C4Views.view(m, key), scope = key === "component" ? m.focus : m.systemId;
    return [`        ${kind} ${scope} ${q(id)} {`, `            title ${q(v.title)}`, `            include ${[...v.outside, ...v.inside].map(e => e.id).join(" ")}`, "            autoLayout tb", "        }"];
  }

  function build(m) {
    const code = C4Views.code(m);
    return [`workspace ${q(m.name)} "C4 sample: context, container, component and code views" {`, "", "    model {",
      ...m.people.map(p => declare("person", p, "        ")), "",
      `        ${m.systemId} = softwareSystem ${q(m.name)} ${q(m.description)} {`,
      ...m.containers.flatMap(c => container(m, c)), ...codeContainer(m), "        }", "",
      ...m.externals.map(e => declare("softwareSystem", { ...e, kind: "external" }, "        ")), "",
      ...relationships(m), "    }", "", "    views {",
      ...C4Views.LEVELS.filter(l => l.key !== "code").flatMap(l => view(m, l.key)),
      `        component ${m.codeFocus.id} "L4-code" {`, `            title ${q(code.title)}`, "            include *", "            autoLayout lr", "        }",
      "        styles {", `            element "External" {`, "                background #8a8a8a", "                color #ffffff", "            }",
      `            element "Database" {`, "                shape Cylinder", "            }", `            element "Queue" {`, "                shape Pipe", "            }",
      "        }", "    }", "}"].join("\n");
  }

  return { build };
})();
