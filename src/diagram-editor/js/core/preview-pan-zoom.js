// Diagram Editor's single preview: PanZoomCtl on #view/#stage plus the zoom buttons.
const PanZoom = (() => {
  const pz = PanZoomCtl.attach($("view"), $("stage"), s => { $("zPct").textContent = Math.round(s * 100) + "%"; });
  $("zIn").onclick = () => pz.zoom(1.25); $("zOut").onclick = () => pz.zoom(0.8);
  $("zPct").onclick = () => pz.center(1); $("zFit").onclick = () => pz.center();
  return { center: pz.center };
})();
