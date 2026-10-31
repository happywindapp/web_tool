// Pan (drag) + zoom (wheel around cursor); the transform lives on #stage only, never on body/html.
const PanZoom = (() => {
  const view = $("view"), stage = $("stage");
  let s = 1, x = 0, y = 0, drag = null;
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
  view.addEventListener("pointerdown", e => { if (e.button) return; drag = { dx: e.clientX - x, dy: e.clientY - y }; view.setPointerCapture(e.pointerId); view.classList.add("grab"); });
  view.addEventListener("pointermove", e => { if (drag) { x = e.clientX - drag.dx; y = e.clientY - drag.dy; apply(); } });
  const stop = () => { drag = null; view.classList.remove("grab"); };
  view.addEventListener("pointerup", stop); view.addEventListener("pointercancel", stop);
  $("zIn").onclick = () => mid(1.25); $("zOut").onclick = () => mid(0.8);
  $("zPct").onclick = () => center(1); $("zFit").onclick = () => center();
  return { center };
})();
