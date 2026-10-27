# Code Quality Gates — self-review · checklist backend/API · hỏi ở ngã rẽ thiết kế

> Áp dụng cho **mọi AI tool** (Claude Code, Codex, Gemini, Copilot) và mọi project dùng cấu trúc chuẩn này.
> Bản gốc cho Claude: `~/.claude/rules/code-quality-gates.md` (auto-load). Sửa luật → sửa cả 2 nơi.

**Triệu chứng:** review PR #7991 NPF_Control (Global Broker, 10/2026) ra 11 comment — lộ lỗi DB ra client, trả entity,
lọc/phân trang in-memory không scale, `*bool` dereference không kiểm nil, `update_by` toàn khoảng trắng vẫn lưu, tên tham
số lệch cột (`tier`/`client_group_type`, `update_by`/`updated_by`, `npf_clients`), migration gộp DDL + backfill, thiếu index.

**Nguyên nhân:** (1) bỏ bước self-review trước khi bàn giao; (2) chép nguyên pattern cũ của repo kể cả pattern có vấn đề;
(3) tự chọn ở ngã rẽ thiết kế (diff nhỏ vs scale, convention cũ vs chuẩn mới) thay vì hỏi; (4) đẩy từ vựng UI xuống API/DB.

## Cách xử lý đúng (bắt buộc)

### A. Self-review trước khi báo "xong"
- Build + test pass chưa phải xong. Review toàn bộ diff theo checklist B (Claude: chạy `code-reviewer` agent), sửa rồi mới báo.
- Báo cáo cuối ghi: `Self-review: N điểm — đã sửa X, còn Y (lý do)`. Không bỏ qua vì task "nhỏ".

### B. Checklist backend / API
1. Hỏi quy mô dữ liệu, ai gọi API, chuẩn API trước khi thiết kế; danh sách không giới hạn ⇒ filter + phân trang ở DB.
2. Usecase log lỗi gốc, trả lỗi đã che; không đẩy lỗi bind/validator/DB ra client.
3. Không trả ORM entity; map DTO ở lớp handler (`ToResponse`); domain không mang tag `json`; list rỗng ⇒ `[]`.
4. Tên tham số/field = tên cột/field domain; ghi/đọc cùng tên; cùng field cùng ngữ nghĩa (`null` vs `""`) ở mọi API; từ vựng UI dừng ở FE/BFF.
5. Request DTO có `Validate()`: trim + kiểm định dạng/ràng buộc chỉ cần request; handler gọi ngay sau bind. Usecase: luật cần dữ liệu/trạng thái + guard `nil` con trỏ. Trim rồi mới kiểm rỗng. Handler trả lỗi validate theo cách chung của project (NPF_Control: lỗi `Validate()` ⇒ `ctx.BadRequest(err)` — message tự viết, an toàn; lỗi bind ⇒ `"invalid request data"`; lỗi usecase ⇒ message cố định như `errors.New("export client fail")`, chi tiết chỉ log).
6. Migration: tách DDL khỏi backfill (backfill idempotent); có index cho query path mới; tránh `IN` hàng chục nghìn id (dùng JOIN/CTE).
7. Code cũ là tham khảo, không phải chuẩn — thấy pattern có vấn đề thì hỏi, không nhân bản.
8. Đổi route/param/field liên service ⇒ liệt kê bên bị ảnh hưởng + cặp/thứ tự deploy trong PR description.

### C. Ngã rẽ thiết kế ⇒ hỏi user, đưa phương án Recommended + trade-off
Convention cũ vs chuẩn mới · diff nhỏ/tái dùng vs scale · quy mô chưa rõ · breaking giữa service · nghiệp vụ chưa rõ.
Không hỏi điều đã có trong code/docs/memory hoặc có default hiển nhiên — ghi lựa chọn vào báo cáo.

### D. Review PR (của mình hoặc người khác)
1. Lấy đúng phiên bản PR (head commit, threads); review diff từ merge-base + file untracked liên quan; không in token.
2. Vệ sinh commit: nội dung khớp message; không lọt env/config chứa secret/giá trị local; file mới (migration) đã add; số migration không trùng. Lọt secret ⇒ blocker đầu tiên.
3. Áp checklist B; đổi status code/dạng response ⇒ kiểm bên gọi còn đọc đúng.
4. Tách lỗi PR tạo ra vs pattern có sẵn (pre-existing ⇒ tech-debt, không bắt sửa trong PR).
5. Verify từng finding trên code (kể cả của agent): `file:line` + kịch bản lỗi cụ thể.
6. YAGNI: không đề xuất kiểm tra phòng thủ cho đường không có caller thực / hậu quả vô hại.
7. Báo cáo: blocker → bảng theo mức độ → "đã ổn" → câu hỏi cần chốt. Review ≠ sửa: chỉ sửa sau khi user chốt.
