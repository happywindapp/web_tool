# Workflow: Review Code / PR

Wrapper Antigravity của prompt chuẩn. Nội dung sống ở `ai-context/prompts/review.md` (DRY — sửa ở đó).

## Steps

1. Áp dụng `.agent/rules/00-context-protocol.md`; đọc `{{repo}}/readme.md` + spec/ADR liên quan.
2. Mở `ai-context/prompts/review.md`, điền biến `{{...}}`.
3. Review theo: Correctness · Security (`docs/security/`) · Contract (`docs/api-contracts/`) · Quality · Tests.
4. Output: issue theo mức độ (blocker/major/minor/nit) + đề xuất sửa kèm `file:line`.
