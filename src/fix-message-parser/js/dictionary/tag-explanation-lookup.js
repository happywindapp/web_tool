// Explanations: FIX Orchestra synopses (English) + venue spec v1.15 per-message tag notes, purposes, error codes (Vietnamese, "{venue}" = venue name from the data).
const FixKnow = (() => {
  let K = null, venue = "{venue}";
  const fill = s => s.replaceAll("{venue}", venue);
  const cut = (line, n) => { const p = line.split("|"); return [...p.slice(0, n - 1), p.slice(n - 1).join("|")]; };
  const each = (text, n, fn) => text.split("\n").filter(Boolean).forEach(l => fn(...cut(l, n)));
  const ER_ORDER = ["3", "0", "5", "4", "8"];

  function load() {
    if (K) return K;
    K = { field: new Map(), code: new Map(), msg: new Map(), hMsg: new Map(), hNote: new Map(), hErr: new Map(), byTag: new Map() };
    each(FixDocStd.fields, 2, (t, d) => K.field.set(t, d));
    each(FixDocStd.codes, 3, (t, v, d) => K.code.set(`${t}|${v}`, d));
    each(FixDocStd.messages, 2, (t, d) => K.msg.set(t, d));
    each(FixDocVenue.messages, 3, (k, title, purpose) => K.hMsg.set(k, { title, purpose }));
    each(FixDocVenue.notes, 4, (k, t, req, text) => {
      const note = { key: k, req, lines: text.split("¶") };
      K.hNote.set(`${k}|${t}`, note);
      if (!K.byTag.has(t)) K.byTag.set(t, note);
    });
    each(FixDocVenue.errors, 2, (c, d) => K.hErr.set(c, d));
    return K;
  }

  // The venue spec documents ExecutionReport once per ExecType ("8/3" = match notice …).
  const keyOf = m => m.type === "8" ? `8/${m.get("150") || "3"}` : m.type;
  const msgTitle = key => fill((load().hMsg.get(key) || {}).title || key);

  // → { key, req, lines, own } — own=false when the note comes from another message's table.
  function venueNote(m, tag) {
    const k = load(), key = keyOf(m);
    const hit = k.hNote.get(`${key}|${tag}`) || (m.type === "8" ? ER_ORDER.map(e => k.hNote.get(`8/${e}|${tag}`)).find(Boolean) : null);
    if (hit) return { ...hit, lines: hit.lines.map(fill), own: hit.key === key || m.type === "8" };
    const any = k.byTag.get(tag);
    return any ? { ...any, lines: any.lines.map(fill), own: false } : null;
  }

  // Value lists inside notes: "1 = …", "= 1 …", "R: …", "‘Y’ = …", "1 Mua"; the first line is the spec's Value/Note cell, not a list item.
  function valueIn(lines, value) {
    for (const raw of lines.slice(1)) {
      const l = raw.replace(/^[-•]\s*/, "").replace(/[‘’'"]/g, "").trim();
      const m = /^=\s*([A-Za-z0-9.+-]{1,8})\s*[:–-]?\s+(.+)$/.exec(l) || /^([A-Za-z0-9.+-]{1,8})\s*(?:=|:|–)\s*(.+)$/.exec(l) || /^(\d{1,3}|[A-Z])\s+(\S.+)$/.exec(l);
      if (m && m[1] === value) return m[2].trim();
    }
    return "";
  }

  const venueValue = (m, tag, value) => { const n = venueNote(m, tag); return n ? valueIn(n.lines, value) : ""; };
  const venueError = code => fill(load().hErr.get(code) || "");
  const venuePurpose = m => { const p = load().hMsg.get(keyOf(m)); return p ? { title: fill(p.title), purpose: fill(p.purpose) } : null; };
  const fieldDoc = tag => load().field.get(tag) || "";
  const codeDoc = (tag, value) => load().code.get(`${tag}|${value}`) || "";
  const msgDoc = type => load().msg.get(type) || "";
  const firstSentence = s => { const m = /^(.{20,}?[.!?])(\s|$)/.exec(s); return m ? m[1] : s; };

  return { setVenue: name => { venue = name; }, venue: () => venue, venueNote, venueValue, venueError, venuePurpose, fieldDoc, codeDoc, msgDoc, msgTitle, firstSentence };
})();
