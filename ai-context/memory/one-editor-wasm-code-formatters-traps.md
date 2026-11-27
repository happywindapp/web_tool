# One Editor: formatter WASM (gofmt · clang-format · ruff) — bẫy đã gặp

Phase 15b (2026-11-27). Engine `@wasm-fmt/*` vendor bằng `scripts/vendor-one-editor-code-formatters.ps1`, chạy trong Blob Worker (`js/format/wasm-code-formatters.js`).

| Triệu chứng | Nguyên nhân | Cách xử lý đúng |
|---|---|---|
| C++ sai cú pháp vẫn "format thành công" | clang-format (cả CLI) không báo lỗi cú pháp; chỉ throw khi style / `.clang-format` sai | Không hứa lint mark cho clang-format; lỗi style ⇒ coi là lỗi engine (fallback + lý do) |
| Cột lỗi Python lệch khi dòng có chữ có dấu | ruff WASM throw **chuỗi** `"… at byte range a..b"`, offset tính theo byte UTF-8 | Quy byte → ký tự (TextEncoder/Decoder); CLI cũng báo theo ký tự |
| Lint mark của formatter không ở dòng lỗi (Go / Python) | Ngôn ngữ có lint khi gõ (tree-sitter) ⇒ `FixMarks.show` nhường cho linter đó | Đúng thiết kế; tắt lint khi gõ thì mark của formatter đúng dòng:cột |
| Link chia sẻ có thể treo trang | `Formatter.opts` nay đi theo link ▶ Format; `indent: "100000000"` ⇒ `" ".repeat(1e8)` | Lọc khoá + kiểu + miền giá trị (`known()` trong dispatcher) trước khi dùng |
| Muốn chứng minh "trùng byte CLI" | Cần CLI đúng bản | ruff / clang-format cài per-user ở `C:\_devtools\<tool>-<ver>` (pip `--target`), gofmt từ Go; sinh lại fixture: `node src/one-editor/tests/fixtures/code-formatters/make-fixtures-from-cli.mjs` |
