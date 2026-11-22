// All One Editor commands. Ctrl+N/T/W/Shift+T and Ctrl+1…8 belong to the browser, hence the Alt variants.
function registerOneEditorCommands() {
  const C = Commands.add, A = Actions, V = Views;
  const view = () => V.activeView(), doc = () => V.activeDoc(), hasDoc = () => !!doc(), many = () => V.count > 1;
  const withDoc = fn => () => { const d = doc(); if (d) fn(d); };

  C("palette", "Command Palette — mọi lệnh", ["Ctrl+Shift+p", "F1"], () => QuickPick.open(">"));
  C("quickOpen", "Mở nhanh tab / ghi chú / file", "Ctrl+p", () => QuickPick.open(""));
  C("gotoLine", "Tới dòng…", "Ctrl+g", () => QuickPick.open(":"), hasDoc);
  C("gotoSymbol", "Tới symbol (hàm, class, tiêu đề)…", ["Ctrl+r", "Ctrl+Shift+o"], () => QuickPick.open("@"), hasDoc);
  C("find", "Tìm / thay (regex, phân biệt hoa thường, nguyên từ)", null, () => CM.search.openSearchPanel(view()), hasDoc);
  C("findInSelSelect", "Tìm trong vùng chọn: chọn hết kết quả", "Alt+Shift+Enter", () => SearchInSelection.selectAll(view()), hasDoc);
  C("findInSelReplace", "Tìm trong vùng chọn: thay hết", "Ctrl+Alt+Enter", () => SearchInSelection.replaceAll(view()), hasDoc);
  C("guides", "Bật / tắt đường thụt lề (indent guide)", null, () => A.setGuides(!CmSetup.settings.guides));

  C("newNote", "Ghi chú mới", "Alt+n", () => A.newNote());
  C("openFiles", "Mở file…", "Ctrl+o", A.openFiles);
  C("openFolder", "Mở folder…", null, A.openFolder);
  C("openCloudFolder", "☁ Mở folder từ link Google Drive / OneDrive…", null, A.openCloudFolder);
  C("gdriveKey", "Google Drive: đổi / xoá API key…", null, () => { if (CloudDrive.askKey() != null) StatusBar.msg(T("Đã cập nhật API key Google Drive."), "good"); });
  C("save", "Lưu", "Ctrl+s", () => A.save(false), hasDoc);
  C("saveAs", "Lưu thành…", "Ctrl+Shift+s", () => A.save(true), hasDoc);
  C("diskRefresh", "🔄 Làm mới từ đĩa: folder Explorer + các tab file", null, () => DiskSync.checkAll());
  C("diskReload", "Đọc lại từ đĩa / so sánh với bản trên đĩa…", null, withDoc(d => DiskSync.one(d)), () => hasDoc() && !!Docs.root(doc()).handle);
  C("closeTab", "Đóng tab", "Alt+w", A.closeTab, hasDoc);
  C("closeOthers", "Đóng các tab khác trong view (trừ tab ghim)", null, withDoc(d => V.closeMany(V.focused, d.id, false)), hasDoc);
  C("closeRight", "Đóng các tab bên phải (trừ tab ghim)", null, withDoc(d => V.closeMany(V.focused, d.id, true)), hasDoc);
  C("reopen", "Mở lại tab vừa đóng", "Alt+Shift+t", () => V.reopen());
  C("renameTab", "Đổi tên tab", null, withDoc(d => TabStrip.rename(d)), hasDoc);
  C("pinTab", "Ghim / bỏ ghim tab", "Ctrl+k Shift+Enter", withDoc(d => V.togglePin(d)), hasDoc);
  C("pinItem", "Ghim / bỏ ghim vào mục Đã ghim (Explorer)", null, withDoc(d => Pinned.toggleDoc(d)), () => hasDoc() && Pinned.canPin(doc()));

  C("bookmark", "Bookmark: bật / tắt ở dòng này", "Ctrl+F2", () => Bookmarks.toggleLine(view()), hasDoc);
  C("bookmarkNext", "Bookmark: tới cái kế tiếp", "F2", () => Bookmarks.jump(view(), 1), hasDoc);
  C("bookmarkPrev", "Bookmark: về cái trước", "Shift+F2", () => Bookmarks.jump(view(), -1), hasDoc);
  C("bookmarkClear", "Bookmark: xoá hết trong tab", null, () => Bookmarks.clear(view()), hasDoc);

  for (const l of Layouts.LIST) C("layout-" + l.id, () => T("Layout: {name}", { name: T(l.label) }), l.key, () => A.setLayout(l.id));
  for (let i = 0; i < Layouts.MAX; i++) C("focus" + (i + 1), () => T("Tới View {n}", { n: i + 1 }), "Alt+" + (i + 1), () => { V.focus(i); if (V.activeDoc()) view().focus(); PhoneLayout.show(V.focused + 1); }, () => i < V.count);
  C("moveTab", "Chuyển tab sang view kế tiếp", null, () => A.moveTab(), hasDoc);
  C("cloneTab", "Mở tab này thêm ở view kế tiếp (2 view cùng sửa 1 tab)", "Ctrl+\\", A.cloneTab, hasDoc);
  C("swap", "Đổi chỗ view này với view kế tiếp", null, () => V.swap(), many);
  C("explorer", "Ẩn / hiện Explorer", "Ctrl+b", A.toggleExplorer);
  C("sideExplorer", "Hiện Explorer", "Ctrl+Shift+e", () => SideBar.show("explorer"));
  C("sideSearch", "Tìm trong các file: tab đang mở, ghi chú, folder Explorer", "Ctrl+Shift+f", () => SideBar.show("search"));
  C("sideReplace", "Thay trong các file: tab đang mở, ghi chú, folder Explorer", "Ctrl+Shift+h", () => SideBar.show("search", true));
  C("exportFile", "Xuất: tải xuống (giữ đuôi gốc)", null, () => ExportActions.download(false), hasDoc);
  C("exportTxt", "Xuất: tải xuống dạng .txt", null, () => ExportActions.download(true), hasDoc);
  C("exportPrint", "Xuất: in (chỉ nội dung tab, preview Markdown in phần đã vẽ)", null, ExportActions.print, hasDoc);
  C("exportHtml", "Xuất: chép dạng HTML giữ màu highlight (vùng chọn hoặc cả tab)", null, ExportActions.copyHtml, hasDoc);
  C("wrap", "Bật / tắt xuống dòng mềm", "Alt+z", () => A.setWrap(!CmSetup.settings.wrap));
  C("zoomIn", "Phóng to chữ", ["Ctrl+=", "Ctrl++", "Ctrl+Shift++"], () => A.zoom(1));
  C("zoomOut", "Thu nhỏ chữ", ["Ctrl+-", "Ctrl+Shift+_"], () => A.zoom(-1));
  C("zoomReset", "Cỡ chữ mặc định", "Ctrl+0", () => A.zoom(0));
  C("minimap", "Bật / tắt minimap", null, () => A.setMinimap(!CmSetup.settings.minimap));
  C("zen", "Chế độ Zen (ẩn mọi thanh)", "Alt+Shift+z", A.toggleZen);

  C("run", "▶ Chạy phép đang chọn, kết quả ra view kia", "Ctrl+Enter", A.run, hasDoc);
  registerFormatCompareCommands(C, doc, hasDoc);
  registerNotepadppCommands(C, hasDoc);
  registerPreviewCommands(C, doc, hasDoc);
  registerTranslateCommands(C, doc, hasDoc);
  registerDevtoolCommands(C, doc, hasDoc);
  registerDataCommands(C, doc, hasDoc);
  registerLogFixCommands(C, doc, hasDoc);
  registerEditorExtraCommands(C, doc, hasDoc);
  registerPowerToolCommands(C, doc, hasDoc);
  C("language", "Đổi ngôn ngữ của tab", null, () => $("langSel").focus(), hasDoc);
  C("share", "Chia sẻ link các tab đang mở", null, () => ShareLoader.share());
}
