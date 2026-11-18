# Phase 6 — Hoàn thiện, docs, kiểm, phát hành

## Context Links
- [plan.md](plan.md) · `docs/architecture/README.md` mục 3 · `CLAUDE.md` (3 chỗ khi thêm tool)

## Overview
- Priority: P1 · Status: ⬜ · Cỡ: M

## Requirements
- Find in files: tìm/thay regex trên mọi tab + folder local đang mở (quét theo lô, không khoá UI), kết quả nhảy tới dòng.
- Export: tải `.txt`/giữ đuôi gốc, in (print CSS), copy as HTML có màu.
- Docs: `docs/tools/one-editor.md` (Contract `?demo=`, link chia sẻ, mục `## Điện thoại`, cloud), card `index.html` (VI/EN), bảng Tools `README.md`, `ai-context/project-context.md`, dòng tool trong `CLAUDE.md`, ADR #19/#20 cập nhật kết quả thật.
- GoatCounter beacon trước `</head>` + CSP.

## Ngân sách hiệu năng (performance budget — kiểm headless trước khi báo xong)
| Hạng mục | Ngưỡng |
|---|---|
| `tools/one-editor.html` | ≤ 700 KB raw / ≤ 200 KB gzip (mốc: crypto board 836 / 266 KB) |
| Tải lần đầu (HTML + `codemirror-core`) | ≤ 1,3 MB raw / ≤ 400 KB gzip; editor gõ được < 1,5 s trên laptop văn phòng |
| Nạp lười (chỉ khi cần) | gói ngôn ngữ 1,2 MB · Prettier 81 KB + plugin theo ngôn ngữ · sql-formatter 312 KB · Mermaid 5,4 MB / D2 8 MB (chỉ khi mở preview loại đó) · Vim/Emmet/turndown khi bật |
| Chạy | gõ/cuộn ≤ 1 frame với file ≤ 50 MB; tác vụ nặng (find in files, lint, format file lớn) chạy theo lô (`scheduler.yield`/`setTimeout`) có tiến độ + nút dừng |
| Bộ nhớ | 1 `EditorView` mỗi view, tab không hiện chỉ giữ `EditorState`; iframe preview chỉ tạo khi mở preview |

## Implementation Steps
1. Find in files + export.
2. Build `pwsh scripts/build-single-file-tool.ps1 -Tool one-editor` + `-Check`; `node --test src/one-editor/tests/`.
3. Kiểm headless ma trận desktop + mobile (ADR #12), theme sáng/tối, đoạn console kiểm song ngữ ra rỗng.
4. Kiểm tay cloud trên GitHub Pages.
5. Self-review (agent `code-reviewer` + `silent-failure-hunter` cho phần cloud) ⇒ sửa ⇒ báo `Self-review: N điểm`.
6. Đưa user lệnh commit/push (không tự commit).

## Todo List
- [ ] Find in files
- [ ] Export / print
- [ ] Docs 3 chỗ + project-context + CLAUDE.md + ADR
- [ ] Build + test + ma trận headless
- [ ] Kiểm cloud thật
- [ ] Self-review

## Success Criteria
- Đạt mọi checklist mục 3; test node pass; không lỗi console; cloud chạy trên GitHub Pages.

## Risk Assessment
- Find in files folder lớn chậm ⇒ giới hạn kích thước file quét, bỏ qua file nhị phân, có nút dừng.

## Security Considerations
- Rà CSP lần cuối: chỉ đúng domain cần thiết; trang chính không `unsafe-eval` (chỉ iframe preview sandbox được có).

## Next Steps
- Backlog sau v1: snippets, nhiều cửa sổ split > 2, đồng bộ cài đặt qua Drive appData.
