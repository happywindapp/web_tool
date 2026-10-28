// JSON AST transforms: sort keys A→Z, decode JSON that was stringified into string values, size/depth stats.
const JsonAst = (() => {
  const byKey = (a, b) => a.k < b.k ? -1 : a.k > b.k ? 1 : 0;

  function sortKeys(n) {
    if (n.t === "obj") return { t: "obj", items: n.items.map(it => ({ k: it.k, v: sortKeys(it.v) })).sort(byKey) };
    if (n.t === "arr") return { t: "arr", items: n.items.map(sortKeys) };
    return n;
  }

  // Only strings that are already valid strict JSON are decoded — no guessing inside strings.
  function decodeNested(root) {
    let count = 0;
    const walk = n => {
      if (n.t === "obj") return { t: "obj", items: n.items.map(it => ({ k: it.k, v: walk(it.v) })) };
      if (n.t === "arr") return { t: "arr", items: n.items.map(walk) };
      if (n.t !== "str") return n;
      const t = n.v.trim();
      if (!/^[\[{]/.test(t) || !/[\]}]$/.test(t)) return n;
      try { JSON.parse(t); } catch { return n; }
      count++;
      return walk(JsonTool.parse(t).ast);
    };
    return { ast: walk(root), count };
  }

  function stats(root) {
    let nodes = 0, depth = 0;
    const walk = (n, d) => {
      nodes++; depth = Math.max(depth, d);
      if (n.t === "obj") n.items.forEach(it => walk(it.v, d + 1));
      else if (n.t === "arr") n.items.forEach(it => walk(it, d + 1));
    };
    walk(root, 0);
    return { nodes, depth };
  }

  return { sortKeys, decodeNested, stats };
})();
