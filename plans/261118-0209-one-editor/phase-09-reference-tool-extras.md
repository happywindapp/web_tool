# Phase 9 — Tính năng từ tool tham khảo khác (CyberChef, regex101, CodePen, crontab.guru…)

## Context Links
- [plan.md](plan.md) · [research tool tham khảo](../reports/research-261118-0312-reference-tools-feature-survey.md)
- Dùng lại: `OutputLink`, `CommandRegistry`, iframe sandbox phase 3, MIME/hash phase 2, convert-engine data-workbench, macro phase 2

## Overview
- Priority: P3 · Status: ⬜ **user chốt làm toàn bộ C1 (2026-11-18)** · Cỡ: M–L
- Chỉ tầng C1 của research; C2 = backlog, C3 = không làm (ghi trong research).

## Key Insights
- Recipe kiểu CyberChef = mảng `{op, options}` chạy tuần tự; mỗi op là hàm thuần đã có ở phase 2/8 (Base64, URL, gzip qua `DecompressionStream`, JSON format…) ⇒ chủ yếu là UI ghép + lưu/chia sẻ recipe (link `#pako:`).
- Chạy HTML/JS dùng đúng file `tools/one-editor-preview-sandbox.html` (origin `null`, CSP riêng) ⇒ không thêm rủi ro cho trang chính; console bắt qua `postMessage`.
- Xuất code thành ảnh: dựng SVG từ token highlight CM6 (không chụp DOM) ⇒ không cần thư viện, xuất PNG bằng canvas (giống `svg-png-exporter` của Diagram Editor).
- Regex tester dùng engine `RegExp` của trình duyệt — đúng cú pháp JS; ghi rõ khác biệt với .NET/Go/Java.

## Requirements
- **Recipe**: danh sách op kéo-thả/thêm-xoá, chạy live, lỗi từng bước; lưu recipe (IndexedDB), chia sẻ qua link; demo `recipe-base64-gzip-json`.
- **Regex tester**: ô pattern + flags, tô match trong nguồn, bảng nhóm bắt (số + tên), xem trước replace, giải thích token cơ bản; demo `regex`.
- **Chạy HTML/CSS/JS**: nút ▶ cho file `.html/.js`, kết quả + console (log/warn/error, lỗi có số dòng) ở view kia; timeout chống vòng lặp vô hạn (reload iframe).
- **Cron**: nhận 5/6 trường (Unix + Quartz), giải thích VI/EN, 10 lần chạy kế tiếp theo giờ local; demo `cron`.
- **SQL từ dữ liệu**: CSV/JSON → `INSERT` (gộp lô N dòng), `UPDATE … WHERE key`, dialect T-SQL/PostgreSQL, escape đúng; JSON → JSON Schema (draft 2020-12).
- **Batch replace**: bảng nhiều cặp (regex/chuỗi, bật/tắt từng dòng), chạy trên tab hoặc vùng chọn, lưu bộ; mọi thay đổi ghi số lần thay.
- **Unicode inspector**: status bar hiện `U+XXXX` dưới con trỏ; lệnh "Tìm ký tự vô hình" liệt kê zero-width/NBSP/SOH/BOM/ký tự điều khiển + nút xoá/đổi.
- **Bảng Markdown**: dán TSV từ Excel ⇒ bảng Markdown; lệnh format/căn bảng; sinh TOC từ heading.
- **Code → ảnh**: chọn theme, nền, khung cửa sổ, số dòng, padding; tải PNG/SVG, chép ảnh vào clipboard.

## Architecture
```
js/extras/ transform-recipe-runner.js, transform-recipe-ops.js, regex-tester-output.js, html-js-run-console.js,
           cron-expression-explain.js, data-to-sql-statements.js, json-to-json-schema.js, batch-replace-rules.js,
           unicode-invisible-inspector.js, markdown-table-tools.js, code-snippet-to-image.js
```

## Implementation Steps
1. Module thuần trước (cron, SQL, JSON Schema, batch replace, unicode, bảng Markdown) + test node.
2. Recipe runner + UI.
3. Regex tester, chạy HTML/JS (cần phase 3 sandbox).
4. Code → ảnh.
5. Demo + VI/EN + mobile.

## Todo List
- [x] User chốt danh sách C1 (làm hết)
- [ ] Module thuần + test node
- [ ] Recipe
- [ ] Regex tester
- [ ] Chạy HTML/CSS/JS + console
- [ ] Code → ảnh
- [ ] Demo + VI/EN + mobile

## Success Criteria
- Mỗi tính năng có demo 1 cú bấm; không request mạng; test node pass.

## Risk Assessment
- JS chạy vòng lặp vô hạn ⇒ timeout + reload iframe sandbox.
- Recipe gzip lớn ⇒ giới hạn kích thước, chạy theo stream.

## Security Considerations
- Code người dùng chỉ chạy trong iframe sandbox origin `null`, không bao giờ ở trang chính.
- SQL sinh ra chỉ là text để user tự chạy (tool không kết nối DB).

## Next Steps
- Sau v1 (phase 6); C2 xem lại khi có nhu cầu.
