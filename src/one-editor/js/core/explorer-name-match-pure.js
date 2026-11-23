// Folder tab name matching: accent / case folding, quick filter ("abc" = contains, "*.js;*.ts" = wildcards), Windows type-to-select and Shift+click ranges.
const NameMatch = (() => {
  const fold = s => String(s).normalize("NFD").replace(/\p{M}+/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  const globRe = p => new RegExp("^" + [...p].map(c => c === "*" ? ".*" : c === "?" ? "." : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("") + "$");

  // query → predicate on a name, or null when the query is empty.
  function filter(query) {
    const tests = String(query).split(";").map(s => fold(s.trim())).filter(Boolean)
      .map(p => /[*?]/.test(p) ? (re => n => re.test(n))(globRe(p)) : n => n.includes(p));
    if (!tests.length) return null;
    return name => { const n = fold(name); return tests.some(t => t(n)); };
  }

  // Type-to-select: names in view order, buf typed so far, from = focused index (-1 none) → index to focus or -1. One repeated letter cycles through names starting with it.
  function seek(names, buf, from) {
    const b = fold(buf), n = names.length;
    if (!b || !n) return -1;
    const hit = (key, start) => {
      for (let k = 0; k < n; k++) { const i = (start + k) % n; if (fold(names[i]).startsWith(key)) return i; }
      return -1;
    };
    if (b.length === 1) return hit(b, from + 1);
    const i = hit(b, Math.max(from, 0));
    return i >= 0 || ![...b].every(c => c === b[0]) ? i : hit(b[0], from + 1);
  }

  // Shift+click: keys from the anchor to the target (inclusive) in view order; no anchor ⇒ the target alone.
  function range(keys, anchor, target) {
    const j = keys.indexOf(target);
    if (j < 0) return [];
    const i = keys.indexOf(anchor) < 0 ? j : keys.indexOf(anchor);
    return keys.slice(Math.min(i, j), Math.max(i, j) + 1);
  }

  return { fold, filter, seek, range };
})();
