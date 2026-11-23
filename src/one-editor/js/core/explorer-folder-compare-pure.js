// Folder compare, pure: pair two folders' children by name (any case), status by size then bytes (4 MB blocks), the one-way sync plan.
const DirDiff = (() => {
  const CHUNK = 4 * 1024 * 1024;
  const SYM = { left: "⬅", right: "➡", diff: "≠", same: "=" };
  const low = s => s.toLowerCase();

  // Children of one folder on each side → { rows: [{ name, a, b, st: left | right | diff (file vs folder) | check (two files) }], both: folder pairs to walk }.
  function match(a = [], b = []) {
    const byName = new Map(b.map(y => [low(y.name), y])), seen = new Set(), rows = [], both = [];
    for (const x of a) {
      const k = low(x.name), y = byName.get(k);
      seen.add(k);
      if (!y) rows.push({ name: x.name, a: x, b: null, st: "left" });
      else if (x.dir && y.dir) both.push([x, y]);
      else rows.push({ name: x.name, a: x, b: y, st: x.dir !== y.dir ? "diff" : "check" });
    }
    for (const y of b) if (!seen.has(low(y.name))) rows.push({ name: y.name, a: null, b: y, st: "right" });
    return { rows, both };
  }

  // Sizes known and different ⇒ diff without reading; otherwise the bytes decide.
  const bySize = (sa, sb) => (sa != null && sb != null && sa !== sb ? "diff" : "check");

  function sameBytes(x, y) {
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  }
  // Two Blobs, block by block, stopping at the first block that differs; stop() → true gives up (null).
  async function equalBlobs(fa, fb, stop = () => false, chunk = CHUNK) {
    if (fa.size !== fb.size) return false;
    for (let o = 0; o < fa.size; o += chunk) {
      if (stop()) return null;
      const [x, y] = await Promise.all([fa.slice(o, o + chunk).arrayBuffer(), fb.slice(o, o + chunk).arrayBuffer()]);
      if (!sameBytes(new Uint8Array(x), new Uint8Array(y))) return false;
    }
    return true;
  }

  // dir "ab" (left → right) or "ba"; rows [{ st, a, b }] → { copy, over, del } of { row, src, dst } (dst null for a copy); "same" rows stay.
  function plan(rows, dir, removeExtra = false) {
    const ab = dir === "ab", out = { copy: [], over: [], del: [] };
    for (const row of rows) {
      const src = ab ? row.a : row.b, dst = ab ? row.b : row.a;
      if (row.st === "diff" && src && dst) out.over.push({ row, src, dst });
      else if (src && !dst && row.st === (ab ? "left" : "right")) out.copy.push({ row, src, dst: null });
      else if (!src && dst && removeExtra && row.st === (ab ? "right" : "left")) out.del.push({ row, src: null, dst });
    }
    return out;
  }

  return { SYM, match, bySize, sameBytes, equalBlobs, plan };
})();
