// Grouped views stack one bounded box per row; ungrouped views and aggregates reuse the layered layout of the C4 builder.
const DddToDrawio = (() => {
  const { FRAME, EDGE, vertex, edge, detour, page, layers, spread, classLabel, classHeight } = C4ToDrawio.parts;
  const W = 200, H = 100, CLASS_W = 240, GAP_X = 60, GAP_Y = 90, MAP_GAP_X = 170, MAP_GAP_Y = 150, PAD = 40, HEAD = 30;
  const ARROW = "endArrow=blockThin;endFill=1;";

  const style = n => {
    const [fill, ink] = DddViews.PALETTE[n.type];
    return `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${fill};fontColor=${ink};`;
  };
  const label = n => `<b>${n.name}</b><br><font style="font-size:10px">${n.caption}</font>${n.desc ? `<br><br>${n.desc}` : ""}`;
  const edges = (v, via = () => undefined) => v.edges.map(([from, to, text, note], i) => edge(i, from, to, [text, note && `[${note}]`].filter(Boolean).join("<br>"), EDGE + (DddViews.isSymmetric(note) ? "endArrow=none;" : ARROW), via(from, to)));

  function rows(v) {
    const step = W + GAP_X, cols = Math.max(...v.groups.map(g => g.nodes.length)), width = cols * step - GAP_X + 2 * PAD, cells = [];
    let y = PAD;
    for (const g of v.groups) {
      const height = HEAD + H + 2 * PAD, shift = v.rowsAreSteps ? 0 : (cols - g.nodes.length) * step / 2;
      cells.push(vertex(g.id, `<b>${g.name}</b>`, FRAME, "1", PAD, y, width, height));
      g.nodes.forEach((n, i) => cells.push(vertex(n.id, label(n), style(n), g.id, PAD + shift + i * step, HEAD + PAD, W, H)));
      y += height + GAP_Y / 2;
    }
    return [...cells, ...edges(v)];
  }

  function layered(v) {
    const grouped = layers(v.nodes, v.edges), xOf = spread(grouped, v.edges, W + MAP_GAP_X);
    const spot = new Map(grouped.flatMap((list, r) => list.map(n => [n.id, { x: xOf(n.id), y: PAD + r * (H + MAP_GAP_Y) }])));
    return [...grouped.flatMap(list => list.map(n => vertex(n.id, label(n), style(n), "1", spot.get(n.id).x, spot.get(n.id).y, W, H))), ...edges(v, (from, to) => detour(spot.get(from), spot.get(to), W + MAP_GAP_X, H))];
  }

  function aggregates(v) {
    const cells = [], rels = v.rels.map(([a, b, t], i) => edge(i, a, b, t, `${EDGE}${ARROW}dashed=1;`));
    let left = PAD, top = PAD;
    // The main aggregate sits left and the others stack on its right, so links to one group never cross another.
    v.groups.forEach((g, index) => {
      const items = g.classes.map(c => ({ ...c, id: c.name })), grid = layers(items, v.rels), xOf = spread(grid, v.rels.filter(r => items.some(c => c.id === r[0]) && items.some(c => c.id === r[1])), CLASS_W + GAP_X);
      const body = [];
      let y = HEAD + PAD, right = 0;
      for (const list of grid) {
        list.forEach(c => { body.push(vertex(c.id, classLabel(c), "rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=8;spacingTop=4;fillColor=#ffffff;strokeColor=#b45309;", g.id, xOf(c.id), y, CLASS_W, classHeight(c))); right = Math.max(right, xOf(c.id) + CLASS_W); });
        y += Math.max(...list.map(classHeight)) + GAP_Y;
      }
      cells.push(vertex(g.id, `<b>${g.name}</b>`, FRAME, "1", left, top, right + PAD, y - GAP_Y + PAD), ...body);
      if (index) top += y - GAP_Y + PAD + GAP_Y / 2; else left += right + PAD + GAP_X * 3;
    });
    return [...cells, ...rels];
  }

  function build(m, key) {
    if (key === "aggregates") { const v = DddViews.aggregates(m); return page(v.title, aggregates(v)); }
    const v = DddViews.graph(m, key);
    return page(v.title, v.groups.length ? rows(v) : layered(v));
  }

  return { build };
})();
