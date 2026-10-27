# Prompt: Review Code / PR

> Copy → điền biến `{{...}}` → chạy.

## Context
- PR / nhánh: `{{...}}`
- Service: `{{repo}}` → đọc `{{repo}}/readme.md` (kiến thức toàn bộ repo) để có bối cảnh.
- Spec gốc: `docs/business/{{...}}` · ADR: `docs/decisions/{{...}}`

## Phạm vi review
- **Correctness:** logic đúng business rules chưa? Edge cases?
- **Security:** theo `docs/security/` (validation, authz, rate limit...).
- **Contract:** có phá vỡ `docs/api-contracts/` không? Backward compatible?
- **Quality:** YAGNI/KISS/DRY, naming, file < ~200 dòng, comment hợp lý.
- **Tests:** đủ coverage luồng chính + lỗi.

## Output
- Danh sách issue theo mức độ (blocker / major / minor / nit).
- Đề xuất sửa cụ thể, kèm `file:line`.
