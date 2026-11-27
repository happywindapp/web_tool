// Extract URLs / e-mails / IPv4 / IPv6 from any text (pure): validated matches in order of first appearance, optional de-dupe + occurrence count.
const ExtractText = (() => {
  const KINDS = ["url", "email", "ipv4", "ipv6"];
  const NAME = { url: "URL", email: "Email", ipv4: "IPv4", ipv6: "IPv6" };
  const DEF = { kinds: ["url"], unique: true, count: true };

  const octet = s => /^(?:0|[1-9]\d{0,2})$/.test(s) && +s <= 255;
  const isV4 = s => { const p = s.split("."); return p.length === 4 && p.every(octet); };
  function isV6(s) {
    if (!/[0-9a-f]/i.test(s) || /:::/.test(s)) return false;
    const halves = s.split("::");
    if (halves.length > 2) return false;
    const groups = halves.map(h => h ? h.split(":") : []), flat = groups.flat();
    let need = 8;
    if (flat.length && flat[flat.length - 1].includes(".")) { if (!isV4(flat.pop())) return false; need = 6; }
    if (!flat.every(g => /^[0-9a-f]{1,4}$/i.test(g))) return false;
    return halves.length === 2 ? flat.length < need : flat.length === need;
  }

  // Trailing punctuation and unbalanced closing brackets belong to the sentence, not the URL.
  function trimUrl(u) {
    for (;;) {
      const c = u[u.length - 1];
      if (/[.,;:!?'"]/.test(c)) { u = u.slice(0, -1); continue; }
      const pair = { ")": "(", "]": "[", "}": "{" }[c];
      if (pair && u.split(pair).length < u.split(c).length) { u = u.slice(0, -1); continue; }
      return u;
    }
  }

  const FIND = {
    url: t => [...t.matchAll(/\b(?:https?|ftp):\/\/[^\s<>"'`]+|\bwww\.[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s<>"'`]*/gi)].map(m => trimUrl(m[0])).filter(u => u.length > 8),
    email: t => [...t.matchAll(/(?<![\w.%+-])[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9_%+-])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,24}\b/g)].map(m => m[0]),
    ipv4: t => [...t.matchAll(/(?<![\d.])\d{1,3}(?:\.\d{1,3}){3}(?!\.?\d)/g)].map(m => m[0]).filter(isV4),
    ipv6: t => [...t.matchAll(/(?<![\w:.])[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}(?::\d{1,3}(?:\.\d{1,3}){3})?(?![\w:.])/gi)].map(m => m[0]).filter(isV6),
  };

  function clean(o) {
    const kinds = Array.isArray(o?.kinds) ? KINDS.filter(k => o.kinds.includes(k)) : DEF.kinds;
    return { kinds: kinds.length ? kinds : DEF.kinds, unique: typeof o?.unique === "boolean" ? o.unique : DEF.unique, count: typeof o?.count === "boolean" ? o.count : DEF.count };
  }

  // → { text, total: { kind: n found }, groups: [{ kind, items: [{ value, n }] }] }.
  function run(text, opts) {
    const o = clean(opts), groups = [], total = {};
    for (const kind of o.kinds) {
      const found = FIND[kind](text);
      total[kind] = found.length;
      let items;
      if (o.unique) { const m = new Map(); for (const v of found) m.set(v, (m.get(v) || 0) + 1); items = [...m].map(([value, n]) => ({ value, n })); }
      else items = found.map(value => ({ value, n: 1 }));
      groups.push({ kind, items });
    }
    const lines = [];
    for (const g of groups) {
      if (o.kinds.length > 1) lines.push((lines.length ? "\n" : "") + "# " + NAME[g.kind] + " · " + g.items.length);
      for (const it of g.items) lines.push(o.unique && o.count ? it.value + "\t" + it.n : it.value);
    }
    return { text: lines.join("\n") + (lines.length ? "\n" : ""), total, groups };
  }

  return { KINDS, NAME, DEF, clean, run, isV4, isV6 };
})();
