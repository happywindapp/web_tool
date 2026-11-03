# Mọi tool phải dùng tốt cả Desktop và Mobile

**Luật:** thêm hoặc sửa tool phải làm đủ checklist "Dùng tốt trên cả Desktop và Mobile" ở `docs/architecture/README.md` mục 3 (ADR #12): đạt 4 dải kích thước (>900 · 641–900 · ≤640 · màn thấp cảm ứng), thao tác chuột/phím/chạm ngang nhau, kiểm ma trận kích thước trước khi báo xong. CSS/JS chung: `src/data-workbench/styles/phone-portrait-layout.css` + `js/core/phone-pane-switcher.js`.

**Why:** lần làm mobile đầu tiên (2026-11-02) chỉ kiểm điện thoại dọc nên gây 2 regression trên desktop mà chỉ reviewer bắt được: pane co về gần 0 ở cửa sổ 641–900px, và bảng CSV vỡ ở cửa sổ desktop thấp 1200×480.

**How to apply:** viết rule trong đúng media query của dải; sửa CSS chung thì kiểm lại mọi tool; báo cáo ghi rõ chưa kiểm trên máy iOS/Android thật.

## Bẫy khi kiểm tra

- **Triệu chứng:** đo `scrollWidth` thấy bằng `innerWidth`, tưởng không tràn, nhưng trên điện thoại giao diện vẫn bị cắt phải.
- **Nguyên nhân:** layout tràn làm trình duyệt mobile tự nới layout viewport (390 thành 802). Hai số vẫn bằng nhau.
- **Cách đúng:** giả lập `isMobile + hasTouch`, so `innerWidth` với chiều rộng viewport đã đặt. Thủ phạm hay gặp: `grid-template-columns:1fr` (là `minmax(auto, 1fr)`) và `<select>` rộng theo option dài nhất.
- Kiểm desktop **không** bật `isMobile`: cửa sổ hẹp (800×700) và thấp (1200×480) là nơi regression hay nấp.

## Bẫy khi viết CSS

- Grid có track dành cho phần tử bị `display:none` (`#split`): phần tử sau rơi vào track đó. Preview của Diagram Editor từng cao 2px dưới 900px vì lý do này.
- `position:sticky; left:N` trong scroller có padding: Chrome tính từ mép trong của padding, nên dùng `left:0`.
- Đổi `Nvh` thành `minmax(0, 1fr)` thì pane có thể co về 0 khi toolbar wrap nhiều dòng: phải có sàn (`minmax(280px, 1fr)`) + cuộn trong.
- Rule cho màn thấp (`max-height:500px`) phải kèm `pointer:coarse`, nếu không sẽ đụng cửa sổ desktop thấp.
- Ẩn pane bằng `display:none` làm hỏng `focus()` và đo kích thước, nên dùng carousel `scroll-snap`.
- Hover trên màn cảm ứng bị "dính" sau khi chạm: đặt hiệu ứng hover trong `@media (hover:hover)`.
