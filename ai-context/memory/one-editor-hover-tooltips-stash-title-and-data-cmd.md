# One Editor: tooltip `HoverTips` cất `title` khi hover · phím lấy từ `data-cmd`

**Triệu chứng có thể gặp**
- Code đọc `button.title` của nút trên header / toolbar / view bar / activity bar / tab bar / status bar trả về `""` (vd aria-label của icon activity mất chữ khi badge Problems cập nhật lúc đang rê chuột).
- Tooltip của nút không bao giờ hiện dù hover đúng chỗ.
- Phím tắt trong tooltip không khớp phím thật.

**Nguyên nhân**
- `HoverTips` (`src/one-editor/js/workbench/hover-tooltips-with-shortcuts.js`) gỡ `title` khi hover / focus (cất ở `data-tip-title`) để tooltip gốc của trình duyệt không chồng lên, rời chuột thì trả lại.
- Sự kiện `scroll` ở bất kỳ đâu (editor, thanh tab cuộn mượt sau khi đổi layout) từng đóng tooltip trước khi nó kịp hiện; con trỏ đứng yên nên không có `pointerover` mới.
- Phím viết tay trong title (`"(Ctrl+K V)"`) dễ lệch khi đổi phím.

**Cách xử lý đúng**
- Đọc title của nút trên các thanh: `b.title || b.dataset.tipTitle` (đã áp ở `SidePanels.label`).
- Chỉ đóng tooltip khi vùng đang cuộn **chứa** nút (`e.target.contains(cur)`) hoặc cả trang.
- Nút mới có lệnh: gắn `data-cmd="<commandId> …"` — tooltip đọc phím từ `Commands.keysOf` / `Commands.find`, tự bỏ cụm "(phím)" trùng trong title. Nút không có lệnh (phím CodeMirror như Ctrl+Z): để phím trong cụm ngoặc riêng "(Ctrl+Z)" ⇒ thành chip.
- Kiểm: script headless hover lần lượt mọi control có `title` trong các thanh, chờ > 450 ms cho lần đầu, đếm control không có tooltip.
