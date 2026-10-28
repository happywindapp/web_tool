# Project Context — web_tool (HSC)

> Mọi AI Agent ĐỌC FILE NÀY ĐẦU TIÊN. Nội dung rút từ mã nguồn `c:/_web_tool` (GitHub
> `happywindapp/web_tool`, nhánh `main`, quét 2026-10-27).

## Elevator pitch

`web_tool` là **bộ sưu tập công cụ web tiện ích** chạy **100% trong trình duyệt**: mỗi tool là
**1 file HTML tự chứa** (HTML + CSS + vanilla JS inline, không build, không dependency, không gọi mạng)
nằm trong `tools/`; `index.html` ở root là trang chủ liệt kê tool. Mở file bằng trình duyệt là dùng được, kể cả offline.

Tool hiện có:

| Tool | File | Việc |
|------|------|------|
| Data Workbench | `tools/data-workbench.html` — **file sinh ra** từ `src/data-workbench/` (ADR #7); thay tool cũ `format-json-xml-html.html` (đã xoá) | 5 tab: Format JSON·XML·HTML (**tự sửa lỗi**, sort key, giải JSON lồng) · Chuyển đổi JSON/CSV/TSV/XML/YAML → … + SQL/Markdown/HTML table · Bảng CSV · So sánh (dòng / JSON cấu trúc) · Format CSS·JS |
| Soạn & xem trước sơ đồ Mermaid | `tools/mermaid-diagram-editor.html` (+ `tools/vendor/mermaid-12.2.0.min.js`) | Live editor kiểu mermaid.live, offline: preview, theme, xuất PNG/SVG, link `#pako:`, lịch sử trong localStorage |
| FIX Parser | `tools/fix-message-parser.html` — **file sinh ra** từ `src/fix-message-parser/` (ADR #7, build `scripts/build-single-file-tool.ps1 -Tool fix-message-parser`) | Đọc message/log FIX: bảng message + chi tiết tag, kiểm BodyLength/CheckSum/tag bắt buộc, từ điển FIX 4.4 + Server Sàn (BCGD `35=s/t/u`, ĐTTTT), chuỗi lệnh, che dữ liệu, xuất CSV/JSON; mẫu nhiều báo cáo giao dịch Server Sàn |

## Kiến trúc high-level

```text
Người dùng ─ dán / kéo-thả / mở file ─► <textarea id="src">
                                            │ detect(): theo đuôi file → theo ký tự đầu
                                            ▼
              ┌──────────── JSON ────────────┐   ┌──────── XML / HTML ────────┐
              │ JsonTool.check (JSON.parse)  │   │ MarkupTool.checkXml (DOMParser)
              │ JsonTool.parse  → AST + fixes│   │ MarkupTool.build → tree + fixes
              │ JsonTool.stringify           │   │ serialize / minify          │
              └──────────────┬───────────────┘   └──────────────┬──────────────┘
                             ▼                                  ▼
                 ViewRender.highlight (pane "Văn bản") · ViewRender.tree (pane "Cây dữ liệu")
                 footer: danh sách lỗi/fix (bấm → nhảy dòng) · Sao chép · Tải về · ← Dùng kết quả
```

- Sơ đồ trên là tab Format của Data Workbench. Module IIFE nằm ở `src/data-workbench/js/**` (mỗi file < 200 dòng),
  `pwsh scripts/build-data-workbench-single-file.ps1` ghép thành 1 file; **không sửa tay** `tools/data-workbench.html`.
- **Tolerant parser (bộ phân tích chịu lỗi)**: không dừng ở lỗi đầu tiên mà đoán ý định, sửa, và ghi
  lại từng sửa đổi `{line, col, msg}` để người dùng duyệt. Converter/bảng CSV/so sánh dùng lại parser này.
- Không backend, không network request. `localStorage` chỉ cho nháp/lịch sử (ADR #6); thư viện lớn để ở `tools/vendor/` (ADR #5),
  thư viện nhỏ của workbench nhúng inline lúc build (ADR #7). Test: `node --test src/data-workbench/tests/pure-modules.test.js`.

Chi tiết: [`docs/tools/data-workbench.md`](../docs/tools/data-workbench.md).

## Repos

| Repo | Vị trí | Vai trò |
|------|--------|---------|
| `web_tool` | `c:/_web_tool` (chính là workspace root) | GitHub `happywindapp/web_tool`, nhánh `main` |

Khác các workspace khác: **workspace root = git repo** → scaffold AI (`ai-context/`, `docs/`, `.agent/`,
`CLAUDE.md`…) nằm chung repo với tool. Junction `*/skills` đã gitignore.

## Hệ ngoài

Không có. Không backend, không API, không DB, không CDN.

## Ranh giới & nguyên tắc

- **1 tool = 1 file HTML tự chứa** trong `tools/`, tên kebab-case mô tả việc. Không thêm build step,
  framework hay script CDN nếu chưa hỏi user (xem [ADR](../docs/decisions/README.md)).
- **Không gửi dữ liệu đi đâu** — đây là cam kết hiển thị ngay trên UI; mọi thay đổi gọi mạng là breaking.
- **Tự sửa = đoán**: mỗi sửa đổi phải được ghi vào danh sách `fixes`, không sửa âm thầm.
- **Mọi tool phải có khối tác giả** `<div class="author">` (Tác giả + GitHub Source) — markup/CSS chuẩn ở
  [`docs/architecture/README.md`](../docs/architecture/README.md) mục 3.
- **Mọi tool phải song ngữ English + Tiếng Việt** (nút `VI | EN` góc trên-phải, chuỗi gốc tiếng Việt + từ điển English) —
  tool mới/sửa tool làm đủ checklist song ngữ ở [`docs/architecture/README.md`](../docs/architecture/README.md) mục 3 (ADR #8).
- **Mọi tool phải có dữ liệu mẫu để test nhanh**: dropdown `Thử mẫu…` (chọn là nạp + chạy) + `?demo=<key>`; mẫu hợp lệ + mẫu lỗi,
  dữ liệu giả, nội dung bằng English — checklist "Dữ liệu mẫu" cùng mục 3.
- **Mọi tool phải có nút `🔗 Chia sẻ link`**: link `…#pako:<payload>` mang dữ liệu + tuỳ chọn (chỉ ở hash, không gửi lên server), mở là nạp + chạy;
  đọc thêm `?data=` — checklist "Link chia sẻ" cùng mục 3 (ADR #9).
- Git commit/push do user tự chạy.

## Đang vướng

Xem [`ai-context/working/issues-open.md`](working/issues-open.md).

## Trỏ tới chi tiết

- **Riêng từng tool** (luật detect, catalog sửa lỗi, contract, AST, module, giới hạn): `docs/tools/<tool>.md`
- Luật/contract/model **chung** mọi tool: `docs/business/` · `docs/api-contracts/` · `docs/data-models/` · `docs/architecture/`
- Bảo mật/riêng tư: `docs/security/` · Chạy/publish: `docs/deployment/`
- Thuật ngữ: `docs/glossary.md` · Quyết định đã chốt: `docs/decisions/`
