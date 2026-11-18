# Phase 8 — Tính năng mở rộng: Log + FIX · Dữ liệu · Công cụ dev · Thao tác editor

## Context Links
- [plan.md](plan.md) · user chọn cả 4 nhóm A1–A4 (2026-11-18)
- Dùng lại: từ điển `src/fix-message-parser/`, tree + `csv-grid-tab` + parser tolerant của `src/data-workbench/`, `src/diagram-editor/js/core/version-history.js`, `SavedSessions` (data-workbench core)

## Overview
- Priority: P2 · Status: ⬜ · Cỡ: L (chia 8a–8d theo nhóm, làm độc lập, cần phase 1 xong)
- Phần lớn đi qua `OutputLink` (kết quả ở view kia) và `CommandRegistry` (Palette + phím + menu chạm).

## Key Insights
- XPath có sẵn trong trình duyệt (`DOMParser` + `document.evaluate`) ⇒ không cần thư viện. JSONPath: tự viết tập con (`$.a.b[*]`, `..`, `[?(@.x==1)]` so sánh đơn giản) — tránh thư viện dùng `eval` cho filter.
- "Theo dõi file" chỉ có với `FileSystemFileHandle` (Chrome/Edge): đọc lại `getFile()` theo chu kỳ, so `lastModified`/`size`, chỉ nối phần mới khi file chỉ tăng.
- Vim mode: `@replit/codemirror-vim` (MIT); Emmet: `@emmetio/codemirror6-plugin` (MIT) — vendor nạp lười qua `scripts/vendor-one-editor-libraries.ps1` (ADR #21), shim dùng chung core CM.
- Mã hoá link/ghi chú: WebCrypto PBKDF2 (≥ 310k vòng) + AES-GCM, mật khẩu không bao giờ nằm trong link.

## Requirements
**8a — Log + FIX (A1)**
- Ngôn ngữ "Log": tô ERROR/WARN/INFO/DEBUG, timestamp, UUID, IP, số; tự nhận diện `.log` + nội dung.
- Lọc dòng: regex/chuỗi, giữ/loại, kèm N dòng ngữ cảnh ⇒ tab output ở view kia, bấm dòng nhảy về nguồn.
- Theo dõi file (tail -f): bật/tắt, tự cuộn cuối, tạm dừng khi user cuộn lên.
- FIX: tô màu `tag=value` theo nhóm (header/body/trailer), hover tag ⇒ tên tag + nghĩa giá trị enum (từ điển FIX Parser), nút "Mở trong FIX Parser".

**8b — Dữ liệu (A2)**
- Cây JSON/XML ở view kia, bấm node ⇒ nhảy dòng nguồn, chép path.
- Truy vấn JSONPath (tập con) / XPath ⇒ kết quả ở view kia.
- Lint khi gõ (CM6 `lint`) cho JSON/YAML/XML/CSS/HTML dùng parser tolerant; panel Problems (đếm lỗi trên status bar, bấm nhảy dòng).
- Rainbow CSV: tô màu cột, lệnh "căn thẳng cột"/"bỏ căn", "Mở trong bảng CSV" (link `#pako:` sang Data Workbench).

**8c — Công cụ text dev (A3)**
- JWT decode (header/payload/hết hạn, **không** verify chữ ký — ghi rõ), JSON escape/unescape, URL encode/decode + parse query thành bảng.
- Chèn UUID v4, epoch ⇄ ngày giờ (giây/mili, UTC/local), hex/dec/bin; hover số/timestamp ⇒ tooltip giá trị quy đổi.
- Lịch sử cục bộ: snapshot mỗi lần lưu (IndexedDB, giới hạn N bản/file + dung lượng), xem diff với bản bất kỳ, khôi phục.

**8d — Thao tác editor (A4)**
- Outline/Function List (từ syntax tree) ở sidebar + breadcrumbs trên editor.
- Goto Anything: `Ctrl+P` hỗ trợ `file@symbol`, `file:line`, `#từ`.
- Bộ phím: VS Code (mặc định) / Sublime / Notepad++; tuỳ chọn Vim.
- Phiên có tên: lưu/mở/xoá bộ tab + layout + view (dùng `SavedSessions`).
- Emmet (HTML/CSS/JSX) + snippet (bộ có sẵn + user tự thêm, lưu IndexedDB).
- Thước cột 80/120, ô màu cạnh mã màu CSS, tô màu cặp ngoặc, mở rộng vùng chọn theo cú pháp (`selectParentSyntax`).
- Link chia sẻ / ghi chú có mật khẩu (AES-GCM); mở link ⇒ hỏi mật khẩu.

## Architecture
```
js/log/       log-language-highlight.js, line-filter-to-output.js, file-tail-monitor.js, fix-message-highlight-hover.js
js/data/      json-xml-tree-output.js, jsonpath-subset-query.js, xpath-query.js, tolerant-lint-sources.js, rainbow-csv-columns.js
js/devtools/  jwt-decode.js, string-escape-tools.js, uuid-epoch-base-tools.js, number-timestamp-hover.js, local-history-snapshots.js
js/editor/    outline-breadcrumbs.js, goto-anything-parser.js, keymap-profiles.js, emmet-snippets.js, editor-visual-aids.js
js/core/      encrypted-share-codec.js
```

## Implementation Steps
1. 8c trước (module thuần, nhanh, test node dễ).
2. 8b (tái dùng parser/tree nhiều nhất).
3. 8a (cần từ điển FIX + FS handle).
4. 8d (cần vendor Vim/Emmet: bổ sung script vendor, ghim bản ≥ 2 tuần).

## Todo List
- [ ] 8c: JWT, escape, URL, UUID/epoch/base, hover, local history
- [ ] 8b: tree, JSONPath/XPath, lint + Problems, Rainbow CSV
- [ ] 8a: log highlight, lọc dòng, tail, FIX hover
- [ ] 8d: outline, Goto Anything, keymap + Vim, sessions, Emmet/snippet, visual aids, link mật khẩu
- [ ] Demo `?demo=` mỗi nhóm + VI/EN + mobile + test node

## Success Criteria
- Mỗi nhóm có ≥ 1 demo chạy 1 cú bấm; module thuần có test node; không request mạng nào phát sinh.

## Risk Assessment
- Tail file lớn liên tục ⇒ chỉ đọc phần đuôi bằng `Blob.slice`, giới hạn tần suất.
- Lint file lớn ⇒ tắt lint trên ngưỡng (vd > 5 MB), báo trên status bar.
- Vim/Emmet tăng bundle ⇒ nạp lười khi bật.

## Security Considerations
- JWT decode cục bộ, không gửi đi; cảnh báo không lưu token vào ghi chú/link.
- Link mật khẩu: sai mật khẩu ⇒ báo lỗi chung, không lộ gì; không cache khoá.

## Next Steps
- Phase 6 (docs, kiểm ma trận) gồm cả phase 8.
