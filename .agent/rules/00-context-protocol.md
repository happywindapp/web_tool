# Rule: Context Bootstrap Protocol (always-on)

> Trước khi viết/sửa BẤT KỲ dòng code nào trong workspace này, đọc theo thứ tự rồi mới code.
> Đây là single source of truth của hành vi onboard — chi tiết: `ai-context/prompts/6_onboard-read-context.md`.

## Đọc đầu tiên (bắt buộc)

1. `ai-context/project-context.md` — mục tiêu + kiến trúc + downstream targets.
2. `docs/INDEX.md` — mục lục tài liệu (**single source of truth**).
3. `docs/glossary.md` — thuật ngữ domain, viết tắt, tên riêng.

## Việc đang làm

4. `ai-context/working/sprint-current.md` — việc đang chạy.
5. `ai-context/working/issues-open.md` — vấn đề đang mở.
6. `ai-context/memory/` — bài học đã rút ra (tránh lặp lỗi cũ).

## Trước khi code trong 1 repo cụ thể

- Đọc `{{repo}}/readme.md` (kiến thức toàn bộ repo) trước khi sửa file trong repo đó.
- Task chuyên sâu → đọc có chọn lọc trong `docs/`: business/ architecture/ data-models/ api-contracts/ security/ deployment/ decisions/.

## Nguyên tắc nguồn chân lý

- Code mâu thuẫn `docs/` → **tin `docs/`**.
- Downstream target (code thật, root riêng) → dùng work-context path của project đó, KHÔNG phải `c:/_web_tool`.
