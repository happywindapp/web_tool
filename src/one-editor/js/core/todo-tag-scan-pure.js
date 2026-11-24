// TODO / FIXME scan (pure): tags from a comma list, a regex that wants a comment mark or the line start before an upper-case tag (so todoList / TODO.md in prose do not count), per-line hits.
const TodoScan = (() => {
  const DEFAULT = ["TODO", "FIXME", "HACK", "XXX", "BUG"];
  const MARK = String.raw`(?:^\s*|(?://|#|<!--|/\*|\*|--|;|%|'|\bREM\s)\s*)`;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // "todo, Fixme,  NOTE" → ["TODO", "FIXME", "NOTE"]; junk dropped; nothing usable ⇒ the defaults.
  function tags(text) {
    const out = [];
    for (const t of String(text ?? "").split(",")) {
      const k = t.trim().toUpperCase();
      if (/^[\p{L}\p{N}_-]{1,24}$/u.test(k) && !out.includes(k)) out.push(k);
    }
    return out.length ? out.slice(0, 20) : [...DEFAULT];
  }

  // The tag itself is case-sensitive; it must end at a non-word char and not run into "TODO.md" / "TODO-list".
  const regex = list => new RegExp(MARK + "(" + list.map(esc).join("|") + String.raw`)(?![\p{L}\p{N}_-]|\.[\p{L}\p{N}])\s*[:(]?\s*(.*)`, "u");

  // Strips a closing comment mark from the note: "fix this */" → "fix this".
  const tidy = s => s.replace(/\s*(?:\*\/|-->)\s*$/, "").trim().slice(0, 200);

  // text → [{ line, col, tag, note }], at most max hits.
  function scan(text, re, max = Infinity) {
    const out = [];
    let line = 0, at = 0;
    while (at <= text.length && out.length < max) {
      const end = text.indexOf("\n", at), s = text.slice(at, end < 0 ? text.length : end);
      line++;
      const m = s.length < 4000 ? re.exec(s) : null;
      if (m) out.push({ line, col: m.index + m[0].indexOf(m[1]) + 1, tag: m[1], note: tidy(m[2] || "") });
      if (end < 0) break;
      at = end + 1;
    }
    return out;
  }

  // CSS class of a tag's colour: FIXME / BUG red, HACK / XXX amber, the rest teal.
  const tone = tag => /^(FIXME|BUG)$/.test(tag) ? "todo-bad" : /^(HACK|XXX)$/.test(tag) ? "todo-warn" : "todo-acc";

  // [{ key, name, … hits }] → [{ tag, items: [{ g, hit }] }] in tag-list order.
  function byTag(groups, list) {
    const m = new Map(list.map(t => [t, []]));
    for (const g of groups) for (const hit of g.hits) (m.get(hit.tag) || m.set(hit.tag, []).get(hit.tag)).push({ g, hit });
    return [...m].filter(([, items]) => items.length).map(([tag, items]) => ({ tag, items }));
  }

  return { DEFAULT, tags, regex, scan, tone, byTag };
})();
