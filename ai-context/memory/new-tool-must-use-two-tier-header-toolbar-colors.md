# Tool mới / sửa tool: hai tầng màu header teal + toolbar tint

**Triệu chứng:** header và toolbar cùng nền, tab và nút cùng kiểu trắng viền xám ⇒ người dùng không phân biệt được "chuyển màn hình" với "thực hiện lệnh".

**Nguyên nhân:** mọi control dùng chung `--btn`/`--line`, và mọi vùng dùng chung `--panel`.

**Cách làm đúng (bắt buộc mọi AI, mọi tool):**

- Theo mục **"Hai tầng màu header/toolbar"** ở `docs/architecture/README.md` mục 3 (nguồn chân lý) + ADR #10.
- Header `#164e63`: Trang chủ, tên tool, chia sẻ, lưu, giao diện, `VI | EN`, tab nếu có. Toolbar tint: mở file, mẫu, tuỳ chọn, nút chính `button.main`.
- Tool build từ `src/`: `@include ../data-workbench/styles/app-bar-tabs-toolbar-surfaces.css` ngay sau `base.css`. Tool 1 file: chép rule trong doc.
- Override biến CSS tại `header`/`.toolbar`, không viết màu từng nút. Popover/dialog gắn vào `body`, không đặt trong 2 vùng này.

**Bẫy đã gặp:**

- `base.css` dùng chung cho nhiều tool: sửa ở đó là lan sang tool khác. Trước khi sửa CSS chung, grep `@include` xem tool nào dùng.
- Nền tint làm `.muted` tụt 4.14:1, dưới AA ⇒ giữ override `--muted` ở toolbar.
- Header tối thì `.good/.bad/.warn` mặc định không đọc được ⇒ cần biến override nếu header có thông báo.
- `order` trong flex làm phím Tab lệch thứ tự nhìn ⇒ đặt tab cuối header ngay trong DOM.
- Cờ Chrome `--force-dark-mode` tự đảo màu nên ảnh sai ⇒ đổi theme bằng dropdown Giao diện qua CDP.

**Tham khảo:** Data Workbench (có tab), FIX Parser (dùng file chung, không tab), Mermaid (viết tay).
