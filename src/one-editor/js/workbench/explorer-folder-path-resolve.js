// Folder tab paths: the chain of folder nodes from the opened root to a node, and a path back to its folder node (reading folders on the way).
const FolderPaths = (() => {
  // Root → node through the folders already read (dropped folders have no parent link).
  function chain(node) {
    const walk = (n, path) => {
      if (n === node) return [...path, n];
      for (const c of n.children || []) if (c.dir) { const r = walk(c, [...path, n]); if (r) return r; }
      return null;
    };
    return Explorer.root() ? walk(Explorer.root(), []) : null;
  }

  // Path → folder node, reading folders on the way. Strict (internal paths): exact names, a missing part ⇒ the deepest folder found; loose (typed): any case, relative to the opened folder allowed, missing ⇒ null.
  async function resolve(path, loose = false) {
    const root = Explorer.root(), parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
    const eq = (a, b) => loose ? a.toLowerCase() === b.toLowerCase() : a === b;
    if (!root) return null;
    if (parts.length && eq(parts[0], root.name)) parts.shift(); else if (!loose) return null;
    let n = root;
    for (const p of parts) {
      const c = (await Explorer.loadKids(n).catch(() => [])).find(x => x.dir && eq(x.name, p));
      if (!c) return loose ? null : n;
      n = c;
    }
    return n;
  }

  // Nodes cut off the tree (a folder above them was read again) → Map node → the node now at that path, or null when it is gone.
  async function relink(nodes) {
    const live = new Set(), stack = Explorer.root() ? [Explorer.root()] : [], out = new Map(), dirs = new Map();
    while (stack.length) { const n = stack.pop(); live.add(n); for (const c of n.children || []) if (c.dir) stack.push(c); }
    for (const n of nodes) {
      if (!n.parent || live.has(n.parent)) continue;
      const at = n.path.slice(0, n.path.lastIndexOf("/"));
      if (!dirs.has(at)) dirs.set(at, resolve(at).then(d => (d?.path === at ? Explorer.loadKids(d) : []), () => []));
      out.set(n, (await dirs.get(at)).find(c => c.name === n.name && !!c.dir === !!n.dir) || null);
    }
    return out;
  }

  return { chain, resolve, relink };
})();
