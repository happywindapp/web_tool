// Anonymizes chosen categories in the pasted text: same length, one pseudonym per original value (order chains stay linked), 9/10 re-signed for valid messages.
const FixMask = (() => {
  const CATEGORIES = {
    acct: { label: "Tài khoản (1, 79, 440; 2 với Server Sàn)", tags: ["1", "79", "440"], venue: ["2"] },
    cred: { label: "Đăng nhập / mật khẩu (553, 554, 925)", tags: ["553", "554", "925"], stars: true },
    party: { label: "Mã thành viên / party (448, 449, 4488)", tags: ["448", "449", "4488"] },
    comp: { label: "CompID người gửi / nhận (49, 56, 50, 57, 115, 128)", tags: ["49", "56", "50", "57", "115", "128"] },
    ids: { label: "Số hiệu lệnh (11, 41, 37, 17, 526, 548, 551, 117, 131, 171, 693)", tags: ["11", "41", "37", "17", "526", "548", "551", "117", "131", "171", "693"] },
    text: { label: "Text tự do (58)", tags: ["58"], stars: true },
  };
  const DEFAULT = ["acct", "cred"];

  // Keeps a short prefix (firm/account type) and a counter at the end: "001C000101" → "001CXXXX01".
  function pseudonym(map, v) {
    if (map.has(v)) return map.get(v);
    const keep = Math.min(4, Math.floor(v.length / 2)), n = String(map.size + 1), room = v.length - keep;
    const p = v.slice(0, keep) + (n.length >= room ? n.slice(-room) : "X".repeat(room - n.length) + n);
    map.set(v, p);
    return p;
  }

  // cats: category keys; extra: more tags to pseudonymize (custom dictionary "sensitive").
  function apply(text, items, dialect, cats = DEFAULT, extra = []) {
    const stars = new Set(), pseudo = new Set(extra);
    for (const k of cats) {
      const c = CATEGORIES[k];
      if (!c) continue;
      for (const t of [...c.tags, ...(dialect === "venue" && c.venue ? c.venue : [])]) (c.stars ? stars : pseudo).add(t);
    }
    const map = new Map(), lines = text.split("\n");
    let count = 0;
    for (const it of items) {
      if (!it.delim) continue;
      const fields = FixCodec.split(it.raw, it.delim);
      const v = FixCodec.verify(fields);
      const valid = v.checkSum.declared !== null && v.checkSum.declared === v.checkSum.actual && v.bodyLength.declared === v.bodyLength.actual;
      let changed = 0;
      const next = fields.map(f => {
        if (f.tag === null || !f.value || /^\*+$/.test(f.value) || !(stars.has(f.tag) || pseudo.has(f.tag))) return f;
        changed++;
        return { tag: f.tag, value: stars.has(f.tag) ? "*".repeat(f.value.length) : pseudonym(map, f.value) };
      });
      if (!changed) continue;
      let raw = FixCodec.toWire(valid ? FixCodec.rebuild(next) : next, it.delim);
      if (!it.raw.endsWith(it.delim)) raw = raw.slice(0, -it.delim.length);
      lines[it.line - 1] = lines[it.line - 1].replace(it.raw, () => raw);
      count += changed;
    }
    // Plain log lines ("Created session …FIRM001->…") get the same pseudonyms so nothing leaks around the messages.
    const fixLines = new Set(items.map(it => it.line - 1));
    const keys = [...map.keys()].filter(k => k.length >= 4).sort((a, b) => b.length - a.length);
    if (keys.length) {
      const re = new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
      lines.forEach((l, i) => { if (!fixLines.has(i)) lines[i] = l.replace(re, k => { count++; return map.get(k); }); });
    }
    return { text: lines.join("\n"), count };
  }

  return { apply, CATEGORIES, DEFAULT };
})();
