// Look-up terms: every highlighted phrase and each of its words (multi-cursor too) is one term with its sentence in the source; no highlight ⇒ the whole tab when it is one short English term.
const TrTerms = (() => {
  const MAX = 10, MAX_PHRASE = 6, NEAR = 300, LETTER = /[\p{L}\p{N}]/u, NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u, WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
  const END = /[.!?]["'”’)\]]*(?=\s)|[。！？]["'”’」』)\]]*|\n/g, MARKERS = /^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+(?:\[[ xX]\]\s+)?|\d{1,9}[.)]\s+)*/;
  const clean = s => String(s).replace(/\s+/g, " ").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

  // The sentence of text around [from, to) (≤ 300 chars each side), Markdown markers removed; "" when it is just the term.
  function sentence(text, from, to, term) {
    const base = Math.max(0, from - NEAR);
    let start = base, end = Math.min(text.length, to + NEAR);
    for (const m of text.slice(base, from).matchAll(END)) start = base + m.index + m[0].length;
    const m = new RegExp(END.source).exec(text.slice(to, end));
    if (m) end = to + m.index + (m[0] === "\n" ? 0 : m[0].length);
    const s = text.slice(start, end).replace(MARKERS, "").replace(/\s+/g, " ").trim();
    if (clean(s).toLowerCase() === term.toLowerCase()) return "";
    return (start === base && base > 0 ? "…" : "") + s + (!m && end < text.length ? "…" : "");
  }

  // ranges: [{ from, to }] → a range of 2–6 words is one phrase term, then each of its words is one term (a range cut mid-word grows to the whole word, except in scripts written without spaces): { terms: [{ term, key, sentence }] (≤ 10, case-insensitive unique, in order), skipped }.
  function fromRanges(text, ranges, lang) {
    const terms = [], seen = new Set(), isChar = i => LETTER.test(text[i] || "") && !NO_SPACES.test(text[i]);
    let skipped = 0;
    const add = (term, at) => {
      if (seen.has(term.toLowerCase())) return;
      seen.add(term.toLowerCase());
      if (terms.length >= MAX) { skipped++; return; }
      terms.push({ term, key: TrDict.candidate(term, lang), sentence: sentence(text, at, at + term.length, term) });
    };
    for (const r of ranges) {
      let from = r.from, to = r.to;
      if (from === to) continue;
      while (from > 0 && isChar(from - 1) && isChar(from)) from--;
      while (to < text.length && isChar(to) && isChar(to - 1)) to++;
      const words = [...text.slice(from, to).matchAll(WORD)].map(m => ({ term: m[0], at: from + m.index }));
      if (words.length >= 2 && words.length <= MAX_PHRASE) {
        const first = words[0].at, last = words[words.length - 1];
        add(text.slice(first, last.at + last.term.length).replace(/\s+/g, " "), first);
      }
      for (const w of words) add(w.term, w.at);
    }
    return { terms, skipped };
  }

  function fromText(text, lang) {
    const key = TrDict.candidate(text, lang);
    return { terms: key ? [{ term: String(text).trim().replace(/\s+/g, " "), key, sentence: "" }] : [], skipped: 0 };
  }

  return { fromRanges, fromText, sentence, MAX };
})();
