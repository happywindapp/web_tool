// Pure (node test): colour tags keyed by "<root folder>/<relative path>" — 6 colours named in Vietnamese or English, the "tag:" filter words, and the path map kept in step with rename / move / delete.
const TagMap = (() => {
  const COLORS = ["red", "orange", "yellow", "green", "blue", "purple"], MAX = 5000;
  const LABEL = { red: "Đỏ", orange: "Cam", yellow: "Vàng", green: "Xanh lá", blue: "Xanh dương", purple: "Tím" };
  const WORDS = { red: "red do", orange: "orange cam", yellow: "yellow vang", green: "green xanhla xanhluc luc", blue: "blue xanhduong duong", purple: "purple violet tim" };
  const BY_WORD = new Map(Object.entries(WORDS).flatMap(([c, w]) => w.split(" ").map(x => [x, c])));
  const key = s => NameMatch.fold(s).replace(/[\s_-]+/g, "");

  // A colour word (any case / accents, "xanh-lá" = "xanhla") → colour id, or null; "xanh" alone is green or blue in Vietnamese, so it is not a colour.
  const colorOf = w => BY_WORD.get(key(w)) || null;
  const under = (k, p) => k === p || k.startsWith(p + "/");

  // Stored map from IndexedDB: string keys, known colours, at most MAX entries.
  function clean(obj) {
    const out = {};
    if (!obj || typeof obj !== "object") return out;
    for (const [k, v] of Object.entries(obj).slice(0, MAX)) if (typeof k === "string" && k && COLORS.includes(v)) out[k] = v;
    return out;
  }

  // color null ⇒ untag. → the new map, or null when it would pass MAX entries.
  function put(map, paths, color) {
    const next = { ...map };
    for (const p of paths) if (color) next[p] = color; else delete next[p];
    return Object.keys(next).length > MAX ? null : next;
  }

  // A rename / move of `from` carries the tags of it and of everything below it. → the same map when nothing moved.
  function move(map, from, to) {
    if (from === to || !Object.keys(map).some(k => under(k, from))) return map;
    const next = {};
    for (const [k, v] of Object.entries(map)) next[under(k, from) ? to + k.slice(from.length) : k] = v;
    return next;
  }

  // Deleted paths (and what was below them) lose their tags. → { map, gone: [[path, colour]] } to put back on undo.
  function drop(map, paths) {
    const gone = Object.entries(map).filter(([k]) => paths.some(p => under(k, p)));
    if (!gone.length) return { map, gone };
    const next = { ...map };
    gone.forEach(([k]) => delete next[k]);
    return { map: next, gone };
  }

  // Filter text → { colors: Set (ids, "*" = any tag; empty = an unknown colour, nothing passes) or null, rest: the name part }.
  function query(text) {
    let colors = null, bad = false;
    const rest = String(text).replace(/(^|[\s;])tag:([^\s;]*)/gi, (m, pre, w) => {
      colors ??= new Set();
      const c = w ? colorOf(w) : "*";
      if (c) colors.add(c); else bad = true;
      return pre;
    }).replace(/^[\s;]+|[\s;]+$/g, "");
    if (bad) colors.clear();
    return { colors, rest };
  }
  const hits = (colors, c) => !!c && (colors.has("*") || colors.has(c));

  return { COLORS, LABEL, MAX, colorOf, clean, put, move, drop, query, hits };
})();
