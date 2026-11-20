// Mixed line endings kept line by line: each original line break carries its CRLF / LF / CR as a point that follows edits; breaks typed later get the tab's main EOL on save.
const MixedEol = (() => {
  const CODE = { "\r\n": "w", "\n": "n", "\r": "r" }, EOL = { w: "\r\n", n: "\n", r: "\r" };
  let field = null, setEffect = null, marks = null;

  function init() {
    const S = CM.state;
    class Mark extends S.RangeValue {
      constructor(eol) { super(); this.eol = eol; }
      eq(o) { return o.eol === this.eol; }
    }
    Object.assign(Mark.prototype, { point: true, startSide: 1, endSide: 1 });
    marks = { w: new Mark("w"), n: new Mark("n"), r: new Mark("r") };
    setEffect = S.StateEffect.define();
    field = S.StateField.define({
      create: () => S.RangeSet.empty,
      update(set, tr) { set = set.map(tr.changes); for (const e of tr.effects) if (e.is(setEffect)) set = e.value; return set; },
    });
  }

  // Codes → effect placing a mark at the end of each line that had a break.
  function effect(doc, codes) {
    const b = new CM.state.RangeSetBuilder();
    for (let i = 0; i < codes.length && i + 1 < doc.lines; i++) { const to = doc.line(i + 1).to; if (marks[codes[i]]) b.add(to, to, marks[codes[i]]); }
    return setEffect.of(b.finish());
  }

  // Current code per line break ("." = a break added later → main EOL).
  function codesOf(state) {
    const set = state.field(field, false), doc = state.doc, out = [];
    if (!set) return "";
    const it = set.iter();
    for (let i = 1; i < doc.lines; i++) {
      const to = doc.line(i).to;
      while (it.value && it.from < to) it.next();
      out.push(it.value && it.from === to ? it.value.eol : ".");
    }
    return out.join("");
  }

  // Text to save: mixed tabs rebuilt with their own breaks (already final), others as usual.
  function textOf(doc) {
    if (!doc.eolMixed) return Docs.text(doc);
    const st = Docs.ensureState(doc), codes = codesOf(st), parts = [];
    for (let i = 1; i <= st.doc.lines; i++) { parts.push(st.doc.line(i).text); if (i < st.doc.lines) parts.push(EOL[codes[i - 1]] || doc.eol); }
    return parts.join("");
  }
  const optsOf = doc => doc.eolMixed ? { ...doc, eol: "\n" } : doc;

  return { init, effect, codesOf, textOf, optsOf, get field() { return field; } };
})();
