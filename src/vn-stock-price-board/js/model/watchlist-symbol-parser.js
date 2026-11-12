// Free text "VNM, fpt; HPG" → unique upper-case symbols + tokens that cannot be a ticker (kept to report, never sent).
const WatchParse = (() => {
  const SYM = /^[A-Z0-9]{3,10}$/;
  const isSymbol = s => typeof s === "string" && SYM.test(s);

  function parse(text) {
    const symbols = [], bad = [], seen = new Set();
    for (const raw of String(text ?? "").split(/[\s,;|]+/)) {
      if (!raw) continue;
      const s = raw.toUpperCase();
      if (!SYM.test(s)) { bad.push(raw); continue; }
      if (!seen.has(s)) { seen.add(s); symbols.push(s); }
    }
    return { symbols, bad };
  }

  // Untrusted arrays (share link, storage) → valid unique symbols only, capped so a link cannot flood the feed.
  const clean = (arr, max = 300) => Array.isArray(arr) ? [...new Set(arr.filter(isSymbol))].slice(0, max) : [];

  return { parse, clean, isSymbol };
})();
