// Preview commands (phase 3): Ctrl+K V as in VS Code ("open preview to the side").
function registerPreviewCommands(C, doc, hasDoc) {
  const P = PreviewPane;
  C("preview", "👁 Preview ở view kia (sơ đồ, Markdown, HTML, bảng…)", ["Ctrl+k v", "Ctrl+k Ctrl+v"], () => OutputLink.run(doc(), "preview"), hasDoc);
  C("previewFit", "Preview: vừa khung", null, P.fit, hasDoc);
  C("previewSvg", "Preview: tải SVG", null, P.exportSvg, hasDoc);
  C("previewPng", "Preview: tải PNG", null, P.exportPng, hasDoc);
  C("previewCopy", "Preview: chép SVG", null, P.copySvg, hasDoc);
}
