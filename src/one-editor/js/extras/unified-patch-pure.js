// Unified diff / git diff: parse (many files), apply hunks to a text with a ±fuzz line search (failed hunks reported, the rest applied), create a patch (Myers line diff, 3 context lines, a/ b/).
const UnifiedPatch = (() => {
  const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;
  const NO_EOL = "\\ No newline at end of file";
  const cr = s => s.endsWith("\r") ? s.slice(0, -1) : s;
  const path = n => { n = n.replace(/\t.*$/, "").trim().replace(/^"(.*)"$/, "$1"); return n === "/dev/null" ? "" : n; };
  const bare = n => n.replace(/^[ab]\//, "");
  const base = n => bare(n).split("/").pop();

  // → { files: [{ a, b, name, hunks: [{ oldStart, oldLines, newStart, newLines, head, line, lines: [{ t: " " | "-" | "+", s, noEol? }], short? }], add, del, binary?, meta? }] }
  function parse(text) {
    const L = text.split("\n").map(cr), files = [];
    let f = null, h = null, git = null, ro = 0, rn = 0;
    const close = () => { if (h && (ro > 0 || rn > 0)) h.short = true; h = null; };
    const gitOnly = () => { if (git) { files.push({ a: git[0], b: git[1], name: bare(git[1] || git[0]), hunks: [], add: 0, del: 0, meta: true, binary: git.binary }); git = null; } };
    for (let i = 0; i < L.length; i++) {
      const s = L[i];
      if (h && (ro > 0 || rn > 0)) {
        const c = s[0] ?? "";
        if ((c === " " || c === "") && ro > 0 && rn > 0 && (c === " " || i < L.length - 1)) { h.lines.push({ t: " ", s: s.slice(1) }); ro--; rn--; continue; }
        if (c === "-" && ro > 0) { h.lines.push({ t: "-", s: s.slice(1) }); ro--; f.del++; continue; }
        if (c === "+" && rn > 0) { h.lines.push({ t: "+", s: s.slice(1) }); rn--; f.add++; continue; }
      }
      if (s.startsWith("\\") && h?.lines.length) { h.lines[h.lines.length - 1].noEol = true; continue; }
      close();
      const m = HUNK.exec(s);
      if (m && f) {
        h = { oldStart: +m[1], oldLines: m[2] === undefined ? 1 : +m[2], newStart: +m[3], newLines: m[4] === undefined ? 1 : +m[4], head: m[5].trim(), line: i + 1, lines: [] };
        ro = h.oldLines; rn = h.newLines;
        f.hunks.push(h);
        continue;
      }
      if (s.startsWith("diff --git ")) { gitOnly(); const g = /^diff --git (?:"?a\/)?(.+?)"? (?:"?b\/)?(.+?)"?$/.exec(s); git = g ? [g[1], g[2]] : ["", ""]; f = null; continue; }
      if (git && /^Binary files /.test(s)) { git.binary = true; continue; }
      if (s.startsWith("--- ") && L[i + 1]?.startsWith("+++ ")) {
        if (git?.binary) gitOnly();
        const a = path(s.slice(4)), b = path(L[i + 1].slice(4));
        f = { a, b, name: bare(b || a), hunks: [], add: 0, del: 0 };
        files.push(f);
        git = null;
        i++;
      }
    }
    close();
    gitOnly();
    return { files };
  }

  // file.hunks applied to text → { text, ok, results: [{ i, ok, line, off }] }; lines keep their own \r, inserted lines follow the text's line ending.
  function apply(text, file, fuzz = 3) {
    const src = text.split("\n");
    let finalNl = true;
    if (src[src.length - 1] === "") src.pop(); else finalNl = false;
    const crlf = src.filter(s => s.endsWith("\r")).length * 2 > src.length;
    const out = [], results = [];
    let at = 0, delta = 0, ok = 0;
    file.hunks.forEach((h, i) => {
      const old = h.lines.filter(l => l.t !== "+"), neu = h.lines.filter(l => l.t !== "-");
      const want = (h.oldLines === 0 ? h.oldStart : h.oldStart - 1) + delta, fits = p => p >= at && p + old.length <= src.length && old.every((l, k) => cr(src[p + k]) === l.s);
      let pos = -1;
      for (let d = 0; d <= fuzz && pos < 0; d++) pos = [want - d, want + d].find(fits) ?? -1;
      if (h.short || pos < 0) { results.push({ i, ok: false, line: Math.max(want, 0) + 1 }); return; }
      out.push(...src.slice(at, pos), ...neu.map(l => crlf ? l.s + "\r" : l.s));
      at = pos + old.length;
      delta += pos - want;
      if (at === src.length && h.lines.length) {
        if (neu.length && neu[neu.length - 1].noEol) finalNl = false;
        else if (old.length && old[old.length - 1].noEol) finalNl = true;
      }
      results.push({ i, ok: true, line: pos + 1, off: pos - want });
      ok++;
    });
    out.push(...src.slice(at));
    if (!out.length) finalNl = false;
    return { text: out.join("\n") + (finalNl ? "\n" : ""), ok, results };
  }

  // The added lines of a new-file patch (a = /dev/null).
  const newText = file => { const h = file.hunks[0]; if (!h) return ""; const L = h.lines.filter(l => l.t === "+"); return L.map(l => l.s).join("\n") + (L.length && !L[L.length - 1].noEol ? "\n" : ""); };

  // Myers O(ND) line diff → changed blocks [a0, a1, b0, b1] (0-based, half-open); past `cap` edits the middle becomes one block.
  function blocks(A, B, cap = 2000) {
    let s = 0, ea = A.length, eb = B.length;
    while (s < ea && s < eb && A[s] === B[s]) s++;
    while (ea > s && eb > s && A[ea - 1] === B[eb - 1]) { ea--; eb--; }
    const a = A.slice(s, ea), b = B.slice(s, eb), n = a.length, m = b.length;
    if (!n || !m) return n || m ? [[s, ea, s, eb]] : [];
    const max = n + m, off = max + 1, v = new Int32Array(2 * max + 3), trace = [];
    let found = -1;
    for (let d = 0; d <= Math.min(max, cap) && found < 0; d++) {
      trace.push(v.slice(off - d - 1, off + d + 2));
      for (let k = -d; k <= d; k += 2) {
        let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1, y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        v[off + k] = x;
        if (x >= n && y >= m) { found = d; break; }
      }
    }
    if (found < 0) return [[s, ea, s, eb]];
    const same = [];
    let x = n, y = m;
    for (let d = found; d > 0; d--) {
      const V = trace[d], at = k => V[k + d + 1], k = x - y;
      const down = k === -d || (k !== d && at(k - 1) < at(k + 1)), pk = down ? k + 1 : k - 1, px = at(pk), py = px - pk, sx = down ? px : px + 1;
      for (; x > sx; x--, y--) same.push([x - 1, y - 1]);
      x = px; y = py;
    }
    for (; x > 0; x--, y--) same.push([x - 1, y - 1]);
    const out = [];
    let pa = 0, pb = 0;
    for (const [i, j] of same.reverse().concat([[n, m]])) {
      if (i > pa || j > pb) out.push([s + pa, s + i, s + pb, s + j]);
      pa = i + 1; pb = j + 1;
    }
    return out;
  }

  const split = t => { const L = t.split("\n"); const nl = L[L.length - 1] === ""; if (nl) L.pop(); return { L: L.map(cr), nl: nl || !t }; };

  // a → b as one file's unified diff ("" when equal); names without a/ b/.
  function create(aText, bText, aName, bName = aName, ctx = 3) {
    const A = split(aText), B = split(bText), la = A.L.length, lb = B.L.length;
    const bl = blocks(A.L, B.L);
    // Only the final line break differs: the last line is a change too.
    if (A.nl !== B.nl && la && lb && !bl.some(x => x[1] === la && x[3] === lb)) bl.push([la - 1, la, lb - 1, lb]);
    if (!bl.length) return "";
    const groups = [];
    for (const x of bl) { const g = groups[groups.length - 1]; if (g && x[0] - g[g.length - 1][1] <= 2 * ctx) g.push(x); else groups.push([x]); }
    const out = ["diff --git a/" + aName + " b/" + bName, "--- " + (aText || !bText ? "a/" + aName : "/dev/null"), "+++ " + (bText || !aText ? "b/" + bName : "/dev/null")];
    const line = (t, s, last) => { out.push(t + s); if (last) out.push(NO_EOL); };
    for (const g of groups) {
      const a0 = Math.max(0, g[0][0] - ctx), a1 = Math.min(la, g[g.length - 1][1] + ctx), b0 = g[0][2] - (g[0][0] - a0), b1 = g[g.length - 1][3] + (a1 - g[g.length - 1][1]);
      const na = a1 - a0, nb = b1 - b0;
      out.push("@@ -" + (na ? a0 + 1 : a0) + "," + na + " +" + (nb ? b0 + 1 : b0) + "," + nb + " @@");
      let i = a0;
      for (const [x0, x1, y0, y1] of g) {
        for (; i < x0; i++) line(" ", A.L[i], i === la - 1 && !A.nl);
        for (let k = x0; k < x1; k++) line("-", A.L[k], k === la - 1 && !A.nl);
        for (let k = y0; k < y1; k++) line("+", B.L[k], k === lb - 1 && !B.nl);
        i = x1;
      }
      for (; i < a1; i++) line(" ", A.L[i], i === la - 1 && !A.nl);
    }
    return out.join("\n") + "\n";
  }

  // One replacement covering only what differs (keeps the cursor / folds outside it).
  function change(a, b) {
    let s = 0, e = 0;
    const n = Math.min(a.length, b.length);
    while (s < n && a.charCodeAt(s) === b.charCodeAt(s)) s++;
    while (e < n - s && a.charCodeAt(a.length - 1 - e) === b.charCodeAt(b.length - 1 - e)) e++;
    return { from: s, to: a.length - e, insert: b.slice(s, b.length - e) };
  }

  return { parse, apply, newText, blocks, create, change, base };
})();
