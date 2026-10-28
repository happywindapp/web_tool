// Order chain picker: dropdown tree (parent order → child chains, then standalone chains), current pick as a message set, chip text, share-link form.
const ChainPick = (() => {
  let pick = null, ctx = null; // pick: { kind: "chain" | "family", key: chain root (number) or "v:<id>" for a parent not in the log }
  const esc = s => Dom.esc(s);

  const firstOf = r => ctx.chain.root.indexOf(r);
  function label(i) {
    const m = ctx.msgs[i];
    return [m.get("11") || m.get("37") || m.get("117") || m.get("548"), m.get("55")].filter(Boolean).join(" · ") || FixDict.msgName(ctx.dict, m.type);
  }
  const parentLabel = key => typeof key === "number" ? label(firstOf(key)) : T("{id} (lệnh cha không có trong log)", { id: key.slice(2) });
  const valid = p => p && (p.kind === "chain" ? ctx.chain.root[p.key] === p.key : ctx.chain.children(p.key).length > 0);

  // ctx: { msgs, chain, dict } after every parse; a pick that no longer exists is dropped.
  function bind(c) { ctx = c; if (pick && !valid(pick)) pick = null; }

  // Family of message i: its parent's key, or its own chain when it is a parent itself.
  function familyKeyOf(i) {
    const r = ctx.chain.root[i], p = ctx.chain.parentOf(r);
    return p !== null ? p : ctx.chain.children(r).length ? r : null;
  }

  function fill(select) {
    const ch = ctx.chain, used = new Set(), opt = (v, text) => `<option value="${esc(v)}">${esc(text)}</option>`;
    let html = "", n = 0;
    for (const key of ch.parents()) {
      const kids = ch.children(key);
      html += opt("f:" + key, `🌳 ${parentLabel(key)} — ${T("{k} lệnh con, {n} message", { k: kids.length, n: ch.family(key).size })}`);
      if (typeof key === "number") { html += opt("c:" + key, `    · ${T("chỉ lệnh cha")} — ${ch.size(key)} msg`); used.add(key); }
      for (const r of kids) { html += opt("c:" + r, `    └ ${label(firstOf(r))} — ${ch.size(r)} msg`); used.add(r); }
      n++;
    }
    const seen = new Set();
    ch.root.forEach((r, i) => { if (!used.has(r) && !seen.has(r) && ch.size(r) > 1) { seen.add(r); html += opt("c:" + r, `${label(i)} — ${ch.size(r)} msg`); } });
    select.innerHTML = opt("", T("⛓ Chuỗi lệnh ({n})", { n: n + seen.size })) + html;
  }

  const parseKey = s => /^\d+$/.test(s) ? +s : s;
  function choose(value) {
    if (value.startsWith("c:")) pick = { kind: "chain", key: +value.slice(2) };
    else if (value.startsWith("f:")) pick = { kind: "family", key: parseKey(value.slice(2)) };
    if (!valid(pick)) pick = null;
  }
  function follow(kind, i) {
    const key = kind === "family" ? familyKeyOf(i) : ctx.chain.root[i];
    pick = key === null ? null : { kind, key };
  }

  const members = () => !pick ? null : pick.kind === "chain" ? new Set(ctx.chain.root.flatMap((r, i) => r === pick.key ? [i] : [])) : ctx.chain.family(pick.key);
  function chip() {
    if (!pick) return "";
    return pick.kind === "chain" ? `⛓ ${T("Chuỗi lệnh: {n} message", { n: ctx.chain.size(pick.key) })}`
      : `🌳 ${T("{parent} + {k} lệnh con: {n} message", { parent: parentLabel(pick.key), k: ctx.chain.children(pick.key).length, n: ctx.chain.family(pick.key).size })}`;
  }
  const chainSize = i => i < 0 ? 0 : ctx.chain.size(ctx.chain.root[i]);
  const familySize = i => { const k = i < 0 ? null : familyKeyOf(i); return k === null ? 0 : ctx.chain.family(k).size; };

  // Share links / saved analyses: a chain root number, or "f:<key>" for a family (untrusted, validated on bind).
  const save = () => !pick ? null : pick.kind === "chain" ? pick.key : "f:" + pick.key;
  function load(v) {
    pick = Number.isInteger(v) ? { kind: "chain", key: v } : typeof v === "string" && v.startsWith("f:") ? { kind: "family", key: parseKey(v.slice(2)) } : null;
  }

  return { bind, fill, choose, follow, members, chip, chainSize, familySize, save, load, clear: () => { pick = null; } };
})();
