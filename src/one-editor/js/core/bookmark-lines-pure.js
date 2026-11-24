// Bookmark line lists: sorted unique line numbers, and the text of given lines read from plain text without splitting it all.
const BookmarkLines = (() => {
  const clean = lines => Array.isArray(lines) ? [...new Set(lines)].filter(n => Number.isInteger(n) && n > 0).sort((a, b) => a - b) : [];

  // One pass up to the last wanted line; \r\n, \r and \n all end a line. Each text is cut at max characters.
  function texts(text, lines, max = 200) {
    const want = new Map(clean(lines).map(n => [n, ""])), last = want.size ? Math.max(...want.keys()) : 0, eol = /\r\n?|\n/g;
    for (let n = 1, at = 0; n <= last; n++) {
      eol.lastIndex = at;
      const hit = eol.exec(text), end = hit ? hit.index : text.length;
      if (want.has(n)) want.set(n, text.slice(at, Math.min(end, at + max)));
      if (!hit) break;
      at = hit.index + hit[0].length;
    }
    return (Array.isArray(lines) ? lines : []).map(n => want.get(n) ?? "");
  }

  return { clean, texts };
})();
