// Wrap / join lines (pure): each line → prefix + quoted item + suffix, joined, optionally in batches of N with a head / tail per batch (SQL IN, VALUES, JSON array…).
const WrapLines = (() => {
  const QUOTES = ["none", "single", "double", "singleAuto"];
  const DEF = { prefix: "", suffix: "", quote: "single", join: ", ", batch: 0, head: "(", tail: ")", sep: "\\n", trim: true, skipEmpty: true, unique: false };
  // SQL IN: Oracle takes at most 1,000 items per IN list; SQL Server takes at most 1,000 rows per VALUES.
  const PRESETS = {
    "sql-in": { quote: "singleAuto", join: ", ", batch: 1000, head: "id IN (", tail: ")", sep: "\\nOR ", prefix: "", suffix: "" },
    "sql-values": { quote: "singleAuto", prefix: "(", suffix: ")", join: ",\\n", batch: 1000, head: "VALUES\\n", tail: ";", sep: "\\n" },
    "json-array": { quote: "double", prefix: "", suffix: "", join: ", ", batch: 0, head: "[", tail: "]", sep: "\\n" },
    "go-slice": { quote: "double", prefix: "", suffix: "", join: ", ", batch: 0, head: "[]string{", tail: "}", sep: "\\n" },
    "cs-array": { quote: "double", prefix: "", suffix: "", join: ", ", batch: 0, head: "new[] { ", tail: " }", sep: "\\n" },
  };
  const MAX_BATCH = 1000000;

  // \n and \t typed in a field mean a line break / tab; \\ is a backslash.
  const unesc = s => String(s).replace(/\\(n|t|\\)/g, (a, c) => c === "n" ? "\n" : c === "t" ? "\t" : "\\");
  const isNum = s => /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s);
  const json = s => JSON.stringify(s);

  // Untrusted (link, hot exit) → known fields of known types.
  function clean(o) {
    const v = { ...DEF };
    if (!o || typeof o !== "object") return v;
    for (const k of ["prefix", "suffix", "join", "head", "tail", "sep"]) if (typeof o[k] === "string") v[k] = o[k].slice(0, 500);
    for (const k of ["trim", "skipEmpty", "unique"]) if (typeof o[k] === "boolean") v[k] = o[k];
    if (QUOTES.includes(o.quote)) v.quote = o.quote;
    const n = Math.floor(+o.batch);
    v.batch = Number.isFinite(n) && n > 0 ? Math.min(n, MAX_BATCH) : 0;
    return v;
  }

  // → { text, items, batches }.
  function run(text, opts) {
    const o = clean(opts);
    let items = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
    if (o.trim) items = items.map(s => s.trim());
    if (o.skipEmpty) items = items.filter(s => s.trim());
    if (o.unique) items = [...new Set(items)];
    const auto = o.quote === "singleAuto" && items.length && items.every(isNum);
    const q = o.quote === "double" ? json : o.quote === "single" || (o.quote === "singleAuto" && !auto) ? s => "'" + s.replace(/'/g, "''") + "'" : s => s;
    const pre = unesc(o.prefix), suf = unesc(o.suffix), join = unesc(o.join), head = unesc(o.head), tail = unesc(o.tail), sep = unesc(o.sep);
    const wrapped = items.map(s => pre + q(s) + suf), size = o.batch || wrapped.length || 1, out = [];
    for (let i = 0; i < wrapped.length || (!i && !wrapped.length); i += size) out.push(head + wrapped.slice(i, i + size).join(join) + tail);
    return { text: out.join(sep), items: items.length, batches: wrapped.length ? out.length : 0, numeric: auto };
  }

  return { DEF, PRESETS, QUOTES, clean, run, unesc };
})();
