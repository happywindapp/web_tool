// Structurizr workspace + view → Graphviz DOT: resolves include/exclude, lifts relationships to the visible ancestor, applies element/relationship styles.
const StructurizrViews = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const color = (c, d) => /^#[0-9a-f]{3,8}$/i.test(c || "") ? c : d;
  const DEFAULTS = { person: ["#08427b", "#ffffff"], softwareSystem: ["#1168bd", "#ffffff"], container: ["#438dd5", "#ffffff"], component: ["#85bbf0", "#000000"] };
  const KIND_LABEL = { person: "Person", softwareSystem: "Software System", container: "Container", component: "Component" };
  const VIEW_LABEL = { systemLandscape: "System Landscape", systemContext: "System Context", container: "Container", component: "Component" };
  const SHAPES = { cylinder: "cylinder", hexagon: "hexagon", ellipse: "ellipse", circle: "ellipse", folder: "folder", component: "component" };
  const RANK = { tb: "TB", bt: "BT", lr: "LR", rl: "RL" };

  const rootOf = el => { while (el.parent) el = el.parent; return el; };
  const isUnder = (el, top) => { for (; el; el = el.parent) if (el === top) return true; return false; };
  const ancestorKind = (el, kind) => { for (; el; el = el.parent) if (el.kind === kind) return el; return null; };

  function wrap(text, width = 30) {
    const lines = []; let cur = "";
    for (const word of String(text).split(/\s+/).filter(Boolean)) {
      if (cur && cur.length + word.length + 1 > width) { lines.push(cur); cur = word; } else cur = cur ? `${cur} ${word}` : word;
    }
    return cur ? [...lines, cur] : lines;
  }

  // Views the DSL declares, or the standard set when it declares none.
  function list(ws) {
    const declared = ws.views.filter(v => v.kind === "systemLandscape" || v.scope);
    const made = declared.length ? declared : [
      { kind: "systemLandscape", key: "", include: [], exclude: [], direction: "tb" },
      ...ws.elements.filter(e => e.kind === "softwareSystem").flatMap(scope => [
        { kind: "systemContext", scope, key: "", include: [], exclude: [], direction: "tb" },
        ...(ws.elements.some(e => e.parent === scope) ? [{ kind: "container", scope, key: "", include: [], exclude: [], direction: "tb" }] : []),
      ]),
    ];
    return made.map((v, i) => ({ ...v, id: v.key || `view-${i}`, label: v.title || `${VIEW_LABEL[v.kind]}${v.scope ? `: ${v.scope.name}` : ""}` }));
  }

  function starElements(ws, view) {
    const { kind, scope } = view, out = new Set(), tops = ws.elements.filter(e => !e.parent);
    if (kind === "systemLandscape") { tops.forEach(e => out.add(e)); return out; }
    if (kind === "systemContext") out.add(scope); else ws.elements.filter(e => e.parent === scope).forEach(e => out.add(e));
    const rep = el => kind === "component" && rootOf(el) === rootOf(scope) ? ancestorKind(el, "container") : rootOf(el);
    for (const r of ws.relationships) {
      const [a, b] = [r.from, r.to];
      if (isUnder(a, scope) && !isUnder(b, scope)) out.add(rep(b));
      if (isUnder(b, scope) && !isUnder(a, scope)) out.add(rep(a));
    }
    return out;
  }

  function resolve(ws, view, warnings) {
    const set = new Set(), matches = ({ v, line }) => {
      const tag = /^element\.tag(?:!=|==)(.+)$/.exec(v);
      if (tag) return ws.elements.filter(e => e.tags.includes(tag[1]) === v.includes("=="));
      const el = ws.find(v);
      if (el) return [el];
      warnings.push({ line, msg: "Bỏ qua biểu thức “{kw}”", args: { kw: v } });
      return [];
    };
    const inc = view.include.length ? view.include : [{ v: "*" }];
    for (const item of inc) (item.v === "*" ? [...starElements(ws, view)] : matches(item)).forEach(e => set.add(e));
    for (const item of view.exclude) matches(item).forEach(e => set.delete(e));
    return set;
  }

  // Relationships are shown between the nearest visible ancestors; the first one between a pair wins.
  function edgesFor(ws, shown) {
    const visible = el => { for (; el; el = el.parent) if (shown.has(el)) return el; return null; };
    const seen = new Map();
    for (const r of ws.relationships) {
      const a = visible(r.from), b = visible(r.to);
      if (!a || !b || a === b) continue;
      const k = `${a.uid}>${b.uid}`;
      if (!seen.has(k)) seen.set(k, { ...r, from: a, to: b });
    }
    return [...seen.values()];
  }

  function styleOf(tags, bag) {
    const out = {};
    for (const t of tags) if (Object.hasOwn(bag, t)) Object.assign(out, bag[t]);
    return out;
  }

  function nodeLine(el, ws) {
    const st = styleOf(el.tags, ws.styles.element), [bg, fg] = DEFAULTS[el.kind];
    const fill = color(st.background, bg), ink = color(st.color, fg);
    const kind = `[${KIND_LABEL[el.kind]}${el.technology ? `: ${esc(el.technology)}` : ""}]`;
    const font = t => `<FONT COLOR="${ink}" POINT-SIZE="${t}">`;
    const rows = [`<TR><TD>${font(13)}<B>${esc(el.name)}</B></FONT></TD></TR>`, `<TR><TD>${font(9)}${kind}</FONT></TD></TR>`,
      ...wrap(el.description).map(l => `<TR><TD>${font(10)}${esc(l)}</FONT></TD></TR>`)];
    const shape = SHAPES[(st.shape || "").toLowerCase()] || "box";
    const rounded = shape === "box" ? "rounded,filled" : "filled";
    return `${el.uid} [shape=${shape}, style="${rounded}", fillcolor="${fill}", color="${fill}", margin="0.18,0.12", label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1">${rows.join("")}</TABLE>>];`;
  }

  function edgeLine(r, ws) {
    const st = styleOf(r.tags, ws.styles.relationship), c = color(st.color, "#707070");
    const label = [...wrap(r.description, 28), ...(r.technology ? [`[${r.technology}]`] : [])].map(esc).join("<BR/>");
    const dashed = String(st.dashed ?? "true").toLowerCase() !== "false";
    return `${r.from.uid} -> ${r.to.uid} [color="${c}", fontcolor="${c}", style=${dashed ? "dashed" : "solid"}${label ? `, label=<${label}>` : ""}];`;
  }

  function dot(ws, view) {
    const warnings = [], shown = resolve(ws, view, warnings), scope = view.kind === "systemContext" ? null : view.scope;
    const inside = scope ? [...shown].filter(e => e.parent === scope) : [], rest = [...shown].filter(e => !inside.includes(e));
    const cluster = inside.length ? [`  subgraph cluster_scope {`, `    label=<<B>${esc(scope.name)}</B> [${esc(KIND_LABEL[scope.kind])}]>; color="#9a9a9a"; fontcolor="#707070"; style="rounded,dashed"; margin=22;`,
      ...inside.map(e => "    " + nodeLine(e, ws)), "  }"] : [];
    const body = [...cluster, ...rest.map(e => "  " + nodeLine(e, ws)), ...edgesFor(ws, shown).map(r => "  " + edgeLine(r, ws))];
    return {
      warnings, count: shown.size,
      text: `digraph view {\n  graph [rankdir=${RANK[view.direction] || "TB"}, nodesep=0.7, ranksep=1, fontname="Arial", fontsize=12, labelloc=b, labeljust=l, label=<${esc(view.label)}>];\n  node [fontname="Arial"];\n  edge [fontname="Arial", fontsize=9, arrowsize=0.8];\n${body.join("\n")}\n}\n`,
    };
  }

  return { list, dot, wrap };
})();
if (typeof module !== "undefined") module.exports = { StructurizrViews };
