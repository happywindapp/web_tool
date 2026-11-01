// Pan (drag) + zoom (wheel around cursor, two-finger pinch); the transform lives on #stage only, never on body/html.
const PanZoom = (() => {
  const view = $("view"), stage = $("stage");
  const touches = new Map();
  let s = 1, x = 0, y = 0, drag = null, pinch = null;
  const apply = () => { stage.style.transform = `translate(${x}px,${y}px) scale(${s})`; $("zPct").textContent = Math.round(s * 100) + "%"; };
  function zoomAt(f, cx, cy) { const n = Math.min(20, Math.max(0.05, s * f)); x = cx - (cx - x) * n / s; y = cy - (cy - y) * n / s; s = n; apply(); }
  function center(scale) {
    const r = view.getBoundingClientRect(), w = stage.offsetWidth, h = stage.offsetHeight;
    if (!w || !h || !r.width) return;
    s = scale ?? Math.min((r.width - 32) / w, (r.height - 32) / h);
    x = (r.width - w * s) / 2; y = Math.max(16, (r.height - h * s) / 2); apply();
  }
  const mid = f => { const r = view.getBoundingClientRect(); zoomAt(f, r.width / 2, r.height / 2); };
  view.addEventListener("wheel", e => { e.preventDefault(); const r = view.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const spread = () => { const [a, b] = touches.values(), r = view.getBoundingClientRect(); return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top }; };
  const seat = () => { const [t] = touches.values(); drag = t && { dx: t.x - x, dy: t.y - y }; pinch = touches.size === 2 ? spread() : null; };
  view.addEventListener("pointerdown", e => { if (e.button) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); seat(); view.setPointerCapture(e.pointerId); view.classList.add("grab"); });
  view.addEventListener("pointermove", e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) { const p = spread(); x += p.cx - pinch.cx; y += p.cy - pinch.cy; zoomAt(p.d / pinch.d, p.cx, p.cy); pinch = p; }
    else if (drag && touches.size === 1) { x = e.clientX - drag.dx; y = e.clientY - drag.dy; apply(); }
  });
  const stop = e => { touches.delete(e.pointerId); seat(); if (!touches.size) view.classList.remove("grab"); };
  view.addEventListener("pointerup", stop); view.addEventListener("pointercancel", stop);
  $("zIn").onclick = () => mid(1.25); $("zOut").onclick = () => mid(0.8);
  $("zPct").onclick = () => center(1); $("zFit").onclick = () => center();
  return { center };
})();
