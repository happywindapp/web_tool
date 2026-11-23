# One Editor: phím tắt riêng của 1 vùng phải nghe ở window (capture)

**Triệu chứng:** phím tắt gắn vào element của một vùng (ví dụ F2 đổi tên trên dòng Explorer) không chạy, trong khi Ctrl+C/V, Delete và Alt+Enter ở cùng chỗ vẫn chạy.

**Nguyên nhân:** `Commands.onKey` (`src/one-editor/js/core/command-registry.js`) nghe `keydown` ở `document` theo pha capture, rồi `preventDefault` + `stopPropagation` với mọi phím đã đăng ký (F2 = bookmarkNext). Pha capture đi từ window xuống document rồi mới tới element, nên listener ở element không nhận được phím.

**Cách xử lý đúng:** gắn `addEventListener("keydown", onKey, true)` ở `window`, kiểm `box.contains(e.target)`, và chỉ chặn phím khi thực sự xử lý. Mẫu: `src/one-editor/js/workbench/explorer-context-menu.js`.

**Kiểm ZIP tự viết trên Windows:** dùng PowerShell `Expand-Archive` / `Compress-Archive`. `tar.exe` (bsdtar) đổi tên UTF-8 sang code page ANSI nên báo lỗi với chữ "ệ". Trong Git Bash, `tar` lại là GNU tar, không đọc được ZIP.
