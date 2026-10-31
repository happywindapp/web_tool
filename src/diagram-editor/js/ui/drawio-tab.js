// draw.io tab: #src keeps the XML, so history, saved diagrams and share links work as in every other tab.
function drawioReport() {
  if (DrawioEmbed.live) report(T("✔ Đã nạp sơ đồ vào draw.io."), "good");
  else report(T("Sơ đồ đang nằm trong trình duyệt này — bấm “Kết nối draw.io” để mở trình soạn."), "muted");
}

function drawioConnect() {
  $("dioGate").hidden = true; $("dioFail").hidden = true; $("dioFrame").hidden = false;
  report(T("Đang kết nối embed.diagrams.net…"), "muted");
  DrawioEmbed.connect($("src").value, $("dioFrame"), I18n.lang);
}

function dataUrlToBlob(url) {
  const [head, body] = url.split(","), mime = /^data:([^;,]+)/.exec(head)?.[1] || "application/octet-stream";
  const bytes = head.includes(";base64") ? Uint8Array.from(atob(body), c => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(body));
  return new Blob([bytes], { type: mime });
}

function bindDrawioTab() {
  DrawioEmbed.init({
    onReady: () => drawioReport(),
    onFail: () => { $("dioFrame").hidden = true; $("dioGate").hidden = false; $("dioFail").hidden = false; report(T("✖ Không kết nối được embed.diagrams.net — kiểm tra mạng / proxy. Sơ đồ vẫn còn trong trình duyệt."), "bad"); },
    onChange: (xml, explicit) => {
      if (engine.id !== "drawio") { // a late autosave can arrive just after leaving the tab
        const s = EngineStore.of("drawio");
        s.set("draft", { code: xml, config: s.get("draft", null)?.config || DrawioEngine.defaultConfig });
        return;
      }
      if (explicit) VersionHistory.add(store, $("src").value, $("cfg").value, true);
      $("src").value = xml; saveDraft();
      if (explicit) flash(T("Đã lưu vào trình duyệt này."));
    },
    onExport: (data, format) => download(`${baseName()}.${format === "png" ? "png" : "svg"}`, dataUrlToBlob(data)),
  });
  $("dioConnect").onclick = drawioConnect;
  $("dioDl").onclick = () => $("btnDl").click();
  for (const [id, format] of [["dioSvg", "xmlsvg"], ["dioPng", "png"]]) $(id).onclick = () => {
    if (!DrawioEmbed.live) return flash(T("Hãy kết nối draw.io trước khi xuất ảnh."), true);
    DrawioEmbed.exportAs(format);
  };
}
