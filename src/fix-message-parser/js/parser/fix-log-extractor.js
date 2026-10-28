// Finds FIX messages in pasted text / log files: any delimiter (SOH, |, ^A, <SOH>…), log prefix kept, several messages per line, other lines skipped.
const FixLog = (() => {
  const BEGIN = /8=FIXT?\.\d\.\d(?:SP\d)?/g;
  const CANDIDATES = ["\x01", "^A", "<SOH>", "[SOH]", "\\x01", "\\u0001", "\\001", "|", ";", "\t", ",", " "];
  const LABELS = { "\x01": "SOH", "\t": "Tab", " ": "space" };
  const label = d => LABELS[d] || d;
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // The delimiter is whatever sits between BeginString and "9="; fragments without a header pick the most frequent candidate.
  function delimOf(seg) {
    const m = /^8=FIXT?\.\d\.\d(?:SP\d)?([^=]+?)9=\d/.exec(seg);
    if (m) return m[1];
    let best = "", hits = 0;
    for (const d of CANDIDATES) {
      const n = (seg.match(new RegExp(escRe(d) + "\\d+=", "g")) || []).length;
      if (n > hits) { best = d; hits = n; }
    }
    return best;
  }

  // Ends at the CheckSum field (drops log trailers); a message without 10= ends where the next one starts right after a delimiter,
  // otherwise that "8=FIX" sits inside a value (e.g. 58=…:8=FIX.4.4) and the message runs on to its own 10=.
  function cut(seg, delim, next) {
    const m = delim ? new RegExp(escRe(delim) + "10=\\d{0,3}").exec(seg) : null;
    const before = seg.slice(0, next);
    if (m && (m.index < next || !before.endsWith(delim))) {
      const end = m.index + m[0].length;
      return seg.slice(0, seg.startsWith(delim, end) ? end + delim.length : end);
    }
    return before.replace(/\s+$/, "");
  }

  function extract(text) {
    const items = [];
    let skipped = 0;
    text.split("\n").forEach((rawLine, i) => {
      const line = rawLine.replace(/\r$/, "");
      const starts = [...line.matchAll(BEGIN)].map(m => m.index).filter(at => at === 0 || !/\d/.test(line[at - 1]));
      if (!starts.length) {
        const frag = /(^|[^\d])35=/.test(line) && /\d+=[^=]+\d+=/.test(line) ? /\d+=/.exec(line) : null;
        if (frag) items.push({ line: i + 1, prefix: line.slice(0, frag.index).trim(), raw: line.slice(frag.index).replace(/\s+$/, ""), delim: delimOf(line.slice(frag.index)) });
        else if (line.trim()) skipped++;
        return;
      }
      let from = 0;
      for (const at of starts) {
        if (at < from) continue;
        const seg = line.slice(at), delim = delimOf(seg), next = starts.find(s => s > at);
        const raw = cut(seg, delim, next === undefined ? seg.length : next - at);
        items.push({ line: i + 1, prefix: from === 0 ? line.slice(0, at).trim() : "", raw, delim });
        from = at + Math.max(raw.length, 1);
      }
    });
    return { items, skipped };
  }

  return { extract, delimOf, label };
})();
