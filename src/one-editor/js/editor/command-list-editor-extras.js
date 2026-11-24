// Phase 8d commands: key profiles + Vim, Emmet, snippets, named sessions, visual aids, syntax selection, locked notes, password share link (code in the lazy extras bundle).
function registerEditorExtraCommands(C, doc, hasDoc) {
  const X = fn => () => EditorExtras.use(fn), note = () => hasDoc() && Docs.root(doc()).kind === "note";
  for (const [id, name] of [["vscode", "VS Code"], ["sublime", "Sublime Text"], ["notepadpp", "Notepad++"]])
    C("keys-" + id, () => T("Bộ phím: {name}", { name }), null, X(() => KeyProfiles.set(id)));
  C("vim", "Vim: bật / tắt (chế độ phím Vim)", null, X(() => KeyProfiles.setVim(!Prefs.get("vim", false))));
  C("emmet", "Emmet: bật / tắt (HTML · CSS · JSX)", null, () => EditorExtras.setEmmet(!EditorExtras.emmetOn()));
  C("emmetExpand", "Emmet: mở rộng viết tắt ở con trỏ (Ctrl+E)", null, () => CM.emmet ? CM.emmet.expandAbbreviation(Views.activeView()) : StatusBar.msg(T("Emmet chỉ chạy trong tab HTML / CSS / JSX."), "warn"), hasDoc);
  C("snippetInsert", "Snippet: chèn…", null, X(() => Snippets.pick()), hasDoc);
  C("snippetSave", "Snippet: lưu vùng chọn thành snippet…", null, X(() => Snippets.saveSelection()), hasDoc);
  C("snippetDelete", "Snippet: xoá snippet đã lưu…", null, X(() => Snippets.pickDelete()));
  C("sessionSave", "Phiên: lưu các tab + layout với tên…", null, X(() => Sessions.save()));
  C("sessionOpen", "Phiên: mở phiên đã lưu…", null, X(() => Sessions.pick()));
  for (const [id, label] of [["rulers", "Bật / tắt thước cột 80 / 120"], ["brackets", "Bật / tắt tô màu cặp ngoặc"], ["swatches", "Bật / tắt ô màu cạnh mã màu CSS"], ["crumbs", "Bật / tắt breadcrumbs (đường dẫn symbol trên editor)"]])
    C("aid-" + id, label, null, X(() => Aids.toggle(id)));
  C("expandSel", "Mở rộng vùng chọn theo cú pháp", "Alt+Shift+ArrowRight", X(() => Aids.expand(Views.activeView())), hasDoc);
  C("shrinkSel", "Thu hẹp vùng chọn (ngược lại lần mở rộng)", "Alt+Shift+ArrowLeft", X(() => Aids.shrink(Views.activeView())), hasDoc);
  C("outline", "Outline: danh sách hàm / class / tiêu đề của tab (sidebar)", null, () => SidePanels.show("outline"));
  C("noteLock", "Ghi chú: đặt mật khẩu (lưu mã hoá AES-GCM)…", null, X(() => Locks.lock(Docs.root(doc()))), note);
  C("noteRelock", "Ghi chú: khoá lại ngay (ẩn nội dung)", null, X(() => Locks.relock(Docs.root(doc()))), note);
  C("noteUnlock", "Ghi chú: mở khoá…", null, X(() => Locks.unlock(Docs.root(doc()))), note);
  C("noteUnseal", "Ghi chú: bỏ mật khẩu (lưu thường)", null, X(() => Locks.removePassword(Docs.root(doc()))), note);
  C("shareLocked", "🔒 Chia sẻ link có mật khẩu (AES-GCM)", null, X(async () => { const pw = await Crypt.ask({ title: T("Mật khẩu cho link chia sẻ"), confirm: true }); if (pw) ShareLoader.share(pw); }));
}
