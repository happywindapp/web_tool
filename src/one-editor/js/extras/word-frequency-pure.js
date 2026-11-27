// Word frequency (pure): words (letters / digits, any script, ' and - inside) counted case-insensitively → Markdown table word · count · %, optional English stopwords off, top N.
const WordFreq = (() => {
  const STOP = new Set(("a about above after again against all am an and any are as at be because been before being below between both but by can did do does doing down during each few for from further " +
    "had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own " +
    "same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with " +
    "you your yours yourself yourselves s t don can't won't isn't aren't wasn't weren't i'm it's that's there's").split(" "));
  const DEF = { stop: true, top: 100 };
  const clean = o => ({ stop: typeof o?.stop === "boolean" ? o.stop : DEF.stop, top: Math.max(0, Math.min(100000, Math.floor(+o?.top) || 0)) });

  // → { text, words: [{ word, n }], total, distinct }.
  function run(text, opts) {
    const o = clean(opts), m = new Map();
    let total = 0;
    for (const [w] of text.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)) {
      const k = w.toLocaleLowerCase().replace(/’/g, "'");
      if (o.stop && STOP.has(k)) continue;
      total++;
      m.set(k, (m.get(k) || 0) + 1);
    }
    const all = [...m].map(([word, n]) => ({ word, n })).sort((a, b) => b.n - a.n || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
    const list = o.top ? all.slice(0, o.top) : all, pct = n => (total ? (100 * n / total).toFixed(2) : "0.00") + "%";
    const rows = list.map((r, i) => "| " + (i + 1) + " | " + r.word.replace(/\|/g, "\\|") + " | " + r.n + " | " + pct(r.n) + " |");
    return { text: ["| # | Word | Count | % |", "|---:|---|---:|---:|", ...rows].join("\n") + "\n", words: list, total, distinct: all.length };
  }

  return { DEF, STOP, clean, run };
})();
