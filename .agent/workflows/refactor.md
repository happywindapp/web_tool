# Workflow: Refactor

Wrapper Antigravity của prompt chuẩn. Nội dung sống ở `ai-context/prompts/refactor.md` (DRY — sửa ở đó).

## Steps

1. Áp dụng `.agent/rules/00-context-protocol.md` + `.agent/rules/20-clean-code.md`.
2. Mở `ai-context/prompts/refactor.md`, điền biến `{{...}}`.
3. Giữ behavior bất biến (test trước/sau). Diff hẹp, không đổi public contract trừ khi được yêu cầu.
