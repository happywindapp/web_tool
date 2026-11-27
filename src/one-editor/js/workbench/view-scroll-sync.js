// 🔗 on the view bar: scrolling one side scrolls the other — by line when both show an editor, by fraction for a preview / list pane; Compare's own sync wins while comparing.
const ScrollSync = (() => {
  let on = false, ignore = null;
  const panes = new WeakMap();
  const scrolls = el => el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY);
  const editorShown = g => !!g.active && getComputedStyle(g.host).visibility !== "hidden";

  // The element that scrolls the view's content: the editor, else the largest scrolling box of the pane in its place.
  function scroller(g) {
    if (editorShown(g)) return g.view.scrollDOM;
    const hit = panes.get(g.el);
    if (hit?.isConnected && !hit.closest(".host") && scrolls(hit)) return hit;
    let best = null, area = 0;
    for (const el of g.el.querySelectorAll(":scope > :not(.host, .gbar) *")) {
      const a = el.clientWidth * el.clientHeight;
      if (a > area && scrolls(el)) { best = el; area = a; }
    }
    if (best) panes.set(g.el, best);
    return best;
  }

  function sync(e) {
    const src = e.target;
    if (!on || Compare.active || !(src instanceof Element)) return;
    if (ignore === src) { ignore = null; return; }
    const g = Views.groups.find(x => x.el.contains(src)), to = g ? ViewBar.opposite(g.i) : -1;
    if (to < 0 || src.closest(".gbar") || scroller(g) !== src) return;
    const h = Views.groups[to], dst = scroller(h);
    if (!dst) return;
    let target;
    if (src === g.view.scrollDOM && dst === h.view.scrollDOM) {
      const v = g.view, w = h.view, top = Math.max(0, src.scrollTop - v.documentPadding.top), blk = v.lineBlockAtHeight(top);
      const ln = Math.min(v.state.doc.lineAt(blk.from).number, w.state.doc.lines);
      target = w.lineBlockAt(w.state.doc.line(ln).from).top + w.documentPadding.top + (top - blk.top);
    } else {
      const span = src.scrollHeight - src.clientHeight;
      target = span > 0 ? src.scrollTop / span * (dst.scrollHeight - dst.clientHeight) : 0;
    }
    const before = dst.scrollTop;
    if (Math.abs(before - target) < 1) return;
    ignore = dst;
    dst.scrollTop = target;
    if (dst.scrollTop === before) ignore = null;
  }

  function set(v) {
    on = !!v;
    Prefs.set("scrollSync", on);
    StatusBar.msg(on ? T("Cuộn đồng bộ 2 view: bật") : T("Cuộn đồng bộ 2 view: tắt"));
  }

  function init() {
    on = Prefs.get("scrollSync", false) === true;
    $("work").addEventListener("scroll", sync, { capture: true, passive: true });
  }

  return { init, set, toggle: () => set(!on), get on() { return on; } };
})();
