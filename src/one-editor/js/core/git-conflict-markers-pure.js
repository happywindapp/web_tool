// Git conflict blocks: whole-line markers <<<<<<< · ||||||| (diff3 base) · ======= · >>>>>>>, a block counts only when all its markers are there in order (a setext "=======" heading alone never matches).
const GitConflict = (() => {
  const START = /^<{7}(?: |$)/, BASE = /^\|{7}(?: |$)/, MID = /^={7}$/, END = /^>{7}(?: |$)/;
  const has = text => /^<{7}(?: |\r?$)/m.test(text) && /^>{7}(?: |\r?$)/m.test(text);

  // → [{ from, to, line, endLine, a, b, ours: [from, to], base: [from, to] | null, theirs: [from, to] }] — char offsets, `to` past the end marker's line break.
  function find(text, max = 1000) {
    const out = [];
    if (!has(text)) return out;
    let pos = 0, line = 0, cur = null;
    for (;;) {
      const nl = text.indexOf("\n", pos), end = nl < 0 ? text.length : nl, next = nl < 0 ? text.length : nl + 1;
      let s = text.slice(pos, end);
      if (s.endsWith("\r")) s = s.slice(0, -1);
      line++;
      if (START.test(s)) cur = { from: pos, line, a: s.slice(8).trim(), oursFrom: next, stage: 1 };
      else if (cur?.stage === 1 && BASE.test(s)) Object.assign(cur, { oursTo: pos, baseFrom: next, stage: 2 });
      else if (cur && cur.stage < 3 && MID.test(s)) {
        if (cur.stage === 1) cur.oursTo = pos; else cur.baseTo = pos;
        Object.assign(cur, { theirsFrom: next, stage: 3 });
      } else if (cur?.stage === 3 && END.test(s)) {
        out.push({ from: cur.from, to: next, line: cur.line, endLine: line, a: cur.a, b: s.slice(8).trim(), ours: [cur.oursFrom, cur.oursTo], base: cur.baseFrom === undefined ? null : [cur.baseFrom, cur.baseTo], theirs: [cur.theirsFrom, pos] });
        cur = null;
        if (out.length >= max) break;
      }
      if (nl < 0) break;
      pos = next;
    }
    return out;
  }

  // choice: "current" (ours) · "incoming" (theirs) · "both" (ours then theirs) · "base".
  function pick(text, b, choice) {
    const part = r => r ? text.slice(r[0], r[1]) : "";
    if (choice === "incoming") return part(b.theirs);
    if (choice === "both") return part(b.ours) + part(b.theirs);
    if (choice === "base") return part(b.base);
    return part(b.ours);
  }

  // Every block resolved the same way → the changes (ascending, original offsets) for one transaction.
  const changes = (text, blocks, choice) => blocks.map(b => ({ from: b.from, to: b.to, insert: pick(text, b, choice) }));

  function resolveAll(text, choice) {
    let out = "", at = 0;
    for (const c of changes(text, find(text), choice)) { out += text.slice(at, c.from) + c.insert; at = c.to; }
    return out + text.slice(at);
  }

  return { has, find, pick, changes, resolveAll };
})();
