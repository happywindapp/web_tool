# Sprint hiện tại

> Trạng thái công việc đang làm. Cập nhật mỗi ngày / mỗi sprint.

- **Sprint:** khởi tạo
- **Khoảng thời gian:** 2026-10-27 →
- **Mục tiêu sprint:** đưa repo về cấu trúc AI-native + commit tool đầu tiên.

## Task list

- [x] Apply AI-native template v1.0.0 (2026-10-27)
- [x] Commit tool đầu tiên + scaffold (`40cb755`)
- [x] Tái cấu trúc: `_tools/` → `tools/`, thêm `index.html`, docs riêng tool ở `docs/tools/`, gỡ template N/A (2026-10-27)
- [x] Chốt publish GitHub Pages: nhánh `main`, root (2026-10-27)
- [x] Bật Pages (bật tay ở Settings → Pages) → https://happywindapp.github.io/web_tool/ (2026-10-27)

- [x] Tool Soạn & xem trước sơ đồ Mermaid (review mermaid.live + tool khác, vendor Mermaid 12.2.0, ADR #5 #6) (2026-10-28)
- [x] Data Workbench đợt 1: review 20 tool format/convert, module `src/data-workbench/` + build 1 file (ADR #7), 5 tab Format · Chuyển đổi · Bảng CSV · So sánh · CSS·JS; tool cũ → redirect (2026-10-28)
- [x] Song ngữ VI/EN cho `index.html` + mọi tool: nút góc trên-phải, module `I18n`, dịch cả thông báo parser, test coverage từ điển (ADR #8) (2026-10-28)
- [x] FIX Parser: review fixparser.targetcompid.com + OnixS/B2BITS/parser trình duyệt; dictionary FIX 4.4 + lớp phủ Server Sàn sinh từ QuickFIX/QuickFIX fork của sàn; timeline, kiểm 9/10/required/kiểu, chuỗi lệnh, che dữ liệu, CSV/JSON; mẫu BCGD/ĐTTTT/FIX 4.4/lỗi; build chung `build-single-file-tool.ps1` (2026-10-28)
- [x] Diagram Editor: gộp 6 tab Mermaid · PlantUML · draw.io · DBML · D2 · Structurizr, tách `src/diagram-editor/`, đổi tên `tools/diagram-editor.html`, design mới (ADR #11) (2026-11-01)
- [ ] Data Workbench đợt 2 (chưa chốt): Encode/Base64/JWT/hash · Format SQL · sinh Go struct/TS/C# từ JSON · copy path + JSONPath/XPath trên cây — xem `plans/reports/research-261028-0849-*`

## Đang làm (in progress)

- _(trống)_

## Đã xong (done)

- Scaffold + docs điền từ code, validate 0 error.
