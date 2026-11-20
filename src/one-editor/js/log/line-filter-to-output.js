// "filter" op: keep (or drop) the lines matching a text / regex, with N lines of context like grep -C; result text in the other view, its pane lists the lines and jumps to the source.
const LineFilter = (() => {
  const DEF = { q: "ERROR|WARN", regex: true, cs: false, invert: false, ctx: 0 };
  // Settings per source tab; a new tab starts from the last ones used (remembered in this browser).
  const states = new Map();
  const state = srcId => { if (!states.has(srcId)) states.set(srcId, { ...DEF, ...Prefs.get("logfilter", {}) }); return states.get(srcId); };
  const save = s => Prefs.set("logfilter", { q: s.q, regex: s.regex, cs: s.cs, invert: s.invert, ctx: s.ctx });

  function matcher(s) {
    if (!s.q) return () => true;
    if (s.regex) {
      let re;
      try { re = new RegExp(s.q, s.cs ? "" : "i"); } catch (e) { throw new Error(T("Regex lỗi: {msg}", { msg: e.message })); }
      return l => re.test(l);
    }
    const q = s.cs ? s.q : s.q.toLowerCase();
    return l => (s.cs ? l : l.toLowerCase()).includes(q);
  }

  // Excluding ignores context (context would bring the dropped lines back). text + settings → { rows: [{ n, t, hit } | { gap: true }], hits, total } (pure).
  function filter(text, s) {
    const lines = text.split(/\r?\n/), test = matcher(s), ctx = s.invert ? 0 : Math.max(0, Math.min(s.ctx | 0, 50)), keep = new Uint8Array(lines.length);
    if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
    let hits = 0;
    lines.forEach((l, i) => { if (test(l) !== !!s.invert) { hits++; keep[i] = 2; for (let k = Math.max(0, i - ctx); k <= Math.min(lines.length - 1, i + ctx); k++) keep[k] ||= 1; } });
    const rows = [];
    let last = -1;
    lines.forEach((l, i) => {
      if (!keep[i]) return;
      if (ctx && last >= 0 && i > last + 1) rows.push({ gap: true });
      rows.push({ n: i + 1, t: l, hit: keep[i] === 2 });
      last = i;
    });
    return { rows, hits, total: lines.length };
  }

  function run(text, c) {
    const s = state(c.id), r = filter(text, s);
    const out = r.rows.map(x => x.gap ? "--" : x.t).join("\n") + (r.rows.length ? "\n" : "");
    return { text: out, notes: [T("{hits} / {total} dòng khớp.", { hits: I18n.num(r.hits), total: I18n.num(r.total) })], view: { kind: "filter", ...r, srcId: c.id, s: { ...s } } };
  }

  return { filter, run, state, save };
})();
