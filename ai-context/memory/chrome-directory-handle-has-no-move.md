# Chrome: FileSystemDirectoryHandle không có move() — đổi tên folder trên đĩa chưa làm được

**Triệu chứng:** headless One Editor (OPFS) gọi `ExplorerDisk.renameTo(folder, "x")` ⇒ trả `false`, status "Trình duyệt này chưa hỗ trợ đổi tên trên đĩa."; mọi bước kiểm phía sau dây chuyền fail.

**Nguyên nhân:** Chrome (2026-11) chỉ có `FileSystemFileHandle.move()`; `FileSystemDirectoryHandle.move` là `undefined`, cả trong OPFS. `LocalFs.rename` kiểm `typeof node.handle.move` nên folder bị từ chối (hành vi có chủ đích). `ExplorerOps.move` cho folder rơi xuống đường chép + `removeEntry` nên **chuyển** folder vẫn chạy.

**Cách xử lý đúng:**
- Test thao tác folder trên OPFS: dùng `ExplorerOps.copyTo([folder], dest, { cut: true })` (chuyển), không đổi tên folder.
- `ExplorerDisk.renameTo` không đẩy bước hoàn tác; muốn kiểm Ctrl+Z thì gọi `ExplorerDisk.rename(node)` và trả lời `prompt` (puppeteer `dialog.accept(tên)`).
