// Myers O(ND) diff over two arrays (=== compare) → ops [{op:"eq"|"del"|"ins", a?, b?}]; null when edit distance > limit.
const SeqDiff = (() => {
  function myers(a, b, limit) {
    const n = a.length, m = b.length, max = n + m;
    if (!n) return b.map((_, j) => ({ op: "ins", b: j }));
    if (!m) return a.map((_, i) => ({ op: "del", a: i }));
    const off = max + 1, v = new Int32Array(2 * max + 3), trace = [];
    let done = false;
    for (let d = 0; d <= max && !done; d++) {
      if (d > limit) return null;
      // Snapshot only the k range backtracking needs ([-d-1, d+1]) → memory O(D²) instead of O(D·N).
      trace.push(v.slice(off - d - 1, off + d + 2));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) { done = true; break; }
      }
    }
    const ops = [];
    let x = n, y = m;
    for (let d = trace.length - 1; d >= 0; d--) {
      const snap = trace[d], at = k => snap[k + d + 1], k = x - y;
      const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
      const prevX = at(prevK), prevY = prevX - prevK;
      while (x > prevX && y > prevY) { x--; y--; ops.push({ op: "eq", a: x, b: y }); }
      if (d > 0) ops.push(x === prevX ? { op: "ins", b: prevY } : { op: "del", a: prevX });
      x = prevX; y = prevY;
    }
    return ops.reverse();
  }

  function diff(a, b, limit = 3000) {
    let s = 0, ea = a.length, eb = b.length;
    while (s < ea && s < eb && a[s] === b[s]) s++;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const core = myers(a.slice(s, ea), b.slice(s, eb), limit);
    if (!core) return null;
    const ops = [];
    for (let i = 0; i < s; i++) ops.push({ op: "eq", a: i, b: i });
    for (const o of core) ops.push({ op: o.op, a: o.a === undefined ? undefined : o.a + s, b: o.b === undefined ? undefined : o.b + s });
    for (let i = 0; i < a.length - ea; i++) ops.push({ op: "eq", a: ea + i, b: eb + i });
    return ops;
  }

  return { diff };
})();
