# Prompt: Implement Feature

> Copy → điền biến `{{...}}` → chạy.

## Context
- Đọc trước: `ai-context/project-context.md`, `docs/INDEX.md`.
- Service liên quan: `{{repo}}` → đọc `{{repo}}/readme.md` (kiến thức toàn bộ repo) trước khi code.
- Business rules: `docs/business/{{...}}`
- API contract: `docs/api-contracts/{{...}}`

## Yêu cầu
Implement feature: **{{tên feature}}**

{{mô tả chi tiết + acceptance criteria}}

## Ràng buộc
- Tuân thủ YAGNI · KISS · DRY và conventions trong `.github/copilot-instructions.md`.
- Cập nhật `docs/` nếu thay đổi contract / data model.
- Viết test cho luồng chính + edge cases.

## Output
- Code thay đổi (diff hẹp, đúng việc).
- Ghi bài học mới vào `ai-context/memory/` nếu có.
