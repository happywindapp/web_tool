# Headless: test File System Access bằng OPFS handle

**Triệu chứng:** cần test headless luồng file / folder local (mở file, lưu, phát hiện file đổi trên đĩa), nhưng `showOpenFilePicker` / `showDirectoryPicker` mở hộp thoại hệ thống, puppeteer không điều khiển được.

**Nguyên nhân:** picker là UI của OS. OPFS (`navigator.storage.getDirectory()`) trả handle cùng interface (`getFile`, `createWritable`, `values`, `removeEntry`) nhưng bị chặn trên `file://` (`SecurityError`).

**Cách xử lý đúng:**
- Script test tự dựng static server `http.createServer` (127.0.0.1, port 0) rồi `goto http://…/tools/<tool>.html`.
- Tạo file trong OPFS, đưa handle thẳng vào `LocalFs.fromHandle` / `FileOpen.openMany` ⇒ chạy đúng code thật. "Sửa bên ngoài" = `createWritable` trên handle khác.
- `FileSystemObserver` (Chrome 157) bắn sự kiện cho OPFS ⇒ test được auto-reload.
- CodeMirror gộp transaction trong 500 ms thành 1 bước undo ⇒ thay nội dung do hệ thống cần `CM.commands.isolateHistory.of("full")` để Ctrl+Z trả đúng bản trước.
- Giới hạn: không thay được kiểm thử thật với ổ đĩa qua picker (quyền, đường dẫn thật).
