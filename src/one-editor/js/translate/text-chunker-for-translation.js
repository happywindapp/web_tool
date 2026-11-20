// Splits a text into pieces to translate and pieces kept as is (line breaks, indentation, Markdown markers, fenced code), then puts the translations back in place.
const TrChunk = (() => {
  const FENCE = /^ {0,3}(`{3,}|~{3,})/;
  const MARKER = /^(\s*(?:#{1,6}\s+|>\s?|[-*+]\s+(?:\[[ xX]\]\s+)?|\d{1,9}[.)]\s+)*)/;
  const bytes = s => new TextEncoder().encode(s).length;

  // Cuts one line into pieces of ≤ max UTF-8 bytes: at sentence ends, then spaces, then anywhere; the whitespace between pieces is kept.
  function cut(text, max) {
    if (bytes(text) <= max) return [text];
    for (const level of [/(?<=[.!?。！？;:])(\s+)/u, /(\s+)/u]) {
      const parts = text.split(level);
      if (parts.length < 2) continue;
      const out = [];
      let buf = "";
      const flush = () => { const t = buf.trimEnd(); if (t) out.push(t); if (buf.length > t.length) out.push({ keep: buf.slice(t.length) }); buf = ""; };
      for (let i = 0; i < parts.length; i += 2) {
        const word = parts[i], sep = parts[i + 1] || "";
        if (buf && bytes(buf + word) > max) flush();
        if (bytes(word) > max) { out.push(...cut(word, max)); if (sep) out.push({ keep: sep }); continue; }
        buf += word + sep;
      }
      flush();
      return out;
    }
    const out = [];
    let piece = "";
    for (const ch of text) { if (piece && bytes(piece + ch) > max) { out.push(piece); piece = ""; } piece += ch; }
    if (piece) out.push(piece);
    return out;
  }

  // → [{ t, tr }]: tr = true for text to translate. Fenced code blocks (``` / ~~~) stay untouched.
  function plan(text, max = 450) {
    const segs = [], keep = t => { if (!t) return; const last = segs[segs.length - 1]; if (last && !last.tr) last.t += t; else segs.push({ t, tr: false }); };
    let fence = null;
    for (const piece of String(text).split(/(\r?\n|\r)/)) {
      if (/^(\r?\n|\r)$/.test(piece)) { keep(piece); continue; }
      const f = FENCE.exec(piece);
      if (fence) { keep(piece); if (f && f[1][0] === fence[0] && f[1].length >= fence.length && !piece.slice(f[0].length).trim()) fence = null; continue; }
      if (f) { fence = f[1]; keep(piece); continue; }
      const lead = MARKER.exec(piece)[1], rest = piece.slice(lead.length), body = rest.trimEnd(), tail = rest.slice(body.length);
      keep(lead);
      if (/\p{L}/u.test(body)) for (const p of cut(body, max)) typeof p === "string" ? segs.push({ t: p, tr: true }) : keep(p.keep);
      else keep(body);
      keep(tail);
    }
    return segs;
  }

  const units = segs => segs.filter(s => s.tr).map(s => s.t);
  // translations: one string per unit, in order.
  function join(segs, translations) {
    let i = 0;
    return segs.map(s => s.tr ? String(translations[i++] ?? s.t) : s.t).join("");
  }

  // Sentences of ≤ max chars, for read-aloud (long utterances get cut off in Chrome).
  function sentences(text, max = 200) {
    const out = [];
    for (const para of String(text).split(/\n+/)) {
      if (!para.trim()) continue;
      let buf = "";
      for (const s of para.split(/(?<=[.!?。！？;:,])\s+/u)) {
        if (buf && (buf + " " + s).length > max) { out.push(buf); buf = ""; }
        buf = buf ? buf + " " + s : s;
        while (buf.length > max) { const at = buf.lastIndexOf(" ", max) > 0 ? buf.lastIndexOf(" ", max) : max; out.push(buf.slice(0, at)); buf = buf.slice(at).trim(); }
      }
      if (buf.trim()) out.push(buf);
    }
    return out;
  }

  return { plan, units, join, cut, sentences, bytes };
})();
