# Plan — Data Workbench: code chia module, script ghép thành 1 file HTML

> Nguồn: [research report](../reports/research-261028-0849-review-formatter-converter-tools-feature-proposal.md).
> User chốt 2026-10-28: cách 2 (module + build) · workbench thay hẳn tool cũ · vendor js-beautify + js-yaml · đợt 1 = khung + 4 module P1 · chưa XLSX.

## Kiến trúc

```text
src/data-workbench/
  data-workbench.template.html   # khung + marker @include
  styles/*.css · partials/*.html # CSS + markup từng tab
  js/core|parsers|converters|diff|tabs/*.js   # IIFE, mỗi file 1 concern
  third-party/                   # js-beautify 1.15.1 (js+css), js-yaml 4.1.0 + LICENSE
  tests/pure-modules.test.js     # node --test, không npm
scripts/build-data-workbench-single-file.ps1   # ghép → tools/data-workbench.html (-Check: báo nếu quên build)
tools/data-workbench.html        # FILE SINH RA, commit để Pages/gửi file vẫn chạy
tools/format-json-xml-html.html  # → trang chuyển hướng, giữ ?demo=
```

## Phase

| # | Việc | Trạng thái |
|---|------|-----------|
| 1 | Build script + template + core (router tab, editor có gutter, report, IO, storage) | done |
| 2 | Tab Format: port JsonTool/MarkupTool/ViewRender + A1 sort key · A2 giải/escape chuỗi JSON · A3 thụt 3/8 · A4 Ctrl+Enter/Xoá · A5 nháp · A6 thống kê · WT-3/4/5 | done |
| 3 | Tab Chuyển đổi: JSON/CSV/TSV/XML/YAML → JSON/CSV/TSV/XML/YAML/JS/SQL/Markdown/HTML table | done |
| 4 | Tab Bảng CSV: encoding, delimiter auto, sort/lọc/sửa/thêm/xoá, phân trang, xuất CSV (BOM, CRLF) | done |
| 5 | Tab So sánh: Myers line diff + char diff, JSON theo cấu trúc (bỏ qua thứ tự key) | done |
| 6 | Tab Format CSS·JS (js-beautify), minify CSS | done |
| 7 | Redirect tool cũ, index/README/docs/ADR #7, test node, smoke test Chrome headless, self-review | done |

## Rủi ro

- Quên chạy build sau khi sửa `src/` → `-Check` so file sinh ra với nguồn.
- `</script` trong thư viện nhúng → build escape `<\/script`, gặp `<script` trong JS thì dừng.
