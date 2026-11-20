// Fuzzy matching for Quick Open / Command Palette: query letters in order, case-insensitive; runs and word starts score higher. null = no match.
const Fuzzy = (() => {
  const isStart = (text, i) => i === 0 || /[\s._\-/\\:(]/.test(text[i - 1]) || (/[A-Z]/.test(text[i]) && /[a-z]/.test(text[i - 1]));

  function score(query, text) {
    const q = query.toLowerCase().replace(/\s+/g, ""), t = text.toLowerCase();
    if (!q) return { score: 0, hits: [] };
    const hits = [];
    let from = 0, sc = 0, prev = -2;
    for (const ch of q) {
      const i = t.indexOf(ch, from);
      if (i < 0) return null;
      sc += (i === prev + 1 ? 5 : 1) + (isStart(text, i) ? 3 : 0);
      hits.push(i);
      prev = i;
      from = i + 1;
    }
    return { score: sc - hits[0] * 0.05 - t.length * 0.01, hits };
  }

  // → items sorted best first, each with .hits (matched character indexes of key(item)).
  function filter(query, items, key = x => x.label) {
    return items.map(it => ({ it, m: score(query, key(it)) })).filter(x => x.m)
      .sort((a, b) => b.m.score - a.m.score).map(x => Object.assign(x.it, { hits: x.m.hits }));
  }

  return { score, filter };
})();
