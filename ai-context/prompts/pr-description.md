# Chuẩn PR Description

> Áp dụng cho mọi PR ở mọi service trong workspace này (mọi AI tool: Claude, Codex, Gemini, Copilot).
> Title vẫn theo conventional commit prefix (`feat:`/`fix:`/`refactor:`/...), dưới 70 ký tự.

## Fix bug

```
## Document:
## Test time:
## Root cause:
## Summary/Fix:
## Impact:
## Test plan:
```

## Feature mới

```
## Document:
## Summary:
## Impact:
## Test plan:
```

## Giải thích field

- `Document`: link ticket (Jira/Linear/GitHub issue) và/hoặc link spec liên quan trong `docs/`.
- `Test time` (chỉ ở fix bug): thời điểm + môi trường (UAT/local) + business date đã verify fix.
- `Root cause` (chỉ ở fix bug): nguyên nhân gốc, không chỉ mô tả triệu chứng.
- `Impact`: phạm vi ảnh hưởng, rủi ro regression, module/flow liên quan.
- `Test plan`: checklist các bước đã/cần verify.

Rule "KHÔNG tự `git commit`/`git push`" vẫn áp dụng — chuẩn bị PR body xong thì đưa cho user tự chạy `gh pr create`.
