// Resizing views (desktop > 900px): the #split bar in 2 columns / 1x2 / 2x1 (drag, ←/→, double-click = 50/50); elsewhere the gap between two views is the handle. Ratios are remembered per layout.
const Split = (() => {
  const clamp = r => Math.min(0.85, Math.max(0.15, r));
  let ratio = 0.5;
  const fr = { c: [1, 1, 1], r: [1, 1] };

  function apply(r) {
    ratio = clamp(r);
    const w = $("work");
    w.style.setProperty("--v1", ratio + "fr");
    w.style.setProperty("--v2", (1 - ratio) + "fr");
  }

  function applyTracks() {
    const w = $("work");
    fr.c.forEach((v, k) => w.style.setProperty("--c" + (k + 1), v + "fr"));
    fr.r.forEach((v, k) => w.style.setProperty("--r" + (k + 1), v + "fr"));
  }

  // Layout change: load that layout's saved tracks (equal when none).
  function load() {
    const saved = Prefs.get("tracks-" + Views.layout, null);
    fr.c = Array.isArray(saved?.c) && saved.c.length === 3 ? saved.c.map(Number) : [1, 1, 1];
    fr.r = Array.isArray(saved?.r) && saved.r.length === 2 ? saved.r.map(Number) : [1, 1];
    applyTracks();
  }

  // Column / row index of view gi in the current layout (2 columns uses #split instead).
  const col = gi => Views.layout === "3c" ? gi : Views.layout === "4g" ? gi % 2 : -1;
  const row = gi => ({ "2r": gi, "4g": gi >> 1, "12": gi - 1, "21": gi < 2 ? gi : -1 })[Views.layout] ?? -1;

  // The two views on each side of the point when it lies in a gap between them.
  function gapAt(x, y) {
    if (!["3c", "2r", "4g", "12", "21"].includes(Views.layout) || !matchMedia("(min-width: 901px)").matches) return null;
    const vis = Views.groups.slice(0, Views.count).map(g => ({ gi: g.i, r: g.el.getBoundingClientRect() }));
    for (const a of vis) for (const b of vis) {
      if (col(a.gi) >= 0 && col(b.gi) >= 0 && a.r.right <= x && b.r.left >= x && b.r.left - a.r.right < 16 && y > Math.max(a.r.top, b.r.top) && y < Math.min(a.r.bottom, b.r.bottom)) return { axis: "x", a, b };
      if (row(a.gi) >= 0 && row(b.gi) >= 0 && a.r.bottom <= y && b.r.top >= y && b.r.top - a.r.bottom < 16 && x > Math.max(a.r.left, b.r.left) && x < Math.min(a.r.right, b.r.right)) return { axis: "y", a, b };
    }
    return null;
  }

  function dragGap(work, e, gap) {
    const x = gap.axis === "x", list = x ? fr.c : fr.r, i = x ? col(gap.a.gi) : row(gap.a.gi), j = x ? col(gap.b.gi) : row(gap.b.gi);
    const start = x ? gap.a.r.left : gap.a.r.top, span = x ? gap.b.r.right - gap.a.r.left : gap.b.r.bottom - gap.a.r.top, sum = list[i] + list[j];
    work.setPointerCapture(e.pointerId);
    const move = ev => { const k = clamp(((x ? ev.clientX : ev.clientY) - start) / span); list[i] = +(sum * k).toFixed(3); list[j] = +(sum - list[i]).toFixed(3); applyTracks(); };
    const up = () => { work.removeEventListener("pointermove", move); Prefs.set("tracks-" + Views.layout, fr); };
    work.addEventListener("pointermove", move);
    work.addEventListener("pointerup", up, { once: true });
    work.addEventListener("pointercancel", up, { once: true });
  }

  function init() {
    const bar = $("split"), work = $("work");
    apply(+Prefs.get("split", 0.5) || 0.5);
    bar.addEventListener("pointerdown", e => {
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      const left = Views.groups[0].el.getBoundingClientRect().left;
      const right = Math.max(...Views.groups.slice(0, Views.count).map(g => g.el.getBoundingClientRect().right));
      const move = ev => apply((ev.clientX - left) / (right - left));
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

    work.addEventListener("pointermove", e => {
      if (e.target !== work || e.buttons) return;
      const g = gapAt(e.clientX, e.clientY);
      work.classList.toggle("gap-x", g?.axis === "x");
      work.classList.toggle("gap-y", g?.axis === "y");
    });
    work.addEventListener("pointerdown", e => {
      const g = e.target === work && gapAt(e.clientX, e.clientY);
      if (g) { e.preventDefault(); dragGap(work, e, g); }
    });
    work.addEventListener("dblclick", e => {
      if (e.target !== work || !gapAt(e.clientX, e.clientY)) return;
      fr.c = [1, 1, 1]; fr.r = [1, 1];
      applyTracks();
      Prefs.set("tracks-" + Views.layout, fr);
    });
    Views.onChange(() => { if (Views.layout !== lastLayout) { lastLayout = Views.layout; load(); } });
  }
  let lastLayout = "";

  const set = r => { apply(r); Prefs.set("split", ratio); };

  // Toolbar "25:75": split-bar layouts → column widths; 3 columns → 25:25:50 / 50:25:25; 2 rows → row heights; 2×2 → column widths.
  function preset(pair) {
    const a = parseInt(pair, 10) / 100, b = 1 - a, L = Views.layout;
    if (Layouts.get(L)?.bar) return set(a);
    if (L === "3c") fr.c = a === b ? [1, 1, 1] : a < b ? [1, 1, 2] : [2, 1, 1];
    else if (L === "2r") fr.r = [a, b];
    else if (L === "4g") fr.c = [a, b, 1];
    else return;
    applyTracks();
    Prefs.set("tracks-" + L, fr);
  }
  return { init, gapAt, set, preset, ratio: () => ratio };
})();
