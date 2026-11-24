# CM6 bookmark theo dòng: chèn ở đầu dòng làm mark dính dòng mới

**Triệu chứng:** One Editor — đặt bookmark (Ctrl+F2) ở dòng 1 rồi chèn `"x\ny\n"` ngay đầu dòng đó ⇒ bookmark nằm ở dòng `x` mới chèn, không đi theo nội dung gốc (Notepad++ / VS Code đi theo nội dung). Đọc lại file từ đĩa (thay cả text) ⇒ mọi bookmark dồn về đầu / cuối file.

**Nguyên nhân:** `Decoration.line` map qua `set.map(tr.changes)` giữ vị trí khi chèn đúng tại vị trí đó (bias trái). Thay toàn bộ text là 1 change phủ cả doc ⇒ mọi vị trí map về 2 mép.

**Cách xử lý đúng (`src/one-editor/js/editor/bookmarks.js`):**
- Duyệt set, `tr.changes.mapPos(from, 1)` → `doc.lineAt(...).number`, dựng lại set (bỏ trùng). Change duy nhất phủ cả doc cũ ⇒ giữ theo **số dòng** (dòng vượt cuối bị bỏ).
- Lưu bền: số dòng ở `doc.marks` (hot exit) + cờ `doc.marksLive` (state hiện có mark thật). State rỗng của file stale sau F5 / placeholder ghi chú đang khoá không áp marks, nếu không sẽ cắt mất mark ngoài dòng 1.
- Mọi chỗ `Object.assign(doc, { state: null, … })` (đổi bảng mã, khoá / mở khoá ghi chú) phải chụp `marks: Bookmarks.linesOf(doc)` trong cùng object (đánh giá trước khi gán).
