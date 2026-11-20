// Compare highlighting inside an ordinary tab: changed lines / characters, the gap where the other side has extra lines, and a gutter (colour bar + arrow on each block's first line, click = copy the block to the other view).
const CompareDeco = (() => {
  let setEffect = null, field = null, gutterExt = null, Marker = null;
  const NONE = () => ({ deco: CM.view.Decoration.none, marks: CM.state.RangeSet.empty });

  function init() {
    const { state: S, view: V } = CM;
    setEffect = S.StateEffect.define();
    field = S.StateField.define({
      create: NONE,
      update(v, tr) {
        for (const e of tr.effects) if (e.is(setEffect)) return e.value;
        return tr.docChanged ? { deco: v.deco.map(tr.changes), marks: v.marks.map(tr.changes) } : v;
      },
      provide: f => V.EditorView.decorations.from(f, v => v.deco),
    });
    Marker = class extends V.GutterMarker {
      constructor(side, arrow) { super(); this.side = side; this.arrow = arrow; this.elementClass = side === "a" ? "cmp-g-del" : "cmp-g-add"; }
      eq(o) { return o.side === this.side && o.arrow === this.arrow; }
      toDOM() {
        const s = document.createElement("span");
        if (this.arrow) { s.className = "cmp-arrow"; s.textContent = this.side === "a" ? "→" : "←"; s.title = T("Bấm để chép khối này sang view kia"); }
        return s;
      }
    };
    gutterExt = V.gutter({
      class: "cmp-gutter",
      markers: view => view.state.field(field).marks,
      domEventHandlers: { mousedown: (view, line, ev) => { if (!ev.target.closest(".cmp-arrow")) return false; CompareDeco.onArrow(view, line.from); return true; } },
    });
  }

  // chunks: CM.merge.Chunk list of the pair; side "a" (left, removed) or "b" (right, added).
  function effect(doc, chunks, side) {
    const D = CM.view.Decoration, a = side === "a", ranges = [], marks = [];
    const line = D.line({ class: a ? "cmp-del" : "cmp-add" }), gap = D.line({ class: "cmp-gap" }), mark = D.mark({ class: a ? "cmp-del-ch" : "cmp-add-ch" });
    const bar = new Marker(side, false), arrow = new Marker(side, true);
    for (const c of chunks) {
      const from = a ? c.fromA : c.fromB, to = Math.min(a ? c.toA : c.toB, doc.length), end = a ? c.endA : c.endB;
      // Empty on this side: the arrow sits on the gap line and copies "nothing" over, i.e. removes the other side's lines.
      if (to <= from) { const at = doc.lineAt(Math.min(from, doc.length)).from; ranges.push(gap.range(at)); marks.push(arrow.range(at)); continue; }
      for (let l = doc.lineAt(from), first = true; ; l = doc.line(l.number + 1), first = false) {
        ranges.push(line.range(l.from));
        marks.push((first ? arrow : bar).range(l.from));
        if (l.to >= end || l.number === doc.lines) break;
      }
      for (const ch of c.changes) {
        const f = from + (a ? ch.fromA : ch.fromB), t = Math.min(from + (a ? ch.toA : ch.toB), doc.length);
        if (t > f) ranges.push(mark.range(f, t));
      }
    }
    return setEffect.of({ deco: D.set(ranges, true), marks: CM.state.RangeSet.of(marks, true) });
  }

  const clear = () => setEffect.of(NONE());
  return { init, effect, clear, onArrow: () => {}, get field() { return field; }, get gutter() { return gutterExt; } };
})();
