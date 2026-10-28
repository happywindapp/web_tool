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
| Đọc & Format JSON · XML · HTML | `tools/format-json-xml-html.html` | Kiểm tra cú pháp, **tự sửa lỗi** cú pháp phổ biến, format (2/4 space/Tab), minify, xem dạng cây, tải về |
| Soạn & xem trước sơ đồ Mermaid | `tools/mermaid-diagram-editor.html` (+ `tools/vendor/mermaid-12.2.0.min.js`) | Live editor kiểu mermaid.live, offline: preview, theme, xuất PNG/SVG, link `#pako:`, lịch sử trong localStorage |

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

- 4 module IIFE trong 1 `<script>`: `JsonTool`, `MarkupTool`, `ViewRender`, phần UI wiring.
- **Tolerant parser (bộ phân tích chịu lỗi)**: không dừng ở lỗi đầu tiên mà đoán ý định, sửa, và ghi
  lại từng sửa đổi `{line, col, msg}` để người dùng duyệt.
- Không backend, không network request. `localStorage` chỉ cho nháp/lịch sử (ADR #6); thư viện lớn để ở `tools/vendor/` (ADR #5).

Chi tiết: [`docs/tools/format-json-xml-html.md`](../docs/tools/format-json-xml-html.md).

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
- UI tiếng Việt. Git commit/push do user tự chạy.

## Đang vướng

Xem [`ai-context/working/issues-open.md`](working/issues-open.md).

## Trỏ tới chi tiết

- **Riêng từng tool** (luật detect, catalog sửa lỗi, contract, AST, module, giới hạn): `docs/tools/<tool>.md`
- Luật/contract/model **chung** mọi tool: `docs/business/` · `docs/api-contracts/` · `docs/data-models/` · `docs/architecture/`
- Bảo mật/riêng tư: `docs/security/` · Chạy/publish: `docs/deployment/`
- Thuật ngữ: `docs/glossary.md` · Quyết định đã chốt: `docs/decisions/`
