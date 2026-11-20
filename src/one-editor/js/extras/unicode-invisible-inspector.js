// Invisible / look-alike characters, pure: zero-width + BOM + bidi (Cf), odd spaces (Zs ≠ space), control chars (Cc ≠ tab / LF / CR), line separators, Cyrillic / Greek letters inside Latin words.
const Invisible = (() => {
  const NAMES = {
    0x00: "NUL", 0x01: "SOH (FIX)", 0x02: "STX", 0x03: "ETX", 0x04: "EOT", 0x07: "BEL", 0x08: "BS", 0x0b: "VT", 0x0c: "FF", 0x1b: "ESC", 0x7f: "DEL",
    0xa0: "NO-BREAK SPACE", 0xad: "SOFT HYPHEN", 0x61c: "ARABIC LETTER MARK", 0x1680: "OGHAM SPACE MARK", 0x180e: "MONGOLIAN VOWEL SEPARATOR",
    0x2000: "EN QUAD", 0x2001: "EM QUAD", 0x2002: "EN SPACE", 0x2003: "EM SPACE", 0x2004: "THREE-PER-EM SPACE", 0x2005: "FOUR-PER-EM SPACE", 0x2006: "SIX-PER-EM SPACE",
    0x2007: "FIGURE SPACE", 0x2008: "PUNCTUATION SPACE", 0x2009: "THIN SPACE", 0x200a: "HAIR SPACE", 0x200b: "ZERO WIDTH SPACE", 0x200c: "ZERO WIDTH NON-JOINER",
    0x200d: "ZERO WIDTH JOINER", 0x200e: "LEFT-TO-RIGHT MARK", 0x200f: "RIGHT-TO-LEFT MARK", 0x2028: "LINE SEPARATOR", 0x2029: "PARAGRAPH SEPARATOR",
    0x202a: "LEFT-TO-RIGHT EMBEDDING", 0x202b: "RIGHT-TO-LEFT EMBEDDING", 0x202c: "POP DIRECTIONAL FORMATTING", 0x202d: "LEFT-TO-RIGHT OVERRIDE", 0x202e: "RIGHT-TO-LEFT OVERRIDE",
    0x202f: "NARROW NO-BREAK SPACE", 0x205f: "MEDIUM MATHEMATICAL SPACE", 0x2060: "WORD JOINER", 0x2066: "LEFT-TO-RIGHT ISOLATE", 0x2067: "RIGHT-TO-LEFT ISOLATE",
    0x2068: "FIRST STRONG ISOLATE", 0x2069: "POP DIRECTIONAL ISOLATE", 0x3000: "IDEOGRAPHIC SPACE", 0xfeff: "BOM / ZERO WIDTH NO-BREAK SPACE",
  };
  // Cyrillic / Greek letters that look like Latin ones.
  const LOOK = "аaеeоoрpсcуyхxіiјjѕsԁdһhАAВBЕEКKМMНHОOРPСCТTХXІIЈJЅSΑAΒBΕEΖZΗHΙIΚKΜMΝNΟOΡPΤTΥYΧXοoνvκkρp";
  const LATIN = new Map();
  for (let i = 0; i + 1 < LOOK.length; i += 2) LATIN.set(LOOK[i], LOOK[i + 1]);
  const KINDS = ["zw", "bidi", "space", "control", "sep", "look"];
  const LABELS = { zw: "Độ rộng 0 / BOM / gạch nối mềm", bidi: "Điều khiển hướng chữ (bidi)", space: "Dấu cách lạ (NBSP…)", control: "Ký tự điều khiển", sep: "Ngăn dòng Unicode", look: "Chữ Cyrillic / Hy Lạp giống Latin" };
  const RE = /[\p{Cf}\p{Zl}\p{Zp}]|[^\P{Zs} ]|[^\P{Cc}\t\n\r]|[\p{Script=Cyrillic}\p{Script=Greek}]/gu;
  const LATIN_NEAR = /\p{Script=Latin}/u;

  function kindOf(cp, ch, text, at) {
    if ((cp >= 0x202a && cp <= 0x202e) || (cp >= 0x2066 && cp <= 0x2069) || cp === 0x200e || cp === 0x200f || cp === 0x61c) return "bidi";
    if (cp === 0x2028 || cp === 0x2029) return "sep";
    if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return "control";
    if (/\p{Zs}/u.test(ch)) return "space";
    if (/\p{Cf}/u.test(ch)) return "zw";
    // A Cyrillic / Greek letter counts only next to a Latin letter in the same word (a Russian sentence is fine).
    const word = /[\p{L}\p{M}]*$/u.exec(text.slice(Math.max(0, at - 30), at))[0] + /^[\p{L}\p{M}]*/u.exec(text.slice(at, at + 30))[0];
    return LATIN.has(ch) && LATIN_NEAR.test(word) ? "look" : null;
  }

  const hex = cp => "U+" + cp.toString(16).toUpperCase().padStart(4, "0");
  // → { items: [{ at, len, line, col, cp, code, kind, name }] (≤ limit), counts: { kind: n }, total }.
  function scan(text, limit = 5000) {
    const items = [], counts = {};
    let total = 0, line = 1, lineAt = 0, last = 0;
    RE.lastIndex = 0;
    for (let m; (m = RE.exec(text));) {
      const ch = m[0], cp = ch.codePointAt(0), kind = kindOf(cp, ch, text, m.index);
      if (!kind) continue;
      for (let i = text.indexOf("\n", last); i >= 0 && i < m.index; i = text.indexOf("\n", i + 1)) { line++; lineAt = i + 1; }
      last = m.index;
      counts[kind] = (counts[kind] || 0) + 1;
      total++;
      if (items.length < limit) items.push({ at: m.index, len: ch.length, line, col: m.index - lineAt + 1, cp, code: hex(cp), kind, name: NAMES[cp] || (kind === "look" ? "≈ " + LATIN.get(ch) : hex(cp)) });
    }
    return { items, counts, total };
  }

  // What a fix does per kind: drop, a plain space / LF, the Latin look-alike; "soh" turns SOH into | (FIX logs).
  const FIX = { zw: () => "", bidi: () => "", space: () => " ", sep: () => "\n", control: () => "", look: ch => LATIN.get(ch) ?? ch, soh: ch => ch.charCodeAt(0) === 1 ? "|" : ch };
  // → [{ from, to, insert }] for every char of the kind (all of them, not only the listed ones).
  function edits(text, kind) {
    const out = [], target = kind === "soh" ? "control" : kind;
    RE.lastIndex = 0;
    for (let m; (m = RE.exec(text));) {
      if (kindOf(m[0].codePointAt(0), m[0], text, m.index) !== target) continue;
      const insert = FIX[kind](m[0]);
      if (insert !== m[0]) out.push({ from: m.index, to: m.index + m[0].length, insert });
    }
    return out;
  }

  // "a⟨ZWSP⟩b" style preview of the line around the char (control / invisible chars made visible).
  function context(text, it, span = 24) {
    const s = Math.max(0, it.at - span), e = Math.min(text.length, it.at + it.len + span);
    const vis = str => str.replace(/[\r\n]+/g, " ").replace(RE, ch => { const cp = ch.codePointAt(0); return /[\p{Script=Cyrillic}\p{Script=Greek}]/u.test(ch) ? ch : "⟨" + hex(cp) + "⟩"; });
    return { before: (s > 0 ? "…" : "") + vis(text.slice(s, it.at)), mark: kindOf(it.cp, text.slice(it.at, it.at + it.len), text, it.at) === "look" ? text.slice(it.at, it.at + it.len) : "⟨" + it.code + "⟩", after: vis(text.slice(it.at + it.len, e)) + (e < text.length ? "…" : "") };
  }

  return { scan, edits, context, KINDS, LABELS, NAMES, hex };
})();
