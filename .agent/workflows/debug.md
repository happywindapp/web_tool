# Workflow: Debug

Wrapper Antigravity của prompt chuẩn. Nội dung sống ở `ai-context/prompts/debug.md` (DRY — sửa ở đó).

## Steps

1. Áp dụng `.agent/rules/00-context-protocol.md` (đọc context + `{{repo}}/readme.md`).
2. Mở `ai-context/prompts/debug.md`, điền biến `{{...}}`.
3. Reproduce → root cause → fix tối thiểu → test lại. DB READ-ONLY khi điều tra.
