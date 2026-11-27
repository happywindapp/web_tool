# One Editor: status của op bị ghi đè · file OPFS rỗng khi chưa close · bench trong `vm` chậm

**Triệu chứng**
1. Op ▶ gọi `StatusBar.msg(..., "warn")` trong `run()` nhưng status bar vẫn xanh "✔ {op} → View 2".
2. Headless chờ file OPFS xuất hiện rồi đọc byte ⇒ rỗng / thiếu, test chập chờn.
3. Đo tốc độ hàm thuần (SHA-512) trong khuôn test `vm.createContext` ra 8 MB/s, ngoài `vm` 75 MB/s.

**Nguyên nhân**
1. `OutputLink.report()` chạy sau `run()` và luôn ghi status mới.
2. `getFileHandle(name, { create: true })` tạo file rỗng ngay; `createWritable()` ghi vào file swap tới lúc `close()`.
3. Trong `vm`, tra global (`Math`) qua proxy của context — vòng nóng chậm ~10×.

**Cách xử lý đúng**
1. Trả `{ text, notes, tone: "warn" }` từ `run()` (`report` dùng `r.tone`, có từ phase 14f). Lỗi / Dừng vẫn throw `{ warn }` / `{ stopped }`.
2. Test chờ đúng `size` hoặc chờ UI báo xong (dialog đóng / status), không chờ "file tồn tại".
3. Đo bằng `new Function(src)()` ngoài `vm`; vòng nóng dùng `(x / C) | 0` thay `Math.floor`.
