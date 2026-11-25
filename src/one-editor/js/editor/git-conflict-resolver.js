// Conflict block widget (R16): current / base / incoming lines tinted, a row of Accept Current · Incoming · Both · Compare above each <<<<<<< line; blocks come from Conflicts (main page), edits go through Conflicts.accept.
const ConflictUi = (() => {
  let field = null, setFx = null, Bar = null;

  function init() {
    const { StateField, StateEffect } = CM.state, { Decoration, EditorView, WidgetType } = CM.view;
    setFx = StateEffect.define();
    field = StateField.define({ create: () => Decoration.none, update(d, tr) { for (const e of tr.effects) if (e.is(setFx)) return e.value; return d.map(tr.changes); }, provide: f => EditorView.decorations.from(f) });
    Bar = class extends WidgetType {
      constructor(k, n, a, b, lang) { super(); Object.assign(this, { k, n, a, b, lang }); }
      eq(o) { return o.k === this.k && o.n === this.n && o.a === this.a && o.b === this.b && o.lang === this.lang; }
      toDOM(view) {
        const box = PowerUi.mk("div", "cf-bar"), act = choice => () => { const at = view.posAtDOM(box); if (choice === "compare") compare(view, at); else Conflicts.accept(choice, at, view); };
        const btn = (text, choice, title) => { const b = PowerUi.button(text, act(choice), title); b.onmousedown = e => e.preventDefault(); return b; };
        box.append(PowerUi.mk("span", "cf-tag", T("Conflict {k}/{n}", { k: this.k, n: this.n })),
          btn(T("Accept Current"), "current", T("Giữ phía hiện tại ({a})", { a: this.a })),
          btn(T("Accept Incoming"), "incoming", T("Lấy phía đổi đến ({b})", { b: this.b })),
          btn(T("Accept Both"), "both", T("Giữ cả hai: hiện tại rồi đổi đến")),
          btn(T("⇄ So sánh"), "compare", T("Mở 2 phía thành 2 tab tạm rồi so sánh cạnh nhau")));
        return box;
      }
      ignoreEvent() { return true; }
    };
    I18n.onChange(() => Docs.list().forEach(d => d.state?.field(field, false) && show(d)));
  }

  function build(doc, list) {
    const D = CM.view.Decoration, ranges = [], line = {};
    const cls = c => line[c] ??= D.line({ class: c });
    list.forEach((b, i) => {
      ranges.push(D.widget({ widget: new Bar(i + 1, list.length, b.a || "HEAD", b.b || "?", I18n.lang), side: -1, block: true }).range(b.from));
      for (let p = b.from; p < b.to && p <= doc.length;) {
        const l = doc.lineAt(p), f = l.from;
        const c = f === b.from ? "cf-mk cf-cur-mk" : f < b.ours[1] ? "cf-cur" : b.base && f === b.ours[1] ? "cf-mk cf-base-mk" : b.base && f < b.base[1] ? "cf-base"
          : f < b.theirs[0] ? "cf-mk" : f < b.theirs[1] ? "cf-inc" : "cf-mk cf-inc-mk";
        ranges.push(cls(c).range(f));
        p = l.to + 1;
      }
    });
    return D.set(ranges, true);
  }

  // Redraws the blocks of a tab (after a scan); the field is added the first time a tab has a conflict.
  function show(d) {
    if (!field) init();
    if (!Docs.get(d.id) || !d.state) return;
    const has = d.state.field(field, false) !== undefined, list = Conflicts.list(d);
    if (!list.length && !has) return;
    const fx = [setFx.of(build(d.state.doc, list))];
    if (!has) fx.unshift(CM.state.StateEffect.appendConfig.of(field));
    Views.applyEffect(d, fx);
  }

  // The two sides of one block as temp tabs in 2 views, compared (Compare, both stay editable).
  function compare(view, at) {
    const d = Conflicts.docOf(view);
    if (!d) return;
    const t = view.state.doc.toString(), b = GitConflict.find(t).find(x => at >= x.from && at < x.to);
    if (!b) return;
    const lang = d.lang || Docs.effectiveLang(d), side = (r, label) => Docs.create({ kind: "temp", name: d.name + " ⇢ " + label, lang, text: t.slice(r[0], r[1]) });
    if (Views.count < 2) Views.setLayout("2c");
    const ga = Views.where(d.id) >= 0 ? Views.where(d.id) : Views.focused;
    Views.open(side(b.ours, "Current (" + (b.a || "HEAD") + ")"), ga, true);
    Views.open(side(b.theirs, "Incoming (" + (b.b || "?") + ")"), Views.other(ga), true);
    Compare.start(ga);
  }

  return { show };
})();
