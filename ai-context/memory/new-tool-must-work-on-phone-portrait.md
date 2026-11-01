# Mọi tool phải dùng được trên điện thoại dọc

**Luật:** thêm hoặc sửa tool phải làm đủ checklist "Dùng được trên điện thoại dọc" ở `docs/architecture/README.md` mục 3 (ADR #12). CSS/JS chung: `src/data-workbench/styles/phone-portrait-layout.css` + `js/core/phone-pane-switcher.js`.

## Bẫy khi kiểm tra

- **Triệu chứng:** đo `scrollWidth` thấy bằng `innerWidth`, tưởng không tràn, nhưng trên điện thoại giao diện vẫn bị cắt phải.
- **Nguyên nhân:** layout tràn làm trình duyệt mobile tự nới layout viewport (390 thành 802). Hai số vẫn bằng nhau.
- **Cách đúng:** giả lập `isMobile + hasTouch`, so `innerWidth` với chiều rộng viewport đã đặt. Thủ phạm hay gặp: `grid-template-columns:1fr` (là `minmax(auto, 1fr)`) và `<select>` rộng theo option dài nhất.

## Bẫy khi viết CSS

- Grid có track dành cho phần tử bị `display:none` (`#split`): phần tử sau rơi vào track đó. Preview của Diagram Editor từng cao 2px dưới 900px vì lý do này.
- `position:sticky; left:N` trong scroller có padding: Chrome tính từ mép trong của padding, nên dùng `left:0`.
- Đổi `Nvh` thành `minmax(0, 1fr)` thì pane có thể co về 0 khi toolbar wrap nhiều dòng: phải có sàn (`minmax(280px, 1fr)`) + cuộn trong. Rule cho màn thấp thêm `pointer:coarse` để không đụng cửa sổ desktop thấp.
- Ẩn pane bằng `display:none` làm hỏng `focus()` và đo kích thước, nên dùng carousel `scroll-snap`.
