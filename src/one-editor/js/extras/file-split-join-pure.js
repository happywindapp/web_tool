// Split / join files, pure (node test): part names name.ext.001…, byte plan, line cuts fed chunk by chunk (never inside a line), natural order, the parts of a ".001" set like Total Commander.
const FileSplit = (() => {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const natural = names => [...names].sort((a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0));
  const digits = total => Math.max(3, String(total).length);
  const partName = (name, i, total) => name + "." + String(i + 1).padStart(digits(total), "0");
  const MAX_PARTS = 9999;

  // [{ start, end }] of at most `bytes` each; an empty file is one empty part.
  function bySize(size, bytes) {
    const n = Math.max(1, Math.floor(bytes)), out = [];
    for (let s = 0; s < size; s += n) out.push({ start: s, end: Math.min(size, s + n) });
    return out.length ? out : [{ start: 0, end: 0 }];
  }
  const count = (size, bytes) => Math.max(1, Math.ceil(size / Math.max(1, Math.floor(bytes))));

  // Lines per part: feed(chunk) → absolute offsets where a new part starts (right after the LF ending the n-th line); CR LF stays whole.
  function lineCutter(lines) {
    const n = Math.max(1, Math.floor(lines));
    let pos = 0, seen = 0;
    return {
      feed(u8) {
        const cuts = [];
        for (let i = u8.indexOf(10); i >= 0; i = u8.indexOf(10, i + 1)) if (++seen === n) { seen = 0; cuts.push(pos + i + 1); }
        pos += u8.length;
        return cuts;
      },
    };
  }
  // Cuts (from lineCutter) + size → parts; a cut at the very end leaves no empty last part.
  function partsFromCuts(cuts, size) {
    const edges = [0, ...cuts.filter(c => c > 0 && c < size), size], out = [];
    for (let i = 0; i + 1 < edges.length; i++) out.push({ start: edges[i], end: edges[i + 1] });
    return out;
  }

  const PART = /^(.+)\.(\d{3,})$/;
  const isFirstPart = name => { const m = PART.exec(name); return !!m && /^0*1$/.test(m[2]); };
  // ".001" picked ⇒ its siblings .002, .003… in a row (same width) from the folder's names; → { target, parts } or null.
  function partSet(first, names) {
    const m = PART.exec(first);
    if (!m || !isFirstPart(first)) return null;
    const have = new Set(names), w = m[2].length, parts = [first];
    for (let i = 2; ; i++) { const p = m[1] + "." + String(i).padStart(w, "0"); if (!have.has(p)) break; parts.push(p); }
    return { target: m[1], parts };
  }
  // Name of a joined file: the parts' base, else "first-joined.ext".
  function joinName(names) {
    const m = PART.exec(names[0] || "");
    if (m && names.every(n => PART.exec(n)?.[1] === m[1])) return m[1];
    const f = names[0] || "joined", k = f.lastIndexOf(".");
    return k > 0 ? f.slice(0, k) + "-joined" + f.slice(k) : f + "-joined";
  }

  // "1.5 MB" style input → bytes (KB = 1024); NaN when not a positive number.
  function bytesOf(value, unit) {
    const v = Number(String(value).replace(",", "."));
    return v > 0 && isFinite(v) ? Math.max(1, Math.floor(v * (unit === "MB" ? 1048576 : unit === "KB" ? 1024 : 1))) : NaN;
  }

  return { natural, partName, bySize, count, lineCutter, partsFromCuts, partSet, isFirstPart, joinName, bytesOf, MAX_PARTS };
})();
