// Order chains: union-find over shared ID values (ClOrdID/OrigClOrdID/OrderID/CrossID/QuoteID…); session/business Rejects join the message their RefSeqNum(45) points at.
// Families: a link tag (583 ClOrdLinkID, custom-dictionary "link" tags) in a chain names its parent order → parent chain + child chains, without merging them.
const FixChain = (() => {
  const ID_TAGS = ["11", "41", "37", "526", "548", "551", "117", "131", "171", "693"];
  const LINK_TAGS = ["583"];

  function link(msgs, extra = []) {
    const parent = msgs.map((_, i) => i);
    const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
    const owner = new Map(), sent = new Map();
    msgs.forEach((m, i) => {
      for (const t of ID_TAGS) for (const v of m.all(t)) {
        if (!v || v === "NONE") continue;
        if (owner.has(v)) union(owner.get(v), i); else owner.set(v, i);
      }
      // Sequence numbers reset daily, so a reject refers to the latest earlier message with that sender + MsgSeqNum.
      if (m.type === "3" || m.type === "j") {
        const j = sent.get(`${m.get("56")}#${m.get("45")}`);
        if (j !== undefined) union(j, i);
      }
      if (m.get("34")) sent.set(`${m.get("49")}#${m.get("34")}`, i);
    });
    const root = msgs.map((_, i) => find(i));
    const size = new Map();
    root.forEach(r => size.set(r, (size.get(r) || 0) + 1));

    // Parent key: the root of the chain that owns the linked id, or "v:<id>" when the parent order is not in the log.
    const parentOf = new Map(), children = new Map();
    msgs.forEach((m, i) => {
      for (const t of [...LINK_TAGS, ...extra]) for (const v of m.all(t)) {
        if (!v) continue;
        const o = owner.get(v), key = o !== undefined ? root[o] : "v:" + v, r = root[i];
        if (key === r || parentOf.has(r)) continue;
        parentOf.set(r, key);
        if (!children.has(key)) children.set(key, []);
        children.get(key).push(r);
      }
    });

    // Message indexes of a parent and all its descendants (nested algo slices included).
    function family(key) {
      const roots = new Set(), stack = [key];
      while (stack.length) {
        const k = stack.pop();
        if (roots.has(k)) continue;
        roots.add(k);
        stack.push(...(children.get(k) || []));
      }
      return new Set(msgs.map((_, i) => i).filter(i => roots.has(root[i])));
    }

    return {
      root, size: r => size.get(r) || 0,
      parentOf: r => parentOf.has(r) ? parentOf.get(r) : null,
      children: key => children.get(key) || [],
      parents: () => [...children.keys()],
      family,
    };
  }

  return { link, ID_TAGS, LINK_TAGS };
})();
