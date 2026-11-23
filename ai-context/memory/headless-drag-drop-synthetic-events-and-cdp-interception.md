# Headless: kiểm kéo-thả HTML5 (DragEvent giả + CDP drag interception) và tar.exe của Windows

**Triệu chứng (2026-11-23, One Editor 11d):**
- `DragEvent` dựng tay với `new DataTransfer()`: handler đặt `dropEffect = "move"` nhưng test đọc lại luôn ra `"none"`.
- Sau `page.setDragInterception(true)` + `page.mouse.drag(...)`, mọi phím (Ctrl+Z…) bị nuốt, test sau đó fail.
- Test interop tar: `tar.exe` của Windows báo `Archive entry has empty or unreadable filename` với tên tiếng Việt.

**Nguyên nhân:**
- `DataTransfer` dựng tay nằm ngoài một phiên kéo thật ⇒ `dropEffect` không giữ giá trị. `defaultPrevented` của `dragover` thì đúng.
- Drag bị intercept vẫn là một phiên kéo đang mở trong Chrome tới khi có `drop` / `dragCancel`.
- `tar.exe` (bsdtar 3.8) trên Windows không chuyển được tên UTF-8 có dấu tiếng Việt, kể cả archive do chính nó tạo (tạo bằng tên có dấu thì segfault). GNU tar (Git) đọc / giải đúng.

**Cách xử lý đúng:**
- Kiểm kéo-thả giả: `pointerdown` (pointerType `mouse`) → `dragstart` → `dragover` (đọc `defaultPrevented` + class tô sáng) → `drop` → `dragend`; kiểm **kết quả trên đĩa** (OPFS) thay vì `dropEffect`. Chờ phần tử ngay trong `page.evaluate` rồi bắn sự kiện cùng nhịp — danh sách đọc lại sau mỗi lần ghi sẽ thay dòng.
- Cần chứng minh nút `draggable` kéo được thật: `setDragInterception(true)` + `mouse.drag` (đọc `data.items[].mimeType`) rồi **luôn** `mouse.drop` lên đích không nhận thả (vd chính dòng nguồn) để đóng phiên kéo.
- Kiểm ghi đĩa: chờ mục **ghi sau cùng** (thứ tự entry trong archive), không chờ mục đầu.
- Interop tar: bsdtar với tên ASCII (tên dài > 100 ký tự qua PAX vẫn được), GNU tar với tên tiếng Việt; chạy bằng đường dẫn tương đối + `cwd` (GNU tar hiểu `C:...` là `host:file`), `LC_ALL=C.UTF-8` khi đọc danh sách `tar -t`.
