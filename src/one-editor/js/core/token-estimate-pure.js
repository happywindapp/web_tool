// LLM token estimate (no tokenizer vendored): ASCII letters / digits / spaces ~4 chars per token, ASCII punctuation ~2, other alphabetic scripts (Vietnamese with marks, Cyrillic…) ~2, CJK / kana / hangul / emoji ~1.
const TokenEst = (() => {
  // Past 1M chars the first 1M is measured and scaled (a menu opening on a select-all stays instant).
  const SAMPLE = 1000000;
  function count(text) {
    if (text.length > SAMPLE) return Math.ceil(count(text.slice(0, SAMPLE)) * text.length / SAMPLE);
    let t = 0;
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c < 128) t += (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 32 || c === 9 || c === 10 || c === 13 ? 0.25 : 0.5;
      else if ((c >= 0x2e80 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af) || (c >= 0xf900 && c <= 0xfaff) || c >= 0x1f000) t += 1;
      else t += 0.5;
    }
    return Math.ceil(t);
  }
  return { count };
})();
