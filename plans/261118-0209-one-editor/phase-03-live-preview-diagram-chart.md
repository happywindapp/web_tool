# Phase 3 — Live preview: sơ đồ / chart, Markdown, HTML

## Context Links
- [plan.md](plan.md) · `tools/diagram-editor.html` (khuôn UI code trái – hình phải) · ADR #11
- Dùng lại: `src/diagram-editor/js/engines/*` (Mermaid, PlantUML, D2, DBML, Structurizr, Graphviz), `js/core/{vendor-script-loader,preview-pan-zoom,svg-output-sanitizer,svg-png-exporter}.js`, `tools/vendor/` có sẵn

## Overview
- Priority: P1 · Status: ⬜ · Cỡ: M
- Mở file sơ đồ/chart ⇒ nút "Preview" (`Ctrl+K V`) mở group bên phải hiện hình, cập nhật khi gõ (debounce).

## Key Insights
- Chart không cần thư viện mới: Mermaid có `pie`, `xychart-beta` (bar/line), `sankey-beta`, `quadrantChart`, `gantt`, `timeline` ⇒ "vẽ chart" = viết Mermaid bên trái.
- D2 cần `'unsafe-eval'` (ADR #11) ⇒ **không chạy trong trang chính** (trang giữ OAuth token). Preview là file riêng `tools/one-editor-preview-sandbox.html` (CSP riêng có `'unsafe-eval'`), nạp bằng `<iframe sandbox="allow-scripts">` không `allow-same-origin` ⇒ origin `null`, không đọc được token/IndexedDB của trang (spike 2026-11-18, ADR #21). Không dùng `srcdoc`: kế thừa CSP cha nên eval bị chặn.
- Trên `file://` iframe sandbox không nạp được script local ⇒ bỏ thuộc tính `sandbox` (trang `file://` không có token cloud).
- Trao đổi qua `postMessage` (gửi source + engine, nhận SVG/lỗi) — SVG vẫn qua `svg-output-sanitizer` trước khi chèn.

## Requirements
- Preview theo ngôn ngữ nhận diện: Mermaid (`.mmd`, ```` ```mermaid ````), PlantUML (`.puml`), D2 (`.d2`), DBML (`.dbml`), Structurizr (`.dsl`), Graphviz (`.dot`), Markdown (kèm khối mermaid trong md), HTML (iframe sandbox, không script mặc định, có nút bật script), SVG, CSV/JSON (bảng xem nhanh).
- Pan/zoom, vừa khung, tải SVG/PNG, chép SVG; lỗi cú pháp hiện ở status + gạch dưới dòng lỗi trong editor.
- Cuộn đồng bộ editor ↔ preview cho Markdown.
- Preview hiện ở **view còn lại** (code View 1 ⇒ hình View 2 và ngược lại), tự cập nhật khi gõ.
- draw.io (`.drawio`, `.dio`): nhúng `embed.diagrams.net` sau khi bấm "Kết nối draw.io" mỗi lần mở trang (ADR #22, dùng lại `drawio-embed-engine` của Diagram Editor); chưa kết nối ⇒ hiện nút kết nối + "Mở trong Diagram Editor".
- Mobile: preview là 1 pane trong carousel; nút Chạy chuyển sang pane preview.
- Demo: `mermaid-flow`, `mermaid-chart` (pie + xychart), `plantuml-seq`, `d2`, `dbml`, `markdown-mermaid`, `html`.

## Architecture
```
js/preview/ preview-host-bridge.js       (trang chính: tạo iframe, postMessage, debounce)
src/one-editor/preview-sandbox/  → build ra tools/one-editor-preview-sandbox.html (nạp vendor-script-loader + engines, trả SVG)
            preview-kind-by-language.js  (thuần: ngôn ngữ → engine/renderer)
            markdown-safe-renderer.js    (escape mọi HTML thô, chỉ sinh thẻ whitelist)
```

## Related Code Files
- Tạo: các file trên; `@include` engines diagram-editor vào runtime sandbox.
- Không sửa `src/diagram-editor/` trừ khi cần export hàm (giữ tương thích ngược, kiểm lại Diagram Editor).

## Implementation Steps
1. Spike: iframe sandbox nạp `tools/vendor/*` được trên GitHub Pages và `file://` (đo ở phase 0).
2. Bridge + runtime + `preview-kind-by-language` (test node).
3. Nối engines diagram-editor; pan/zoom; export.
4. Markdown safe renderer + cuộn đồng bộ; HTML preview sandbox.
5. Demo + I18n + mobile pane.

## Todo List
- [ ] Spike iframe sandbox + vendor
- [ ] Bridge + runtime + bảng engine
- [ ] Engines + pan/zoom + export
- [ ] Markdown + HTML preview
- [ ] Demo + VI/EN + mobile

## Success Criteria
- Gõ Mermaid/PlantUML/D2/DBML bên trái ⇒ hình bên phải cập nhật < 1 s; trang chính CSP không có `unsafe-eval`.

## Risk Assessment
- `file://` + iframe sandbox chặn tải script vendor ⇒ fallback: chạy engine không cần eval trực tiếp, D2 báo "mở bản GitHub Pages".
- Engine nặng ⇒ nạp lười khi mở preview lần đầu.

## Security Considerations
- Sandbox không `allow-same-origin`; message kiểm `event.source` + kiểu dữ liệu; SVG sanitize; Markdown không passthrough HTML.

## Next Steps
- Phase 6.
