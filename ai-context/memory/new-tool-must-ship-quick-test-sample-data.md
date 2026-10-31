# Tool mới / sửa tool: luôn có dữ liệu mẫu để người dùng test nhanh

**Triệu chứng:** mở tool lần đầu chỉ thấy ô trống — người dùng phải tự tìm input mới biết tool làm được gì;
tính năng tự sửa/báo lỗi không ai thấy vì input của họ hợp lệ; test tự động phải tự soạn dữ liệu.

**Nguyên nhân:** chỉ làm chức năng, quên bộ mẫu; hoặc có mẫu nhưng chỉ ca "đẹp", thiếu ca lỗi.

**Cách làm đúng (bắt buộc mọi AI, mọi tool):**

- Theo checklist **"Dữ liệu mẫu để test nhanh"** ở `docs/architecture/README.md` mục 3 (nguồn chân lý).
- Dropdown `Thử mẫu…` trong toolbar: chọn là nạp + chạy luôn; tool nhiều tab ⇒ mỗi tab 1 dropdown.
- URL `?demo=<key>` nạp + chạy (link thử nhanh, test tự động); xoá `demo` khỏi URL sau khi nạp.
- ≥ 1 mẫu hợp lệ + ≥ 1 mẫu lỗi/ca khó; mỗi chế độ chính 1 mẫu; dữ liệu giả, nhỏ, gom trong 1 hằng `DEMOS`/`SAMPLES`.
- Tên mẫu dịch VI/EN, **nội dung mẫu viết bằng English** (cố định); nạp mẫu không âm thầm làm mất nháp; ghi key `?demo=` vào `docs/tools/<tool>.md`.
- Tham khảo: Data Workbench `src/data-workbench/js/tabs/demo-samples.js`; Diagram Editor `src/diagram-editor/js/samples/`.
