// Order chains: union-find over shared ID values (ClOrdID/OrigClOrdID/OrderID/CrossID/QuoteID…); session/business Rejects join the message their RefSeqNum(45) points at.
const FixChain = (() => {
  // 583 ClOrdLinkID ties linked/child orders to their parent; extra = custom-dictionary "link" tags (e.g. a firm's ParentOrderID).
  const ID_TAGS = ["11", "41", "37", "526", "548", "551", "117", "131", "171", "693", "583"];

  function link(msgs, extra = []) {
    const tags = [...ID_TAGS, ...extra];
    const parent = msgs.map((_, i) => i);
    const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[Math.max(a, b)] = Math.min(a, b); };
    const owner = new Map(), sent = new Map();
    msgs.forEach((m, i) => {
      for (const t of tags) for (const v of m.all(t)) {
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
    return { root, size: r => size.get(r) || 0 };
  }

  return { link, ID_TAGS };
})();
