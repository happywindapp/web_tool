# isomorphic-git trong trình duyệt: cần Buffer, và phải dùng lại stat của index

**Triệu chứng:** One Editor quét trạng thái git qua `FileSystemDirectoryHandle` ném `ReferenceError: Buffer is not defined` (trong khi `git.hashBlob` vẫn chạy). Sau khi sửa lỗi đó, mỗi lần quét đều băm lại **mọi** file của repo.

**Nguyên nhân:**
- `index.umd.min.js` của isomorphic-git gọi `Buffer` toàn cục, mà trình duyệt không có.
- `compareStats` đòi khớp ctime/mtime tới nanosecond cùng `ino`/`uid`/`gid`. File System Access chỉ cho `size` và `lastModified` (ms), nên không file nào khớp và file nào cũng bị băm.

**Cách xử lý đúng:**
- **Buffer:** vendor bằng `scripts/vendor-one-editor-isomorphic-git.ps1`. Script bọc UMD trong `(function (Buffer) {…})(polyfill buffer@6.0.3)`, để không tạo `window.Buffer` (thư viện khác trong trang có thể đổi nhánh code khi thấy Buffer).
- **Stat:** adapter `GitHandleFs` (`src/one-editor/js/core/git-handle-fs-adapter.js`) đọc stat từng entry của index bằng `git.walk` với `STAGE()`. Khi `size` và mtime (ms) khớp, adapter trả nguyên stat đó. Đây là stat cache của git, chỉ thô hơn ở độ phân giải ms.
- **Chỉ đọc:** gọi `statusMatrix({ refresh: false })`, và adapter ném `EROFS` cho mọi lệnh ghi, nên không bao giờ ghi `.git/index`.
- **RAM:** isomorphic-git đọc cả packfile vào RAM, nên `GitStatusModel` từ chối repo có tổng pack > 300 MB.

**Kiểm:**
- Chạy `node --test src/one-editor/tests/git-status-overlay.test.js`, dựng repo tạm bằng git CLI.
- Khi so với `git status --porcelain -uall`, thêm `-c core.quotepath=off`; nếu không, tên tiếng Việt bị escape octal và gây lệch giả.
- Node mock handle coi junction Windows (`.claude/skills`) là file, cũng gây lệch giả.
