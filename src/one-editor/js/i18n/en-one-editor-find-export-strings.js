// English strings for phase 6 (Find in files, export / print / Copy as HTML), keyed by the Vietnamese source text.
I18n.add({
  // Find in files panel
  "Tìm / thay trong các file": "Find / replace in files", "Tìm trong tab đang mở, ghi chú, folder…": "Find in open tabs, notes, folder…",
  "Thay bằng… (regex: $1, $<tên>, \\n)": "Replace with… (regex: $1, $<name>, \\n)", "⇄ Thay tất cả": "⇄ Replace all", "■ Dừng": "■ Stop",
  "Tìm / thay trong mọi tab, ghi chú và folder đang mở (Ctrl+Shift+F / Ctrl+Shift+H)": "Find / replace in every tab, note and the open folder (Ctrl+Shift+F / Ctrl+Shift+H)",
  "Thay mọi kết quả — file chưa mở được mở thành tab trước, không ghi ra đĩa (Ctrl+Enter trong ô Thay)": "Replace every match — files not open yet are opened as tabs first, nothing is written to disk (Ctrl+Enter in the Replace box)",
  "Quét cả folder đang mở trong Explorer (bỏ qua file nhị phân và file lớn hơn 5 MB)": "Also scan the folder open in Explorer (binary files and files over 5 MB are skipped)",
  "Quét cả thư mục .git và node_modules (mặc định bỏ qua cho nhanh)": "Also scan .git and node_modules (skipped by default for speed)",
  "Dừng quét — giữ các kết quả đã tìm được": "Stop scanning — keeps the matches found so far",
  "Gõ nội dung cần tìm. Phạm vi: tab đang mở, ghi chú và folder đang mở trong Explorer.": "Type what to find. Scope: open tabs, notes and the folder open in Explorer.",
  "{n} kết quả trong {files} file": "{n} results in {files} files", "⏳ Đã quét {n} file…": "⏳ Scanned {n} files…",
  "chưa mở folder trong Explorer": "no folder open in Explorer", "bỏ qua {n} file nhị phân": "skipped {n} binary files",
  "bỏ qua {n} file lớn hơn {mb} MB": "skipped {n} files over {mb} MB", "{n} tab file cần bấm vào để cấp quyền đọc": "{n} file tabs need a click to allow reading",
  "{n} file / folder không đọc được": "{n} files / folders could not be read", "dừng ở {max} file": "stopped at {max} files", "đã dừng": "stopped",
  "Thay mọi kết quả trong file này": "Replace every match in this file", "Tab này đã đóng — tìm lại để cập nhật kết quả.": "This tab was closed — search again to refresh the results.",
  // Replace
  "Chờ tìm xong (hoặc bấm Dừng) rồi mới thay.": "Wait for the search to finish (or press Stop) before replacing.",
  "Thay {n} kết quả trong {files} file bằng “{text}”?": "Replace {n} matches in {files} files with “{text}”?",
  "{n} file chưa mở sẽ được mở thành tab rồi mới thay.": "{n} files not open yet will be opened as tabs first.",
  "Chưa ghi ra đĩa: xem lại rồi Ctrl+S từng file; Ctrl+Z trong tab để hoàn tác.": "Nothing is written to disk: review, then Ctrl+S each file; Ctrl+Z in a tab undoes it.",
  "Đã thay {n} chỗ trong {files} file — chưa lưu ra đĩa.": "Replaced {n} matches in {files} files — not saved to disk yet.", "Bỏ qua: {list}": "Skipped: {list}",
  "tab chỉ xem (hex / file lớn)": "view-only tab (hex / large file)", "tab chỉ đọc": "read-only tab", "tab đã đóng": "tab was closed", "không mở được": "could not open",
  "chưa đọc lại từ đĩa — bấm vào tab để cấp quyền rồi thay lại": "not re-read from disk — click the tab to allow it, then replace again",
  "không còn kết quả (nội dung đã đổi)": "no matches left (content changed)",
  "Thay bị ngắt vì lỗi: {msg} — các tab đã thay vẫn giữ, Ctrl+Z để hoàn tác.": "Replace stopped by an error: {msg} — tabs already changed keep it, Ctrl+Z undoes.",
  "{n} folder chỉ đọc {max} mục đầu": "{n} folders read up to their first {max} entries", "tìm bị ngắt vì lỗi: {msg}": "search stopped by an error: {msg}",
  // Export errors
  "Tab hex / file lớn chỉ để xem — tải sẽ ra file hỏng, dùng file gốc trên đĩa.": "Hex / large-file tabs are view-only — a download would be a broken file; use the original on disk.",
  "“{name}” chưa đọc lại được từ đĩa — cấp quyền rồi tải lại.": "“{name}” could not be re-read from disk — allow access, then download again.",
  "trình duyệt chặn clipboard": "the browser blocked the clipboard", "Không chép được: {msg}": "Could not copy: {msg}", "Không in được: {msg}": "Could not print: {msg}",
  // Commands, export
  "Tìm trong các file: tab đang mở, ghi chú, folder Explorer": "Find in files: open tabs, notes, Explorer folder",
  "Thay trong các file: tab đang mở, ghi chú, folder Explorer": "Replace in files: open tabs, notes, Explorer folder",
  "Xuất: tải xuống (giữ đuôi gốc)": "Export: download (keep the extension)", "Xuất: tải xuống dạng .txt": "Export: download as .txt",
  "Xuất: in (chỉ nội dung tab, preview Markdown in phần đã vẽ)": "Export: print (tab content only; a Markdown preview prints as rendered)",
  "Xuất: chép dạng HTML giữ màu highlight (vùng chọn hoặc cả tab)": "Export: copy as HTML with highlight colours (selection or whole tab)",
  "✔ Đã chép {what} dạng HTML có màu — dán vào Word, Outlook, OneNote…": "✔ Copied {what} as coloured HTML — paste into Word, Outlook, OneNote…",
});
