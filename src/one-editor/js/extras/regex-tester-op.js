// "regex" op: the source tab is the test string; matches are highlighted in the source editor too (RegexMarks), the result tab text is JSON (pattern, matches, groups).
const RegexMarks = (() => {
  let field = null, setFx = null, marks = null;
  const outs = new Map();
  function init() {
    const { StateField, StateEffect } = CM.state, { Decoration, EditorView } = CM.view;
    setFx = StateEffect.define();
    field = StateField.define({ create: () => Decoration.none, update(d, tr) { for (const e of tr.effects) if (e.is(setFx)) return e.value; return d.map(tr.changes); }, provide: f => EditorView.decorations.from(f) });
    marks = [Decoration.mark({ class: "cm-rx-a" }), Decoration.mark({ class: "cm-rx-b" })];
    // Closing (or keeping as a note) the regex tab clears the marks of its source.
    Docs.on((type, doc) => { const src = doc.link?.op === "regex" ? doc.link.src : outs.get(doc.id); if ((type === "remove" || type === "kept") && src) { set(src, []); outs.delete(doc.id); } });
  }
  function set(srcId, list) {
    const src = Docs.get(srcId);
    if (!field || !src || !src.state || src.hex || src.big) return;
    const max = src.state.doc.length, ranges = list.slice(0, RegexCore.MAX).filter(m => m.end > m.at && m.end <= max).map((m, i) => marks[i % 2].range(m.at, m.end));
    const fx = [setFx.of(CM.view.Decoration.set(ranges))];
    if (!src.state.field(field, false)) fx.unshift(CM.state.StateEffect.appendConfig.of(field));
    Views.applyEffect(src, fx);
  }
  const track = (outId, srcId) => outs.set(outId, srcId);
  return { init, set, track };
})();

const RegexOp = (() => {
  const MAX_IN = 1024 * 1024;
  const DEF = () => ({ pattern: "(?<symbol>[A-Z]{2,10})=(?<qty>\\d+)", flags: "g", replace: "$<symbol>: $<qty>" });
  const str = (v, n, d) => typeof v === "string" ? v.slice(0, n) : d;
  const clean = o => ({ pattern: str(o?.pattern, 2000, ""), flags: str(o?.flags, 8, "g"), replace: str(o?.replace, 2000, "") });
  const opts = srcId => PowerUi.opts(srcId, "regex", clean, DEF);

  // A bad pattern still returns a view (the pane keeps its inputs to fix it) plus a warning.
  function run(t, c) {
    const o = opts(c.id);
    if (t.length > MAX_IN) throw new Error(T("Chuỗi thử quá lớn ({mb} MB) — regex tester nhận tối đa 1 MB.", { mb: (t.length / 1048576).toFixed(1) }));
    let re;
    try { re = o.pattern ? RegexCore.compile(o.pattern, o.flags) : null; } catch (e) {
      RegexMarks.set(c.id, []);
      return { text: JSON.stringify({ ...o, error: e.message }, null, 2) + "\n", view: { kind: "regex", srcId: c.id, o, bad: e.message, list: [], source: t }, error: Object.assign(new Error(e.message), { warn: true }) };
    }
    const r = re ? RegexCore.matches(t, re) : { list: [], more: false }, starts = FindCore.lineStarts(t);
    const pos = at => { const l = FindCore.lineIndex(starts, at); return { line: l + 1, col: at - starts[l] + 1 }; };
    RegexMarks.set(c.id, r.list);
    const json = { ...o, count: r.list.length, more: r.more, matches: r.list.slice(0, 1000).map(m => ({ ...pos(m.at), text: m.text, groups: Object.fromEntries(m.groups.map(g => [g.name || String(g.n), g.text])) })) };
    const replaced = re && o.replace ? RegexCore.replace(t, re, o.replace) : null;
    return { text: JSON.stringify(json, null, 2) + "\n", view: { kind: "regex", srcId: c.id, o, list: r.list, more: r.more, source: t, replaced, pos },
      notes: [T("{n} khớp — cú pháp regex JavaScript.", { n: I18n.num(r.list.length) + (r.more ? "+" : "") })] };
  }

  function set(srcId, o) {
    PowerUi.saveOpts(srcId, "regex", clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, "regex", true);
  }

  return { run, set, opts };
})();
