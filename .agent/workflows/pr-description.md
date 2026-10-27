# Workflow: PR Description

Wrapper Antigravity của prompt chuẩn. Nội dung sống ở `ai-context/prompts/pr-description.md` (DRY — sửa ở đó).

## Steps

1. Mở `ai-context/prompts/pr-description.md`, chọn template đúng loại: fix bug hay feature mới.
2. Điền field theo diff thực tế (Document, Root cause nếu là fix bug, Impact, Test plan).
3. Title theo conventional commit prefix, dưới 70 ký tự.
4. KHÔNG tự chạy `gh pr create` — đưa PR body cho user tự tạo (`.agent/rules/10-guardrails.md`).
