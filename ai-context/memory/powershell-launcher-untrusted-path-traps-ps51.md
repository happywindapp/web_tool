# PowerShell 5.1 launcher nhận đường dẫn không tin cậy — các bẫy

Bối cảnh: launcher `oneeditor-open:` của One Editor (ADR #25, `src/one-editor/js/workbench/open-with-windows-protocol-setup.js`). Mọi trang web đều gọi được protocol này, nên path là input không tin cậy. Đo ngày 2026-11-23.

**Triệu chứng → Nguyên nhân → Cách xử lý đúng**

- Folder `a[1]` báo `DirectoryNotFoundException` → `Start-Process -WorkingDirectory` coi `[ ]` là wildcard → truyền `[Management.Automation.WildcardPattern]::Escape($cwd)`.
- `Split-Path -LiteralPath $p -Parent` báo "Parameter set cannot be resolved" → trên 5.1 không có tổ hợp tham số này → dùng `[IO.Path]::GetDirectoryName($p)`.
- `C:\…\evil.exe\..` vượt qua regex, `Test-Path` coi là folder → chuỗi chưa được chuẩn hoá → gọi `[IO.Path]::GetFullPath` trước khi kiểm. Hàm này ném lỗi với `::$DATA`; sau đó chặn thêm dấu `:` ở sau vị trí 2 (alternate data stream).
- Path UNC `\\host\share` → `Test-Path` khiến Windows gửi NTLM tới máy lạ → chỉ nhận `^[A-Za-z]:\\`.
- Chuỗi có tự thêm dấu nháy (`/select,"…"`, `"--cd=…."`) → `"` trong path phá nháy → chặn `"`. Thư mục truyền qua working directory chứ không qua argv. Gốc ổ `C:\` mà đặt trong nháy thì `\"` thành nháy bị escape ⇒ để gốc ổ không nháy, còn Git Bash thì thêm `.` vào cuối (`"--cd=C:\."`).
- `-DryRun` chỉ in lệnh nên **không phủ được lỗi của `Start-Process`** → chạy thật 1 lần với lệnh vô hại: `cmd /c cd > cwd.txt` rồi đọc lại file.
