// English strings for the lazily loaded editor extras (key profiles, Vim, snippets, sessions, Outline, password dialog, locked notes); part of tools/one-editor-editor-extras.js.
I18n.add({
  "Bộ phím: {name} — phím của ứng dụng (Ctrl+P, Ctrl+Shift+P…) giữ nguyên.": "Key profile: {name} — the app's shortcuts (Ctrl+P, Ctrl+Shift+P…) stay the same.",
  "Không nạp được Vim ({file}).": "Could not load Vim ({file}).", "Vim: bật — Esc về Normal, i để gõ, :w lưu.": "Vim: on — Esc for Normal, i to type, :w saves.", "Vim: tắt.": "Vim: off.",
  // Snippets
  "snippet": "snippet", "Không lưu được snippet: {msg}": "Could not save the snippet: {msg}",
  "Chưa có snippet cho ngôn ngữ này — bôi đen đoạn code rồi “Snippet: lưu vùng chọn…”.": "No snippet for this language yet — select some code, then “Snippet: save the selection…”.",
  "Chọn snippet để chèn": "Pick a snippet to insert", "Bôi đen đoạn code cần lưu thành snippet trước.": "Select the code to save as a snippet first.",
  "Tên gọi tắt của snippet (gõ tên này rồi chọn trong gợi ý):": "Snippet prefix (type it, then pick it from the suggestions):", "của tôi · {lang}": "mine · {lang}",
  "✔ Đã lưu snippet “{prefix}” cho {lang} (trong trình duyệt này).": "✔ Snippet “{prefix}” saved for {lang} (in this browser).", "Chưa có snippet nào của bạn.": "You have no snippets yet.",
  "Đã xoá snippet “{prefix}”.": "Snippet “{prefix}” deleted.", "Chọn snippet của bạn để xoá": "Pick one of your snippets to delete",
  // Sessions
  "Không lưu được phiên: {msg}": "Could not save the session: {msg}", "Phiên {date}": "Session {date}",
  "Chưa có phiên nào — “Phiên: lưu…” hoặc 💾 trong Explorer.": "No session yet — “Session: save…” or 💾 in the Explorer.",
  "Chọn phiên để mở (tab của phiên được thêm, tab đang mở giữ nguyên)": "Pick a session to open (its tabs are added, open tabs stay)",
  // Outline
  "Tab đang mở không có symbol.": "The open tab has no symbols.", "Không có symbol khớp.": "No matching symbol.",
  // Password + locked notes
  "Sai mật khẩu hoặc dữ liệu đã hỏng.": "Wrong password or damaged data.", "Mật khẩu cần ít nhất 8 ký tự.": "The password needs at least 8 characters.", "Hai lần nhập không khớp.": "The two entries differ.",
  "Đặt mật khẩu cho “{name}”": "Set a password for “{name}”", "Mật khẩu của “{name}”": "Password of “{name}”",
  "🔒 “{name}” giờ chỉ lưu dạng mã hoá. Quên mật khẩu là không mở lại được.": "🔒 “{name}” is now stored encrypted only. Forget the password and it cannot be opened again.",
  "Ghi chú này chưa có mật khẩu.": "This note has no password.", "🔒 Đã khoá “{name}”.": "🔒 “{name}” locked.", "Ghi chú này không bị khoá.": "This note is not locked.",
  "🔓 Đã mở khoá “{name}” — vẫn lưu dạng mã hoá; F5 / đóng trang là khoá lại.": "🔓 “{name}” unlocked — still stored encrypted; F5 / closing the page locks it again.",
  "Mở khoá ghi chú trước.": "Unlock the note first.", "Bỏ mật khẩu — “{name}” sẽ lưu dạng thường trong trình duyệt?": "Remove the password — store “{name}” as plain text in this browser?",
  "Đã bỏ mật khẩu của “{name}”.": "Password of “{name}” removed.", "trình duyệt chặn IndexedDB": "the browser blocks IndexedDB",
  "Không xoá được bản thường cũ của ghi chú (lịch sử / phiên): {msg}": "Could not delete the note's older plain copies (history / sessions): {msg}",
  // Local history (8c)
  "Tab này không có lịch sử cục bộ.": "This tab has no local history.", "Tab lớn hơn 5 MB — không chụp lịch sử cục bộ.": "Tab larger than 5 MB — no local history snapshot.",
  "Không đổi so với bản lịch sử gần nhất — không chụp thêm.": "Unchanged since the latest snapshot — no new snapshot.",
  "✔ Đã chụp bản lịch sử của “{name}”.": "✔ Snapshot of “{name}” saved.", "Không ghi được lịch sử cục bộ: {msg}": "Could not write the local history: {msg}",
  "Không đọc được lịch sử cục bộ: {msg}": "Could not read the local history: {msg}",
  "“{name}” chưa có bản lịch sử — bản được chụp mỗi lần Ctrl+S, hoặc dùng lệnh “Lịch sử cục bộ: chụp bản ngay”.":
    "“{name}” has no history yet — a snapshot is taken on every Ctrl+S, or use “Local history: take a snapshot now”.",
  "mới nhất": "latest", "Chọn bản lịch sử để so sánh với “{name}”": "Pick a version to compare with “{name}”", "Không đọc được bản lịch sử này.": "Could not read this version.",
  "So sánh “{name}” với bản lúc {time} — lệnh “Lịch sử cục bộ: khôi phục…” để ghi bản đó vào tab gốc (Ctrl+Z được).":
    "Comparing “{name}” with the version of {time} — “Local history: restore…” writes it into the original tab (Ctrl+Z works).",
  "Tab gốc của bản lịch sử này đã đóng.": "The original tab of this version is closed.", "Tab gốc đang chỉ đọc — đọc lại file (Ctrl+S) rồi khôi phục.": "The original tab is read-only — reload the file (Ctrl+S), then restore.",
  "Thay toàn bộ nội dung “{name}” bằng bản lúc {time}? Ctrl+Z để hoàn tác.": "Replace all of “{name}” with the version of {time}? Ctrl+Z undoes it.",
  "✔ Đã khôi phục bản lúc {time} vào “{name}” — chưa ghi đĩa, Ctrl+S để lưu.": "✔ Restored the version of {time} into “{name}” — not written to disk yet, Ctrl+S to save.",
  "“{name}” chưa có bản lịch sử.": "“{name}” has no history yet.", "Xoá {n} bản lịch sử của “{name}”?": "Delete {n} history version(s) of “{name}”?",
  "✔ Đã xoá {n} bản lịch sử.": "✔ Deleted {n} history version(s).", "Không xoá được lịch sử cục bộ: {msg}": "Could not delete the local history: {msg}",
});
