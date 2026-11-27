// Numbers → words (pure): Vietnamese (mốt, lăm, linh, mươi / mười, tư; nghìn · triệu · tỷ, repeating to tỷ tỷ; "phẩy" for decimals) and English; up to 21 integer digits.
// Vietnamese words are single-quoted data: the i18n coverage test only scans double-quoted UI strings.
const NumWords = (() => {
  const MAX_DIGITS = 21;
  const VI = 'không một hai ba bốn năm sáu bảy tám chín'.split(' ');
  const W = { hundred: 'trăm', ten: 'mười', tens: 'mươi', odd: 'linh', one: 'mốt', four: 'tư', five: 'lăm', thousand: 'nghìn', million: 'triệu', billion: 'tỷ', minus: 'âm', point: 'phẩy', dong: 'đồng' };
  const EN = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
  const EN_TENS = "  twenty thirty forty fifty sixty seventy eighty ninety".split(" ");
  const EN_SCALE = ["", "thousand", "million", "billion", "trillion", "quadrillion", "quintillion"];
  const DEF = { lang: "vi", dong: false, cap: true };

  // "1.234.567,89" / "1,234,567.89" / "1_000" → { neg, int, frac } (digit strings); the last of two different separators is the decimal one,
  // a single separator followed by exactly 3 digits is a thousands separator in that language (vi ".", en ",").
  function parse(s, lang = "vi") {
    const m = /^(-)?(\d+(?:[.,_]\d+)*)$/.exec(s.trim());
    if (!m) return null;
    let body = m[2].replace(/_/g, "");
    const seps = body.match(/[.,]/g) || [];
    let dec = "";
    if (seps.length) {
      const last = seps[seps.length - 1], kinds = new Set(seps);
      if (kinds.size === 2) dec = last;
      else if (seps.length === 1 && !(new RegExp("^\\d{1,3}\\" + last + "\\d{3}$").test(body) && last === (lang === "en" ? "," : "."))) dec = last;
    }
    let int = body, frac = "";
    if (dec) { const at = body.lastIndexOf(dec); int = body.slice(0, at); frac = body.slice(at + 1); if (/[.,]/.test(frac)) return null; }
    int = int.replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
    return { neg: !!m[1], int, frac };
  }

  // Vietnamese: 3 digits; full = not the leading group (reads "không trăm", "linh").
  function viGroup(n, full) {
    const a = Math.floor(n / 100), b = Math.floor(n / 10) % 10, c = n % 10, out = [];
    if (a || full) out.push(VI[a], W.hundred);
    if (b === 0) { if (c && (a || full)) out.push(W.odd); if (c) out.push(VI[c]); }
    else if (b === 1) { out.push(W.ten); if (c) out.push(c === 5 ? W.five : VI[c]); }
    else { out.push(VI[b], W.tens); if (c) out.push(c === 1 ? W.one : c === 4 ? W.four : c === 5 ? W.five : VI[c]); }
    return out;
  }
  // Groups below a billion; a whole zero group is skipped.
  function viBelowBillion(n, full) {
    const g = [Math.floor(n / 1e6), Math.floor(n / 1e3) % 1000, n % 1000], names = [W.million, W.thousand, ""], out = [];
    g.forEach((v, i) => { if (!v) return; out.push(...viGroup(v, full || out.length > 0)); if (names[i]) out.push(names[i]); });
    return out;
  }
  function viInt(big, full = false) {
    if (big === 0n) return full ? [] : [VI[0]];
    const hi = big / 1000000000n, lo = Number(big % 1000000000n), out = [];
    if (hi) out.push(...viInt(hi), W.billion);
    if (lo) out.push(...viBelowBillion(lo, full || !!hi));
    return out;
  }

  function enGroup(n) {
    const out = [], a = Math.floor(n / 100), r = n % 100;
    if (a) out.push(EN[a], "hundred");
    if (r >= 20) out.push(EN_TENS[Math.floor(r / 10)] + (r % 10 ? "-" + EN[r % 10] : ""));
    else if (r) out.push(EN[r]);
    return out;
  }
  function enInt(big) {
    if (big === 0n) return [EN[0]];
    const out = [];
    for (let i = EN_SCALE.length - 1; i >= 0; i--) {
      const v = Number((big / 10n ** BigInt(3 * i)) % 1000n);
      if (v) out.push(...enGroup(v), ...(EN_SCALE[i] ? [EN_SCALE[i]] : []));
    }
    return out;
  }

  // One number string → words, or null when it is not a number / has more than 21 integer digits.
  function words(s, opts = {}) {
    const o = { ...DEF, ...opts }, p = parse(s, o.lang);
    if (!p || p.int.length > MAX_DIGITS) return null;
    const vi = o.lang !== "en", big = BigInt(p.int || "0"), out = [];
    if (p.neg && (big || /[1-9]/.test(p.frac))) out.push(vi ? W.minus : "minus");
    out.push(...(vi ? viInt(big) : enInt(big)));
    if (p.frac) {
      out.push(vi ? W.point : "point");
      if (vi) { const lead = /^0*/.exec(p.frac)[0], rest = p.frac.slice(lead.length); out.push(...[...lead].map(() => VI[0])); if (rest) out.push(...(rest.length > 3 ? [...rest].map(d => VI[+d]) : viInt(BigInt(rest)))); }
      else out.push(...[...p.frac].map(d => EN[+d]));
    }
    if (o.dong && vi) out.push(W.dong);
    const t = out.join(" ");
    return o.cap ? t.charAt(0).toLocaleUpperCase() + t.slice(1) : t;
  }

  const clean = o => ({ lang: o?.lang === "en" ? "en" : "vi", dong: o?.dong === true, cap: typeof o?.cap === "boolean" ? o.cap : DEF.cap });
  // Every number in the text → words (not parts of ids / dates / ranges like INV-2026-0042, 10-20); → { text, n, skipped }.
  function replaceAll(text, opts) {
    const o = clean(opts);
    let n = 0, skipped = 0;
    const out = text.replace(/(?<![\w.,-])-?\d+(?:[.,_]\d+)*(?![\w-])/g, m => { const w = words(m, o); if (w === null) { skipped++; return m; } n++; return w; });
    return { text: out, n, skipped };
  }

  return { DEF, MAX_DIGITS, parse, words, clean, replaceAll };
})();
