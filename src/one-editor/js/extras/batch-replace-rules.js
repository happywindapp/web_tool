// Batch replace, pure: rules { on, find, repl, regex, matchCase, word } run in order on a text (same regex / $1 / \n rules as Find in files); counts per rule.
const BatchRules = (() => {
  const MAX_RULES = 200;
  const blank = () => ({ on: true, find: "", repl: "", regex: false, matchCase: false, word: false });

  // Untrusted (IndexedDB / localStorage) → clean rules.
  const clean = list => (Array.isArray(list) ? list : []).slice(0, MAX_RULES).filter(r => r && typeof r === "object")
    .map(r => ({ on: r.on !== false, find: String(r.find ?? ""), repl: String(r.repl ?? ""), regex: r.regex === true, matchCase: r.matchCase === true, word: r.word === true }));

  // → { text, counts: [n | null (off / empty)], total, errors: [{ i, message }] }; a bad regex skips its rule.
  function apply(text, rules) {
    const counts = [], errors = [];
    let total = 0;
    rules.forEach((r, i) => {
      if (!r.on || !r.find) { counts.push(null); return; }
      let re;
      try { re = FindCore.compile(r.find, r); } catch (e) { counts.push(null); errors.push({ i, message: e.message }); return; }
      const edits = FindCore.edits(text, re, r.repl, r.regex);
      counts.push(edits.length);
      total += edits.length;
      if (!edits.length) return;
      let out = "", at = 0;
      for (const e of edits) { out += text.slice(at, e.from) + e.insert; at = e.to; }
      text = out + text.slice(at);
    });
    return { text, counts, total, errors };
  }

  // Smallest single change turning a into b (common prefix / suffix kept) — one undo step, folds and bookmarks outside stay put.
  function diff(a, b) {
    let s = 0, e = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
    return { from: s, to: a.length - e, insert: b.slice(s, b.length - e) };
  }

  return { blank, clean, apply, diff, MAX_RULES };
})();
