# Bài thi/ôn tập: card nằm ở `study.html`, không vào `index.html`

**Triệu chứng:** thêm bài thi mới theo luật "thêm tool ⇒ card trong `index.html`" làm lẫn tài liệu học vào trang bộ công cụ; hoặc dựng đề mới làm lại từ đầu, lặp lỗi cũ.

**Nguyên nhân:** `study/*.html` là bài thi trắc nghiệm, không phải tool trong `tools/`; user muốn tách riêng.

**Cách xử lý đúng:**
- Bài thi đặt ở `study/<MA_DE>.html`, card thêm vào `study.html` (root); không sửa `index.html`.
- Dựng đề mới: chép `study/CBTTCK.html` và làm đúng **playbook [`docs/study/README.md`](../../docs/study/README.md)** (đổi `KEY`/`HKEY` riêng từng đề, schema `BANK`, `fixed`, quy trình soạn từ PDF, UI đã chốt, kiểm thử).
- Kiểm đề: `node scripts/validate-study-quiz-bank.js study/<MA_DE>.html`; trích PDF: `python -I scripts/extract-pdf-text-bold-or-images-for-quiz.py`.
- Bẫy đã gặp: subagent tính sai câu tính toán ⇒ tự tính lại; file đáp án chính thức có thể sai (CBTTCK Câu 29) ⇒ sửa + ghi `explain` + báo user; hover CSS "kẹt" trên mobile ⇒ hover chỉ trong `@media (hover:hover)`; user không muốn nút nền trắng.
- Bài thi chỉ tiếng Việt, chưa áp luật tool (VI/EN, share link, Thử mẫu) — hỏi user trước nếu muốn áp.
