// Editor ↔ Markdown preview scroll sync: source lines map to [data-line] blocks (offsets cached, binary search); a scroll we set ourselves is recognised by its position, not by a timer.
const MdScrollSync = (() => {
  const views = new Set(), expect = new WeakMap();
  let queued = null;

  const topOf = (box, el) => el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
  // [{ l, y }] in document order with non-decreasing lines; rebuilt after a render or a resize.
  function marks(v) {
    if (v.marks) return v.marks;
    let last = 0;
    v.marks = [...v.el.querySelectorAll("[data-line]")].map(el => ({ l: +el.dataset.line, y: topOf(v.el, el) })).filter(m => m.l >= last && (last = m.l, true));
    return v.marks;
  }
  // Index of the last mark whose key is ≤ x.
  function floor(ms, x, k) { let lo = 0, hi = ms.length - 1, r = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (ms[mid][k] <= x) { r = mid; lo = mid + 1; } else hi = mid - 1; } return r; }

  function previewTop(v, line) {
    const ms = marks(v), k = floor(ms, line, "l");
    if (k < 0) return 0;
    const a = ms[k], b = ms[k + 1], y1 = b ? b.y : v.el.scrollHeight;
    return Math.max(0, a.y + (y1 - a.y) * (b && b.l > a.l ? Math.min(1, (line - a.l) / (b.l - a.l)) : 0) - 8);
  }
  function previewLine(v) {
    const ms = marks(v), y = v.el.scrollTop + 8, k = floor(ms, y, "y");
    if (k < 0) return 1;
    const a = ms[k], b = ms[k + 1], y1 = b ? b.y : v.el.scrollHeight;
    return a.l + (b ? (b.l - a.l) * Math.min(1, (y - a.y) / Math.max(1, y1 - a.y)) : 0);
  }
  function editorLine(cm) {
    const h = cm.scrollDOM.getBoundingClientRect().top - cm.documentTop, blk = cm.lineBlockAtHeight(Math.max(0, h));
    return cm.state.doc.lineAt(blk.from).number + Math.min(1, Math.max(0, (h - blk.top) / (blk.height || 1)));
  }
  function editorTop(cm, line) {
    const d = cm.state.doc, n = Math.min(Math.max(Math.floor(line), 1), d.lines), blk = cm.lineBlockAt(d.line(n).from);
    return cm.documentTop - cm.scrollDOM.getBoundingClientRect().top + cm.scrollDOM.scrollTop + blk.top + (line - n) * blk.height;
  }

  const atEnd = s => s.scrollTop > 0 && s.scrollTop + s.clientHeight >= s.scrollHeight - 2;
  const set = (el, top) => { el.scrollTop = top; expect.set(el, el.scrollTop); };
  const ours = el => { const e = expect.get(el); expect.delete(el); return e !== undefined && Math.abs(el.scrollTop - e) < 2; };
  const groupOf = srcId => Views.groups.slice(0, Views.count).find(g => { const d = Docs.get(g.active); return d && Docs.root(d).id === srcId; });
  const shown = v => v.el.isConnected && v.el.clientHeight > 0;

  function fromEditor(v, cm) { if (shown(v)) set(v.el, atEnd(cm.scrollDOM) ? v.el.scrollHeight : previewTop(v, editorLine(cm))); }
  function fromPreview(v) {
    const g = groupOf(v.srcId);
    if (g && shown(v)) set(g.view.scrollDOM, atEnd(v.el) ? g.view.scrollDOM.scrollHeight : editorTop(g.view, previewLine(v)));
  }
  // One sync per frame, always from the latest scroll.
  const later = fn => { queued = fn; requestAnimationFrame(() => { const f = queued; queued = null; f?.(); }); };

  function attach(v) {
    views.add(v);
    v.el.addEventListener("scroll", () => { if (!ours(v.el)) later(() => fromPreview(v)); }, { passive: true });
    new ResizeObserver(() => { v.marks = null; }).observe(v.el);
    v.el.addEventListener("load", () => { v.marks = null; }, true);
  }
  const detach = v => views.delete(v);
  const syncNow = v => { v.marks = null; const g = groupOf(v.srcId); if (g) fromEditor(v, g.view); };

  function init() {
    Views.groups.forEach(g => g.view.scrollDOM.addEventListener("scroll", () => {
      if (ours(g.view.scrollDOM)) return;
      const d = Docs.get(g.active), src = d && Docs.root(d).id;
      later(() => { for (const v of views) if (v.srcId === src) fromEditor(v, g.view); });
    }, { passive: true }));
  }

  return { init, attach, detach, syncNow, topOf };
})();
