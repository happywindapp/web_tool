# One Editor: drop của tab editor do FileDrop giữ (capture phase)

**Triệu chứng:** thêm `addEventListener("drop")` trên `#explorer` (hoặc phần tử khác) để nhận tab editor kéo vào — handler không bao giờ chạy, không lỗi.

**Nguyên nhân:** `FileDrop` (`src/one-editor/js/workbench/file-drop-zone.js`) nghe `dragover` / `drop` ở **document, capture phase** và gọi `stopPropagation` cho kéo tab (`TabStrip.TAB_TYPE`) lẫn file từ OS. `ExplorerDnd` (`explorer-drag-drop-move-copy.js`) cũng capture + `stopImmediatePropagation` cho dòng cây / tab folder. Event không tới được listener bubble.

**Cách xử lý đúng:** vùng thả mới ⇒ thêm nhánh vào chính 2 module đó (hỏi module đích trước khi xử lý mặc định), như group Explorer: `Groups.dropSec(target)` → `FileDrop` gọi `Groups.dropDoc`, `ExplorerDnd` gọi `Groups.dropNodes`. Test headless: `new DataTransfer()` + dispatch `dragstart` (trên `.tab` / dòng cây) → `dragover` → `drop` trên vùng đích.
