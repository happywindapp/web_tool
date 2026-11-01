// Neutral C4 model (c4-model-*.js) → one drawable view per level; every language builder renders these views.
const C4Views = (() => {
  const LEVELS = [
    { key: "context", label: "L1 — Ngữ cảnh hệ thống (System Context)", title: "L1 — System Context" },
    { key: "container", label: "L2 — Container", title: "L2 — Container" },
    { key: "component", label: "L3 — Thành phần (Component)", title: "L3 — Component" },
    { key: "code", label: "L4 — Mã nguồn (Code)", title: "L4 — Code" },
  ];
  const typed = (list, type) => list.map(e => ({ ...e, type: e.kind || type }));
  const KIND = { person: "Person", system: "Software System", external: "External System", container: "Container", db: "Container", queue: "Container", component: "Component" };

  const titleOf = (key, subject) => `${LEVELS.find(l => l.key === key).title}: ${subject}`;
  const caption = e => `[${KIND[e.type]}${e.tech ? `: ${e.tech}` : ""}]`;
  const wrap = (text, width = 30) => text.split(" ").reduce((rows, word) => {
    if (rows.at(-1) && rows.at(-1).length + word.length < width) rows[rows.length - 1] += ` ${word}`; else rows.push(word);
    return rows;
  }, []);

  function view(m, key) {
    const system = { id: m.systemId, name: m.name, desc: m.description, type: "system" };
    const focus = m.containers.find(c => c.id === m.focus);
    const known = [...typed(m.people, "person"), ...typed(m.externals, "external"), ...typed(m.containers, "container")];
    const [inside, boundary] = key === "context" ? [[system], null]
      : key === "container" ? [typed(m.containers, "container"), system]
        : [typed(m.components, "component"), { id: focus.id, name: focus.name, type: "container" }];
    const rels = m.rels[key], used = new Set(rels.flatMap(r => r.slice(0, 2))), own = new Set(inside.map(e => e.id));
    const outside = known.filter(e => used.has(e.id) && !own.has(e.id));
    return { title: titleOf(key, boundary?.type === "container" ? focus.name : m.name), boundary, inside, outside, rels };
  }

  const code = m => ({ title: titleOf("code", m.codeFocus.name), classes: m.classes, rels: m.rels.code });

  return { LEVELS, view, code, caption, wrap };
})();
