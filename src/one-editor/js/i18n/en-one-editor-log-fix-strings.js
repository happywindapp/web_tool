// English strings for phase 8a (log colours, line filter, tail -f, FIX hover / FIX Parser), keyed by the Vietnamese source text.
I18n.add({
  "Lọc dòng (log)": "Filter lines (log)", "Log: lọc dòng (chuỗi / regex, giữ / loại, ngữ cảnh) ở view kia": "Log: filter lines (text / regex, keep / drop, context) in the other view",
  "Theo dõi file đang mở (tail -f): bật / tắt": "Follow the open file (tail -f): on / off", "FIX: mở tab này trong FIX Parser (tab mới)": "FIX: open this tab in FIX Parser (new tab)",
  "Log: màu + lọc ERROR|WARN (±1 dòng)": "Log: colours + filter ERROR|WARN (±1 line)", "FIX: màu theo nhóm tag, rê chuột xem nghĩa": "FIX: colours by tag group, hover for meanings",
  "theo dõi": "following",
  // Tail
  "“{name}” ngắn lại (bị xoá / xoay vòng) — đã đọc lại từ đầu.": "“{name}” got shorter (truncated / rotated) — read again from the start.",
  "Ngừng theo dõi “{name}”: {msg}": "Stopped following “{name}”: {msg}",
  "Chỉ theo dõi được tab file mở bằng Mở file / Explorer trên Chrome / Edge (không phải file kéo-thả, file lớn hay hex).": "Only a file tab opened with Open file / Explorer on Chrome / Edge can be followed (not a dropped file, a large file or hex).",
  "Đọc lại file trước (Ctrl+S hoặc bấm thanh trạng thái), rồi bật theo dõi.": "Reload the file first (Ctrl+S or click the status bar), then follow it.",
  "🔁 Đang theo dõi “{name}” — dòng mới tự thêm vào cuối; cuộn lên để tạm dừng tự cuộn.": "🔁 Following “{name}” — new lines are appended; scroll up to pause auto-scroll.",
  "Không đọc được file: {msg}": "Could not read the file: {msg}", "Đã tắt theo dõi file.": "Stopped following the file.",
  "“{name}” ngắn lại trên đĩa trong khi tab có thay đổi chưa lưu — đã dừng theo dõi để không mất bài.": "“{name}” got shorter on disk while the tab has unsaved changes — stopped following so nothing is lost.",
  "Tab quá lớn để mở qua link (> 2 MB sau khi nén) — lưu file rồi mở trong FIX Parser.": "The tab is too large for a link (> 2 MB compressed) — save the file and open it in FIX Parser.",
  // FIX
  "Tên": "Name", "Kiểu": "Type", "Nhóm": "Group", "Giá trị": "Value", "Không có trong từ điển FIX 4.4 / 5.0SP2": "Not in the FIX 4.4 / 5.0SP2 dictionary",
  "Không nạp được từ điển FIX ({file}).": "Could not load the FIX dictionary ({file}).",
  "Đã mở “{name}” trong FIX Parser (tab mới; dữ liệu nằm sau dấu #, không gửi đi đâu).": "Opened “{name}” in FIX Parser (new tab; the data stays after the #, nothing is sent).",
  "FIX → Chi tiết message": "FIX → Message detail",
  "Không nạp được Message detail FIX ({file}) — cần file này nằm cạnh one-editor.html.": "Could not load the FIX Message detail ({file}) — this file must sit next to one-editor.html.",
});
