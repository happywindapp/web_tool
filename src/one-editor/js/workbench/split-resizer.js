// Splitter between View 1 and View 2 (desktop > 900px): drag, or focus it and use ←/→; the ratio is remembered in this browser.
const Split = (() => {
  const clamp = r => Math.min(0.85, Math.max(0.15, r));
  let ratio = 0.5;

  function apply(r) {
    ratio = clamp(r);
    const w = $("work");
    w.style.setProperty("--v1", ratio + "fr");
    w.style.setProperty("--v2", (1 - ratio) + "fr");
  }

  function init() {
    const bar = $("split");
    apply(+Prefs.get("split", 0.5) || 0.5);
    bar.addEventListener("pointerdown", e => {
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      const a = Views.groups[0].el.getBoundingClientRect(), b = Views.groups[1].el.getBoundingClientRect();
      const move = ev => apply((ev.clientX - a.left) / (b.right - a.left));
      const up = () => { bar.removeEventListener("pointermove", move); Prefs.set("split", ratio); };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up, { once: true });
      bar.addEventListener("pointercancel", up, { once: true });
    });
    bar.addEventListener("keydown", e => {
      const d = e.key === "ArrowLeft" ? -0.05 : e.key === "ArrowRight" ? 0.05 : 0;
      if (!d) return;
      e.preventDefault();
      apply(ratio + d);
      Prefs.set("split", ratio);
    });
    bar.addEventListener("dblclick", () => { apply(0.5); Prefs.set("split", ratio); });
  }

  return { init };
})();
