// File search + duplicate finder, pure: size / date criteria ("1.5 MB", "23/11/2026", today / 7 / 30 days), the size / date / kind test, size groups, a fast FNV-1a key and which copies to pick.
const FileFind = (() => {
  const UNIT = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  const DAY = 864e5;

  // "" → null; "500", "2 KB", "1,5mb" → bytes; anything else → NaN.
  function parseSize(s) {
    const t = String(s ?? "").trim().toLowerCase().replace(",", ".");
    if (!t) return null;
    const m = t.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
    return m ? Math.round(+m[1] * UNIT[m[2] || "b"]) : NaN;
  }

  // "dd/mm/yyyy" (also d-m-yyyy, yyyy-mm-dd) → local midnight ms; "" → null; bad → NaN.
  function parseDay(s) {
    const t = String(s ?? "").trim();
    if (!t) return null;
    let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/), y, mo, d;
    if (m) [d, mo, y] = [+m[1], +m[2], +m[3]];
    else if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [y, mo, d] = [+m[1], +m[2], +m[3]];
    else return NaN;
    const at = new Date(y, mo - 1, d);
    return at.getFullYear() === y && at.getMonth() === mo - 1 && at.getDate() === d ? at.getTime() : NaN;
  }

  // date: "" any · "today" · "7" · "30" · "range" (from / to as typed) → [min, max) in ms, null = open end.
  function dateRange(c, now = Date.now()) {
    if (c.date === "today") { const d = new Date(now); return [new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), null]; }
    if (c.date === "7" || c.date === "30") return [now - +c.date * DAY, null];
    if (c.date !== "range") return [null, null];
    const a = parseDay(c.from), b = parseDay(c.to);
    return [a, b == null || Number.isNaN(b) ? b : b + DAY];
  }

  // → error text keys of the criteria, [] when usable.
  function problems(c) {
    const out = [], [a, b] = [parseSize(c.min), parseSize(c.max)];
    if (Number.isNaN(a) || Number.isNaN(b)) out.push("size");
    else if (a != null && b != null && a > b) out.push("sizeOrder");
    if (c.date === "range") { const [x, y] = dateRange(c); if (Number.isNaN(x) || Number.isNaN(y)) out.push("date"); else if (x != null && y != null && x >= y) out.push("dateOrder"); }
    return out;
  }

  // Criteria → { stat: needs size / date, test({ dir, size, mod }) }. Folders have no size / date ⇒ they fail any size / date bound.
  function meta(c, now = Date.now()) {
    const min = parseSize(c.min), max = parseSize(c.max), [from, to] = dateRange(c, now);
    const stat = min != null || max != null || from != null || to != null;
    function test(e) {
      if ((c.kind === "file" && e.dir) || (c.kind === "dir" && !e.dir)) return false;
      if (!stat) return true;
      if (e.dir) return false;
      if ((min != null && !(e.size >= min)) || (max != null && !(e.size <= max))) return false;
      return !((from != null && !(e.mod >= from)) || (to != null && !(e.mod < to)));
    }
    return { stat, test };
  }

  // files [{ size }] → groups of ≥ 2 with the same size, biggest size first; empty files left out when skipEmpty.
  function sizeGroups(files, skipEmpty = true) {
    const by = new Map();
    for (const f of files) {
      if (f.size == null || (skipEmpty && f.size === 0)) continue;
      if (!by.has(f.size)) by.set(f.size, []);
      by.get(f.size).push(f);
    }
    return [...by.values()].filter(g => g.length > 1).sort((x, y) => y[0].size - x[0].size);
  }

  // 32-bit FNV-1a over bytes, chained through h.
  function fnv1a(bytes, h = 0x811c9dc5) {
    for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }

  // group [{ path, mod }] + rule newest | oldest | shortest → the copies to select (all but the one kept).
  function pick(group, rule) {
    const score = f => rule === "shortest" ? [f.path.length, f.path] : rule === "oldest" ? [f.mod ?? Infinity, f.path] : [-(f.mod ?? -Infinity), f.path];
    const cmp = (x, y) => { const [a, b] = [score(x), score(y)]; return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0); };
    const keep = [...group].sort(cmp)[0];
    return group.filter(f => f !== keep);
  }

  return { parseSize, parseDay, dateRange, problems, meta, sizeGroups, fnv1a, pick };
})();
