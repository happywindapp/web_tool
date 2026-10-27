# Prompt: Auto-fill Workspace from Codebase (Solution Architect)

> Copy → chạy sau khi đã có khung AI-Native Workspace. AI tự quét mã nguồn thật và điền nội dung vào các file `.md`.

**Role:** Solution Architect. Đọc hiểu toàn bộ mã nguồn, tài liệu cũ và memory hiện tại của dự án,
sau đó tự tổng hợp và điền nội dung vào các file `.md` trong cấu trúc AI-Native Workspace.

## QUY TẮC THỰC THI
1. TUYỆT ĐỐI KHÔNG bịa. Chỉ dùng kiến thức rút từ mã nguồn thực tế, file cấu hình, tài liệu cũ hiện có.
2. Nếu workspace KHÔNG chứa code mong đợi → DỪNG, báo cáo và xác minh nguồn dữ liệu thật trước khi điền (tránh tài liệu hoá nhầm hệ thống).
3. File nhạy cảm (credentials, secrets) → CHỈ tham chiếu/inventory, KHÔNG copy giá trị vào docs.
4. Ưu tiên Markdown rõ ràng: phân cấp tiêu đề, bullet, sơ đồ Mermaid/PlantUML khi có thể.
5. `readme.md` đã có sẵn (do team viết) → MERGE AN TOÀN: đọc trước, CHỈ bổ sung phần còn thiếu + đánh dấu mục nghi lỗi thời (`> ⚠️ cần xác minh`); TUYỆT ĐỐI KHÔNG xoá/ghi đè nội dung gốc. Repo chưa có `readme.md` → tạo mới đầy đủ.

## MỤC TIÊU CẬP NHẬT
- [ ] `{{repo}}/readme.md` (mỗi repo): tổng hợp kiến thức TOÀN BỘ repo source — mục đích, tech stack, cấu trúc thư mục, module/luồng chính, cách build/run, quy ước. Đây là điểm vào kiến thức cấp repo. **Đã có sẵn → merge giữ nội dung gốc (quy tắc 5); chưa có → tạo mới.**
- [ ] AI config (`.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`): trích rule clean code, tech stack thật (Go/Node/NestJS...), naming convention.
- [ ] `docs/business/`: hệ thống hoá luồng nghiệp vụ cốt lõi (ví dụ giao dịch, settlement, reconciliation, middleware rules...).
- [ ] `docs/architecture/`: sơ đồ hệ thống, cách microservices giao tiếp, chiến lược gộp service (kèm Mermaid).
- [ ] `docs/api-contracts/` + `docs/data-models/`: quét struct/entity/router → giao thức kết nối + schema DB.
- [ ] `ai-context/project-context.md`: elevator pitch (mục tiêu + kiến trúc high-level) làm bối cảnh chuẩn cho mọi AI.
- [ ] `ai-context/skills/`: chưng cất kiến thức domain LẶP LẠI (flow nghiệp vụ đặc thù, quy ước tích hợp, debug pattern) thành skill chuẩn mở — mỗi skill 1 folder kebab-case + `SKILL.md` (frontmatter `name` + `description` ghi rõ trigger). Không nhân bản nội dung `docs/` — skill chỉ tóm tắt + trỏ về docs.

## Quy trình gợi ý
1. Quét cấu trúc workspace + xác định đâu là source code thật (git repo, file code theo ngôn ngữ).
2. Đọc README/config/marker + memory + skill liên quan để lấy fact.
3. Điền từng file; đánh dấu rõ mục **N/A** thay vì nhồi thông tin giả.
4. Báo cáo: đã điền file nào, nguồn dữ liệu, mục nào còn trống và vì sao.
