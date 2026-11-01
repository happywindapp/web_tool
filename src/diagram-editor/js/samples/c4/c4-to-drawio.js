// draw.io XML has no auto-layout on load, so views are layered here: callers on top, each element near its neighbours, dependencies below.
const C4ToDrawio = (() => {
  const W = 200, H = 120, GAP_X = 70, GAP_Y = 110, PAD = 40, CLASS_W = 250, LINE_H = 19;
  const FILL = { person: "#08427b", system: "#1168bd", external: "#8a8a8a", container: "#438dd5", db: "#438dd5", queue: "#438dd5", component: "#85bbf0" };
  const SHAPE = { person: "rounded=1;arcSize=30;", db: "shape=cylinder3;size=12;boundedLbl=1;", queue: "shape=cylinder3;direction=south;size=12;boundedLbl=1;" };
  const FRAME = "rounded=1;arcSize=2;dashed=1;fillColor=none;strokeColor=#666666;fontColor=#444444;verticalAlign=top;align=left;spacingLeft=8;html=1;container=1;collapsible=0;";
  const EDGE = "rounded=1;html=1;jumpStyle=arc;fontSize=10;labelBackgroundColor=#ffffff;strokeColor=#707070;fontColor=#555555;";

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const style = e => `${SHAPE[e.type] || "rounded=1;arcSize=8;"}whiteSpace=wrap;html=1;fillColor=${FILL[e.type]};strokeColor=${FILL[e.type]};fontColor=${e.type === "component" ? "#000000" : "#ffffff"};`;
  const label = e => `<b>${e.name}</b><br><font style="font-size:10px">${C4Views.caption(e)}</font><br><br>${e.desc}`;

  const vertex = (id, value, css, parent, x, y, w, h) => `        <mxCell id="${id}" value="${esc(value)}" style="${css}" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
  const edge = (i, from, to, value, css, via) => `        <mxCell id="e${i}" value="${esc(value)}" style="${css}" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"${via ? `><Array as="points"><mxPoint x="${via.x}" y="${via.y}"/></Array></mxGeometry>` : "/>"}</mxCell>`;
  // A link between non-neighbours of one row dips below it instead of running through the boxes between them.
  const detour = (a, b, step, height) => (a.y === b.y && Math.abs(a.x - b.x) > step ? { x: (a.x + b.x + W) / 2, y: a.y + height + 45 } : undefined);
  const page = (name, cells) => ["<mxfile>", `  <diagram name="${esc(name)}">`, `    <mxGraphModel dx="1200" dy="800" grid="1" gridSize="10">`, "      <root>", `        <mxCell id="0"/>`, `        <mxCell id="1" parent="0"/>`, ...cells, "      </root>", "    </mxGraphModel>", "  </diagram>", "</mxfile>"].join("\n");

  // Rows by breadth-first depth from the elements nothing inside calls.
  function layers(items, rels) {
    const called = new Set(rels.filter(r => items.some(e => e.id === r[0])).map(r => r[1])), depth = new Map();
    let front = items.filter(e => !called.has(e.id));
    for (let d = 0; front.length; d++) {
      front.forEach(e => depth.set(e.id, d));
      const reached = new Set(rels.filter(r => front.some(e => e.id === r[0])).map(r => r[1]));
      front = items.filter(e => reached.has(e.id) && !depth.has(e.id));
    }
    const rows = [];
    for (const e of items) (rows[depth.get(e.id) ?? 0] ??= []).push(e);
    return rows;
  }
  // Each row sits under the mean x of its already placed neighbours, then is pushed apart to avoid overlaps.
  function spread(rows, rels, step) {
    const x = new Map();
    for (const row of rows) {
      const wanted = new Map(row.map((e, i) => {
        const near = rels.flatMap(r => (r[0] === e.id ? [r[1]] : r[1] === e.id ? [r[0]] : [])).filter(id => x.has(id)).map(id => x.get(id));
        return [e.id, near.length ? near.reduce((a, b) => a + b) / near.length : i * step];
      }));
      const order = [...row].sort((a, b) => wanted.get(a.id) - wanted.get(b.id));
      order.forEach((e, i) => x.set(e.id, i ? Math.max(wanted.get(e.id), x.get(order[i - 1].id) + step) : wanted.get(e.id)));
      const shift = order.reduce((sum, e) => sum + wanted.get(e.id) - x.get(e.id), 0) / order.length;
      order.forEach(e => x.set(e.id, x.get(e.id) + shift));
    }
    const left = Math.min(...x.values());
    return id => Math.round(x.get(id) - left) + PAD;
  }

  function build(m, key) {
    if (key === "code") return code(C4Views.code(m));
    const v = C4Views.view(m, key), inner = new Set(v.inside.map(e => e.id));
    const callsIn = e => e.type === "person" || v.rels.some(r => r[0] === e.id && inner.has(r[1]));
    const top = v.outside.filter(callsIn), bottom = v.outside.filter(e => !callsIn(e)), rows = layers(v.inside, v.rels);
    const xOf = spread([top, ...rows, bottom].filter(r => r.length), v.rels, W + GAP_X);
    const edgeSpace = v.boundary ? PAD : 0, midY = (top.length ? PAD + H + GAP_Y : PAD) + edgeSpace;
    const innerY = r => midY + r * (H + GAP_Y) + (v.boundary ? PAD : 0), endY = innerY(rows.length - 1) + H + edgeSpace;
    const row = (list, y) => list.map(e => vertex(e.id, label(e), style(e), "1", xOf(e.id), y, W, H));
    const spot = new Map([...top.map(e => [e.id, PAD]), ...rows.flatMap((list, r) => list.map(e => [e.id, innerY(r)])), ...bottom.map(e => [e.id, endY + GAP_Y])].map(([id, y]) => [id, { x: xOf(id), y }]));
    const cells = row(top, PAD);
    if (v.boundary) {
      const left = Math.min(...v.inside.map(e => xOf(e.id))) - PAD, right = Math.max(...v.inside.map(e => xOf(e.id))) + W + PAD, y = midY - PAD;
      cells.push(vertex(v.boundary.id, `<b>${v.boundary.name}</b>`, FRAME, "1", left, y, right - left, endY - y));
      rows.forEach((list, r) => list.forEach(e => cells.push(vertex(e.id, label(e), style(e), v.boundary.id, xOf(e.id) - left, innerY(r) - y, W, H))));
    } else rows.forEach((list, r) => cells.push(...row(list, innerY(r))));
    cells.push(...row(bottom, endY + GAP_Y));
    cells.push(...v.rels.map(([from, to, text, tech], i) => edge(i, from, to, tech ? `${text}<br>[${tech}]` : text, `${EDGE}dashed=1;endArrow=blockThin;endFill=1;`, detour(spot.get(from), spot.get(to), W + GAP_X, H))));
    return page(v.title, cells);
  }

  const classLabel = c => `<b>${c.kind ? `«${c.kind}» ` : ""}${c.name}</b><hr size="1">${c.members.map(esc).join("<br>")}`;
  const classHeight = c => (c.members.length + 2) * LINE_H + 12;

  function code(v) {
    const items = v.classes.map(c => ({ ...c, id: c.name })), rows = layers(items, v.rels), xOf = spread(rows, v.rels, CLASS_W + GAP_X), cells = [];
    let y = PAD;
    for (const list of rows) {
      list.forEach(c => cells.push(vertex(c.id, classLabel(c), "rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;fillColor=#ffffff;strokeColor=#438dd5;", "1", xOf(c.id), y, CLASS_W, classHeight(c))));
      y += Math.max(...list.map(classHeight)) + GAP_Y;
    }
    cells.push(...v.rels.map(([from, to, text], i) => (text === "implements"
      ? edge(i, from, to, text, `${EDGE}dashed=1;endArrow=block;endFill=0;`)
      : edge(i, from, to, text, `${EDGE}endArrow=open;endFill=0;`))));
    return page(v.title, cells);
  }

  return { build, parts: { FRAME, EDGE, vertex, edge, detour, page, layers, spread, classLabel, classHeight } };
})();
