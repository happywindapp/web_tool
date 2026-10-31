function readFile(f) {
  const r = new FileReader();
  r.onload = () => {
    const t = String(r.result), m = engine.fence && t.match(new RegExp("```" + engine.fence + "\\s*\\n([\\s\\S]*?)```"));
    setState({ code: m ? m[1].replace(/\n$/, "") : t, config: $("cfg").value }, f.name);
  };
  r.onerror = () => flash(T("✖ Không đọc được file {name}: {msg}", { name: f.name, msg: r.error?.message || T("lỗi không rõ") }), true);
  r.readAsText(f, "utf-8");
}

function jumpToError() {
  const line = +$("err").dataset.line, ta = $("src"), lines = ta.value.split("\n");
  if (engine.external || !line || line > lines.length) return;
  showEditorTab("code");
  const start = lines.slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0);
  ta.focus(); ta.setSelectionRange(start, start + lines[line - 1].length);
  ta.scrollTop = Math.max(0, (line - 5) * parseFloat(getComputedStyle(ta).lineHeight)); syncScroll();
}

function bindExports() {
  $("btnDl").onclick = () => download(baseName() + engine.ext, new Blob([$("src").value], { type: "text/plain;charset=utf-8" }));
  $("btnMd").onclick = () => copy("```" + engine.fence + "\n" + $("src").value.replace(/\s+$/, "") + "\n```\n", T("Đã chép khối Markdown."));
  $("btnSvg").onclick = () => { const s = needSvg(); s && download(baseName() + ".svg", new Blob([Exporter.svgText(s, lastBg)], { type: "image/svg+xml" })); };
  $("btnPng").onclick = async () => {
    const s = needSvg(); if (!s) return;
    try { download(`${baseName()}@${$("pngScale").value}x.png`, await Exporter.png(s, lastBg, +$("pngScale").value)); }
    catch (e) { flash(T("✖ Không xuất được PNG: {msg}", { msg: e.message }), true); }
  };
  $("btnCopyPng").onclick = () => { const s = needSvg(); s && copy(Exporter.png(s, lastBg, +$("pngScale").value), T("Đã chép ảnh PNG vào clipboard.")); };
}

function bindSplitter() {
  $("split").onpointerdown = e => {
    const sp = $("split"), work = $("work");
    sp.setPointerCapture(e.pointerId);
    sp.onpointermove = ev => { const r = work.getBoundingClientRect(); work.style.setProperty("--split", Math.min(80, Math.max(20, (ev.clientX - r.left) / r.width * 100)) + "%"); };
    sp.onpointerup = () => { sp.onpointermove = sp.onpointerup = null; };
  };
}

function bindActions() {
  $("src").addEventListener("input", () => { paint(); edited(); });
  $("src").addEventListener("scroll", syncScroll);
  $("src").addEventListener("keydown", e => { if (e.key === "Tab" && !e.ctrlKey && !e.altKey) { e.preventDefault(); document.execCommand("insertText", false, "    "); } });
  $("cfg").addEventListener("input", () => { syncControls(); edited(); });
  document.addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === "Enter") { e.preventDefault(); saveDraft(); render(); }
    if (e.key.toLowerCase() === "s") { e.preventDefault(); $("btnDl").click(); }
  });
  document.querySelectorAll("[data-engine]").forEach(b => { b.onclick = () => { if (b.dataset.engine !== engine.id) switchEngine(b.dataset.engine); }; });
  document.querySelectorAll("[data-tab]").forEach(b => { b.onclick = () => showEditorTab(b.dataset.tab); });
  $("btnRender").onclick = () => { saveDraft(); render(); };
  $("auto").onchange = () => { EngineStore.ui.set("auto", $("auto").checked); if ($("auto").checked) render(); };
  $("pickSel").onchange = e => patchConfig({ key: e.target.dataset.key }, e.target.value);
  $("err").onclick = jumpToError;
  $("file").onchange = e => { e.target.files[0] && readFile(e.target.files[0]); e.target.value = ""; };
  $("demo").onchange = e => { const d = engine.samples[e.target.value]; if (d) setState({ code: d[1], config: $("cfg").value }, ""); e.target.value = ""; };
  $("btnShare").onclick = ShareLink.share;
  $("btnOpenLink").onclick = ShareLink.askAndOpen;
  $("btnFull").onclick = () => document.fullscreenElement ? document.exitFullscreen() : $("pvPane").requestFullscreen();
  document.addEventListener("fullscreenchange", () => setTimeout(() => PanZoom.center(), 50));
  window.addEventListener("hashchange", async () => { if (await ShareLink.open(location.hash, "từ link chia sẻ")) cleanUrl(); });
  window.addEventListener("pagehide", saveDraft);
  document.body.ondragover = e => { e.preventDefault(); document.body.classList.add("drop"); };
  document.body.ondragleave = e => { if (!e.relatedTarget) document.body.classList.remove("drop"); };
  document.body.ondrop = e => { e.preventDefault(); document.body.classList.remove("drop"); e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]); };
  bindExports(); bindSplitter(); bindHistoryDialog(); bindDrawioTab();
}
