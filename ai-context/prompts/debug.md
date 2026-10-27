# Prompt: Debug Bug phức tạp

> Copy → điền biến `{{...}}` → chạy.

## Context
- Service: `{{repo}}` → đọc `{{repo}}/readme.md` (kiến thức toàn bộ repo) để khoanh vùng.
- Triệu chứng: `{{mô tả lỗi + khi nào xảy ra}}`
- Log / stack trace:
  ```
  {{dán log}}
  ```
- Đã thử: `{{...}}`

## Cách tiếp cận (root cause trước, fix sau)
1. Tái hiện lỗi ổn định.
2. Khoanh vùng: layer nào (FE / API / service / DB / queue)?
3. Truy nguyên nhân gốc, không vá triệu chứng.
4. Đề xuất fix + regression test.

## Tham khảo
- Bài học cũ: `ai-context/memory/`
- Kiến trúc luồng: `docs/architecture/`, `docs/diagrams/`

## Output
- Root cause + fix + cách verify. Ghi bài học vào `ai-context/memory/`.
