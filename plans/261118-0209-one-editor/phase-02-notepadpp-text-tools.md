# Phase 2 — Bộ Notepad++ · Compare 2 view · Format tự động

## Context Links
- [plan.md](plan.md) · [phase-01](phase-01-core-editor-workbench.md) · research Digital ToolPad (không có compare, macro, encoding)
- Dùng lại: `src/data-workbench/js/parsers/{json-tolerant-parser,markup-tolerant-parser,css-minifier}.js`, `diff/{myers-sequence-diff,json-structural-diff}.js`
- Vendor (phase 0): `tools/vendor/prettier-3.9.10/`, `sql-formatter` 15.9.0

## Overview
- Priority: P1 · Status: ⬜ · Cỡ: M–L
- Điểm khác biệt chính so với Digital ToolPad và vscode.dev.

## Key Insights
- Encoding: `TextDecoder` đọc được windows-125x, shift_jis, gbk, utf-16…; ghi chỉ có UTF-8 ⇒ encoding 1 byte dựng bảng ngược bằng cách decode 256 byte; UTF-16 ghi tay; encoding nhiều byte cũ chỉ đọc.
- Compare dùng `@codemirror/merge` trên chính 2 editor group của split view ⇒ vẫn sửa được 2 bên khi đang so, khác biệt cập nhật live.
- Format chọn formatter theo ngôn ngữ đã nhận diện; formatter tolerant tự sửa lỗi ⇒ đẩy vào `fixes` (`{line,col,msg}`) và hiện cho user, không sửa âm thầm.

## Requirements
**Compare 2 file ở 2 view**
- Lệnh "So sánh với…" (tab khác / file local / clipboard / bản đã lưu); 2 group cạnh nhau, tô dòng/ký tự khác, cuộn đồng bộ, gutter nối khối khác.
- Nhảy khác biệt `Alt+↑/↓`, chép khối sang trái/phải, bỏ qua khoảng trắng / hoa-thường; chế độ inline (unified) cho màn hẹp/mobile.
- JSON: tuỳ chọn so theo cấu trúc (bỏ qua thứ tự key) dùng `json-structural-diff`.

**Chuyển đổi (user chốt 2026-11-18) — kết quả ra tab output ở view kia**
- JSON ⇄ YAML ⇄ XML ⇄ CSV (dùng lại `convert-engine` data-workbench), Markdown → HTML (renderer an toàn phase 3), HTML → Markdown bằng `turndown` 7.2.x + `turndown-plugin-gfm` 1.0.2 (bảng, gạch ngang, task list) nhúng inline lúc build (ADR #7, #21); thêm rule giữ ngôn ngữ của `<pre><code class="language-x">` thành ```` ```x ````.
- JSON → Go struct (tag `json`), Java class, C# class, TypeScript interface, C++ struct: suy kiểu từ mẫu (gộp phần tử mảng, field tuỳ chọn, tên PascalCase/camelCase theo ngôn ngữ). Module thuần, test node.

**Format tự động (3 tầng — user chốt 2026-11-18)**
- Nút Format ⇒ kết quả ra **tab output ở view kia** (không đè nguồn); `Shift+Alt+F` vẫn format tại chỗ cho ai quen VS Code.
- Tầng 1: JSON, XML (parser tolerant data-workbench, tự sửa ⇒ `fixes`); SQL bằng `sql-formatter` (dialect T-SQL mặc định, PostgreSQL, MySQL, PL/SQL); FIX message (tách `SOH`/`|` mỗi tag 1 dòng + nút "Mở trong FIX Parser").
- Tầng 2: Prettier standalone (vendor, nạp plugin theo ngôn ngữ): JS, TS, JSX/TSX, CSS, SCSS, LESS, HTML, Markdown, YAML, GraphQL.
- Tầng 3: Go, C#, Java, Python, PowerShell, Bash, Dockerfile, TOML, INI/.env, Protobuf… ⇒ re-indent theo syntax tree (`indentRange`) + trim cuối dòng; status bar báo "chỉ căn lề".
- Tuỳ chọn: format khi lưu, format khi dán, indent (space/tab, 2/4), print width; minify JSON/CSS.
- Lỗi cú pháp ⇒ danh sách lỗi click nhảy tới dòng; không đổi văn bản khi formatter báo lỗi.

**Notepad++**
- Encoding: tự dò (BOM → UTF-8 `fatal` → gợi ý 1258/1252), "Mở lại với…" / "Lưu với…" trên status bar.
- EOL: dò CRLF/LF/CR/hỗn hợp, chuyển đổi; hiện ký tự ẩn (space, tab, EOL); chuyển tab ↔ space; trim cuối dòng.
- Column mode `Alt+kéo`, `Alt+Shift+mũi tên`; chèn cột số tăng dần.
- Thao tác dòng: sort (A-Z, Z-A, số, bỏ hoa-thường), bỏ trùng, bỏ dòng trống, nối/tách, đảo dòng, duplicate/move, đổi hoa/thường/Title/camel/snake.
- MIME tools: Base64, URL encode/decode, HTML entity, hash SHA-1/256 (`crypto.subtle`) trên vùng chọn.
- Macro: ghi lệnh + đoạn gõ, phát lại 1 / N lần / tới cuối file, lưu IndexedDB.
- File lớn (> ngưỡng phase 0): viewer chỉ đọc theo đoạn (`Blob.slice`), tìm theo đoạn.
- Demo: `compare`, `compare-json`, `format-mixed`, `crlf-mixed`, `windows-1258`, `sort-dedupe`, `column-csv`, `macro`.

## Architecture
```
js/notepadpp/ encoding-detect-convert.js, single-byte-codepage-table.js, eol-detect-convert.js, line-operations.js,
              column-insert-number.js, text-transform-mime-hash.js, macro-recorder-replay.js, large-file-chunk-viewer.js
js/format/    format-dispatcher-by-language.js
js/workbench/ compare-two-views.js
```
Mọi thao tác đăng ký vào `CommandRegistry`.

## Related Code Files
- Tạo: các file trên + test node; dùng lại parser/diff của data-workbench qua `@include`.

## Implementation Steps
1. Format dispatcher + nối formatter có sẵn; format on save/paste.
2. Compare 2 view (merge view trên split group) + chế độ inline mobile.
3. Encoding + EOL (test byte-level trước).
4. Line ops, column, MIME/hash.
5. Macro, large file viewer.
6. Demo + I18n.

## Todo List
- [ ] Format dispatcher + tuỳ chọn
- [ ] Compare 2 view + JSON cấu trúc + inline mobile
- [ ] Encoding + EOL + ký tự ẩn
- [ ] Line ops + column + MIME/hash
- [ ] Macro + large file viewer
- [ ] Demo + VI/EN + test node

## Success Criteria
- Round-trip byte-chuẩn: UTF-8 (±BOM), UTF-16, windows-1252/1258, CRLF mở rồi lưu không đổi.
- Compare 2 file 5k dòng mượt, sửa 1 bên cập nhật khác biệt < 200 ms.
- Format lỗi không mất dữ liệu; mọi tự sửa hiện trong `fixes`.

## Risk Assessment
- Dò encoding sai ⇒ luôn cho chọn lại, không tự lưu bằng encoding khác.
- Ký tự không map được khi lưu ⇒ báo, không thay `?` âm thầm.

## Security Considerations
- Xử lý cục bộ, không gọi mạng.

## Next Steps
- Phase 6.
