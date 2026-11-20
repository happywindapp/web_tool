// Compare ignoring whitespace and/or case: a line diff (Myers) on normalised lines, so only lines that still differ are changes → character ranges for @codemirror/merge.
const CompareIgnore = (() => {
  const norm = (s, o) => { if (o.ws) s = s.replace(/\s+/g, ""); return o.case ? s.toLowerCase() : s; };
  function linesOf(t) {
    const out = [];
    let p = 0;
    for (const l of t.split("\n")) { out.push(p); p += l.length + 1; }
    return out;
  }

  // a, b: texts; o: { ws, case } → [{ fromA, toA, fromB, toB }] covering whole differing line runs.
  function changes(a, b, o) {
    const sa = linesOf(a), sb = linesOf(b), split = (t, starts) => starts.map((s, i) => norm(t.slice(s, i + 1 < starts.length ? starts[i + 1] - 1 : t.length), o));
    const ops = SeqDiff.diff(split(a, sa), split(b, sb), 20000);
    if (!ops) return [{ fromA: 0, toA: a.length, fromB: 0, toB: b.length }];
    const pos = (starts, t, i) => i < starts.length ? starts[i] : t.length, out = [];
    let run = null, ia = 0, ib = 0;
    const flush = () => {
      if (run) out.push({ fromA: pos(sa, a, run.a), toA: pos(sa, a, ia), fromB: pos(sb, b, run.b), toB: pos(sb, b, ib) });
      run = null;
    };
    for (const op of ops) {
      if (op.op === "eq") { flush(); ia++; ib++; continue; }
      run ??= { a: ia, b: ib };
      if (op.op === "del") ia++; else ib++;
    }
    flush();
    return out;
  }

  return { changes };
})();
