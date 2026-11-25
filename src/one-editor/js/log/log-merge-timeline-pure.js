// Log merge, pure (node test; also runs inside the merge worker as "(" + logMergePureFactory + ")()"): timestamps per line, untimed lines glued to the line before, k sources sorted by time, id / regex filter with linked ids, histogram.
function logMergePureFactory() {
  // Auto formats, tried on a sample: the first with the most hits wins (a log prefix beats the FIX 52= inside the same line).
  const AUTO = [
    { id: "iso", re: /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:[.,](\d{1,9}))?(Z|[+-]\d{2}:?\d{2})?/, head: 120, map: [1, 2, 3, 4, 5, 6, 7, 8] },
    { id: "dmy", re: /\b(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})(?:[.,](\d{1,9}))?/, head: 120, map: [3, 2, 1, 4, 5, 6, 7, 0] },
    { id: "epoch", re: /^\[?(\d{13})(?!\d)/, head: 20, epoch: true },
    { id: "fix", re: /(?:^|[\x01|^\s])52=(\d{4})(\d{2})(\d{2})-(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?/, head: 0, map: [1, 2, 3, 4, 5, 6, 7, 0] },
    { id: "time", re: /(?:^|[\s[])(\d{2}):(\d{2}):(\d{2})(?:[.,](\d{1,9}))?(?!\d)/, head: 80, map: [0, 0, 0, 1, 2, 3, 4, 0] },
  ];
  const ERR = /\b(?:FATAL|CRITICAL|SEVERE|ERROR|ERR)\b/, WARN = /\b(?:WARN|WARNING)\b/;
  const ID_HEAD = String.raw`(?:^|[\x01|^\s{,;("'])(?:11|41|37|[Cc]lOrdI[Dd]|OrigClOrdI[Dd]|[Oo]rder_?[Ii][Dd]|[Rr]equest_?[Ii][Dd])["']?\s*[=:]\s*["']?`;
  const ID_RE = new RegExp(ID_HEAD + "([\\w.:-]{3,64})", "g");
  const SIZES = [1000, 5000, 10000, 30000, 60000, 300000, 900000, 3600000, 21600000, 86400000];
  const MAX_BUCKETS = 600, MAX_BUCKETS_S = 3600, DAY = 86400000;

  // "yyyy-MM-dd HH:mm:ss.SSS" style → { re, map }; "epoch" / "epoch-s" → epoch ms / s anywhere at the line start. Throws on a format without a time.
  function compile(fmt) {
    if (fmt === "epoch" || fmt === "epoch-s") return { id: fmt, re: fmt === "epoch" ? /^\[?(\d{13})(?!\d)/ : /^\[?(\d{10})(?![\d])/, head: 20, epoch: true, sec: fmt === "epoch-s" };
    const map = [0, 0, 0, 0, 0, 0, 0, 0], KEY = { yyyy: 0, MM: 1, dd: 2, HH: 3, mm: 4, ss: 5 };
    let src = "", g = 0;
    for (const t of fmt.match(/yyyy|MM|dd|HH|mm|ss|S+|[\s\S]/g) || []) {
      if (t in KEY) { map[KEY[t]] = ++g; src += t === "yyyy" ? "(\\d{4})" : "(\\d{2})"; }
      else if (t[0] === "S" && t.length > 0 && /^S+$/.test(t)) { map[6] = ++g; src += "(\\d{1," + Math.max(t.length, 9) + "})"; }
      else src += t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    if (!map[3] || !map[4]) throw new Error("format needs HH and mm");
    return { id: "custom", re: new RegExp(src), head: 0, map };
  }

  // One pattern + line → epoch ms (UTC-naive unless the stamp has a zone) or NaN; day0: date for time-only stamps.
  function stamp(p, line, day0) {
    const m = p.re.exec(p.head ? line.slice(0, p.head) : line);
    if (!m) return NaN;
    if (p.epoch) return +m[1] * (p.sec ? 1000 : 1);
    const v = k => p.map[k] ? m[p.map[k]] : undefined, frac = v(6) ? +("0." + v(6)) * 1000 : 0;
    // An impossible stamp (US mm/dd read as dd/mm, 25:00) is no stamp: Date.UTC would roll it into another month.
    if (v(0) && (+v(1) < 1 || +v(1) > 12 || +v(2) < 1 || +v(2) > 31) || +v(3) > 23 || +v(4) > 59 || +(v(5) || 0) > 59) return NaN;
    const base = v(0) ? Date.UTC(+v(0), +v(1) - 1, +v(2)) : day0;
    let ms = base + ((+v(3) * 60 + +v(4)) * 60 + +(v(5) || 0)) * 1000 + frac;
    const z = v(7);
    if (z && z !== "Z") { const s = z[0] === "-" ? -1 : 1, d = z.slice(1).replace(":", ""); ms -= s * (+d.slice(0, 2) * 60 + +d.slice(2, 4)) * 60000; }
    return ms;
  }

  function detect(lines) {
    const sample = [];
    for (let i = 0; i < lines.length && sample.length < 400; i++) if (lines[i].trim()) sample.push(lines[i]);
    let best = null, top = 0;
    for (const p of AUTO) { let n = 0; for (const l of sample) if (!isNaN(stamp(p, l, 0))) n++; if (n > top) { best = p; top = n; } }
    return best;
  }

  // "+7h" / "-150ms" / "2s" / "-90" (seconds) → ms; NaN when unreadable.
  function offset(s) {
    const m = /^\s*([+-]?\d+(?:\.\d+)?)\s*(ms|s|m|min|h)?\s*$/.exec(String(s || "0"));
    return m ? +m[1] * ({ ms: 1, s: 1000, m: 60000, min: 60000, h: 3600000 }[m[2] || "s"]) : NaN;
  }

  const level = l => { const h = l.length > 300 ? l.slice(0, 300) : l; return ERR.test(h) ? 2 : WARN.test(h) ? 1 : 0; };

  // text + { fmt: "" (auto) | "@iso" … (one AUTO format) | custom, off ms, day0 } → { lines, ts (group stamp per line), head (1 = group start), lvl, fmt, hits }.
  function parseSource(text, o = {}) {
    const lines = text.split(/\r?\n/);
    if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
    const p = !o.fmt ? detect(lines) : o.fmt[0] === "@" ? AUTO.find(x => "@" + x.id === o.fmt) || detect(lines) : compile(o.fmt), n = lines.length, ts = new Float64Array(n), head = new Uint8Array(n), lvl = new Uint8Array(n), off = o.off || 0;
    const dateless = !!p && !p.epoch && !p.map[0];
    let cur = NaN, curLvl = 0, hits = 0, firstAt = -1, prev = NaN, days = 0, rolls = 0;
    for (let i = 0; i < n; i++) {
      let t = p ? stamp(p, lines[i], o.day0 || 0) : NaN;
      // Time-only logs: a jump back of more than 12 h is the next day.
      if (dateless && !isNaN(t)) { if (t + days < prev - DAY / 2) { days += DAY; rolls++; } t += days; prev = t; }
      if (!isNaN(t)) { cur = t + off; curLvl = level(lines[i]); head[i] = 1; hits++; if (firstAt < 0) firstAt = i; }
      ts[i] = cur; lvl[i] = curLvl;
    }
    // Lines before the first stamp ride with it.
    if (firstAt > 0) { head[0] = 1; head[firstAt] = 0; for (let i = 0; i < firstAt; i++) { ts[i] = ts[firstAt]; lvl[i] = lvl[firstAt]; } }
    if (firstAt < 0 && n) head[0] = 1;
    return { lines, ts, head, lvl, fmt: p ? p.id : "", hits, dateless, rolls };
  }

  // Sources → merged order of groups (stable: time, then source, then line). → { gSrc, gStart, gEnd, gTs, gLvl } in time order.
  function merge(srcs) {
    let count = 0;
    for (const s of srcs) for (let i = 0; i < s.lines.length; i++) count += s.head[i];
    const gSrc = new Uint8Array(count), gStart = new Uint32Array(count), gEnd = new Uint32Array(count), gTs = new Float64Array(count), gLvl = new Uint8Array(count);
    let g = 0;
    srcs.forEach((s, k) => {
      for (let i = 0; i < s.lines.length; i++) {
        if (!s.head[i]) continue;
        if (g) gEnd[g - 1] = gSrc[g - 1] === k ? i : gEnd[g - 1];
        gSrc[g] = k; gStart[g] = i; gEnd[g] = s.lines.length; gTs[g] = isNaN(s.ts[i]) ? -Infinity : s.ts[i]; gLvl[g] = s.lvl[i]; g++;
      }
    });
    const order = new Uint32Array(count).map((_, i) => i);
    order.sort((a, b) => gTs[a] - gTs[b] || gSrc[a] - gSrc[b] || gStart[a] - gStart[b]);
    const pick = arr => { const out = new arr.constructor(count); for (let i = 0; i < count; i++) out[i] = arr[order[i]]; return out; };
    return { gSrc: pick(gSrc), gStart: pick(gStart), gEnd: pick(gEnd), gTs: pick(gTs), gLvl: pick(gLvl) };
  }

  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Groups whose lines match q (text / regex, case); link: ids found in those lines (ClOrdID 11 / 41, orderId, requestId…) pull in their other lines, 2 rounds. → Uint8Array keep per group.
  function filter(srcs, m, f) {
    const n = m.gSrc.length, keep = new Uint8Array(n);
    if (!f || !f.q) return keep.fill(1);
    const re = f.regex ? new RegExp(f.q, f.cs ? "" : "i") : new RegExp(escape(f.q), f.cs ? "" : "i");
    const groupText = g => srcs[m.gSrc[g]].lines.slice(m.gStart[g], m.gEnd[g]).join("\n");
    const test = r => { let hit = 0; for (let g = 0; g < n; g++) if (!keep[g] && r.test(groupText(g))) { keep[g] = 1; hit++; } return hit; };
    test(re);
    for (let round = 0; f.link && round < 2; round++) {
      const ids = new Set();
      for (let g = 0; g < n && ids.size < 200; g++) if (keep[g]) for (const x of groupText(g).matchAll(ID_RE)) if (x[1].toUpperCase() !== "NONE") ids.add(x[1]);
      if (!ids.size || !test(new RegExp(ID_HEAD + "(?:" + [...ids].map(escape).join("|") + ")(?![\\w.:-])"))) break;
    }
    return keep;
  }

  // Kept groups → histogram: bucket size from the unit ("s" / "m" / auto) so ≤ 600 buckets; each bucket: count, errors, warnings, first group index.
  function histogram(m, keep, unit) {
    let lo = Infinity, hi = -Infinity;
    for (let g = 0; g < m.gTs.length; g++) if (keep[g] && isFinite(m.gTs[g])) { lo = Math.min(lo, m.gTs[g]); hi = Math.max(hi, m.gTs[g]); }
    if (!isFinite(lo)) return { size: 0, t0: 0, n: new Uint32Array(0), err: new Uint32Array(0), warn: new Uint32Array(0), first: new Int32Array(0) };
    // "s" allows finer, more buckets; any range (a stray 9999-12-31 stamp) is capped by a wider bucket.
    const max = unit === "s" ? MAX_BUCKETS_S : MAX_BUCKETS, sizes = SIZES.filter(s => unit === "m" ? s >= 60000 : true);
    const size = Math.max(sizes.find(s => (hi - lo) / s < max) || SIZES[SIZES.length - 1], Math.ceil((hi - lo + 1) / (max - 1)));
    const t0 = Math.floor(lo / size) * size, len = Math.floor((hi - t0) / size) + 1;
    const n = new Uint32Array(len), err = new Uint32Array(len), warn = new Uint32Array(len), first = new Int32Array(len).fill(-1);
    for (let g = 0; g < m.gTs.length; g++) {
      if (!keep[g] || !isFinite(m.gTs[g])) continue;
      const b = Math.floor((m.gTs[g] - t0) / size);
      n[b]++; if (m.gLvl[g] === 2) err[b]++; else if (m.gLvl[g] === 1) warn[b]++;
      if (first[b] < 0) first[b] = g;
    }
    return { size, t0, n, err, warn, first };
  }

  return { compile, stamp, detect, offset, level, parseSource, merge, filter, histogram, AUTO, SIZES, MAX_BUCKETS, MAX_BUCKETS_S };
}
const LogMerge = logMergePureFactory();
