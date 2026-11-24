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
| Soạn & xem trước sơ đồ | `tools/diagram-editor.html` — **file sinh ra** từ `src/diagram-editor/` (ADR #11) + renderer ở `tools/vendor/` | 6 tab Mermaid · PlantUML · draw.io · DBML · D2 · Structurizr: preview, xuất PNG/SVG, link `#pako:`, nháp + lịch sử riêng từng tab. Năm tab offline; **draw.io là 1 trong 2 ngoại lệ của "không gọi mạng"** (cùng Bảng giá chứng khoán, ADR #13), chỉ kết nối `embed.diagrams.net` sau khi người dùng bấm đồng ý |
| FIX Parser | `tools/fix-message-parser.html` — **file sinh ra** từ `src/fix-message-parser/` (ADR #7, build `scripts/build-single-file-tool.ps1 -Tool fix-message-parser`) | Đọc message/log FIX: bảng message + chi tiết tag, kiểm BodyLength/CheckSum/tag bắt buộc, từ điển FIX 4.4 + Server Sàn (BCGD `35=s/t/u`, ĐTTTT), chuỗi lệnh, che dữ liệu, xuất CSV/JSON; mẫu nhiều báo cáo giao dịch Server Sàn |
| Lịch vạn niên | `tools/vietnamese-lunar-calendar.html` — **file sinh ra** từ `src/vietnamese-lunar-calendar/` (build `scripts/build-single-file-tool.ps1 -Tool vietnamese-lunar-calendar`) | Lịch tháng dương–âm + đổi ngày âm ↔ dương (thuật toán Hồ Ngọc Đức, UTC+7, 1800–2199) + chi tiết ngày tốt xấu: can chi, nạp âm, tiết khí, hoàng/hắc đạo, trực, 28 tú, Khổng Minh, Lý Thuần Phong, hướng xuất hành, tuổi xung, ngày lễ |
| Bảng giá chứng khoán | `tools/vn-stock-price-board.html` — **file sinh ra** từ `src/vn-stock-price-board/` (build `scripts/build-single-file-tool.ps1 -Tool vn-stock-price-board`) | Bảng giá realtime HOSE·HNX·UPCOM kiểu iBoard: chỉ số + sparkline, tab sàn/rổ/ETF/CW, ★ danh mục, 3 bước giá, ĐTNN, pane chi tiết (sổ lệnh, chart trong ngày, lịch sử khớp). **Ngoại lệ gọi mạng thứ 2 (ADR #13)**: chỉ GET dữ liệu từ API công khai VPS |
| Bảng giá Crypto & On-chain | `tools/crypto-market-board.html` — **file sinh ra** từ `src/crypto-market-board/` (`scripts/build-single-file-tool.ps1 -Tool crypto-market-board`) | Giá realtime Binance (WebSocket) + vị thế lãi/lỗ, Top 250, Spot, Phái sinh, Thị trường (heatmap, ngành, Altcoin Season, F&G), DeFi & doanh thu P/F P/S, Bitcoin On-chain (chỉ báo chu kỳ), Ví BTC & cá voi. **Ngoại lệ gọi mạng ADR #16**: chỉ GET/WS dữ liệu công khai |
| One Editor | `tools/one-editor.html` + `tools/one-editor-preview-sandbox.html` — **2 file sinh ra** từ `src/one-editor/` (`scripts/build-single-file-tool.ps1 -Tool one-editor`); thư viện CodeMirror 6 / Prettier / sql-formatter ở `tools/vendor/` (ADR #21) | Soạn code + text: 1–4 view, tab, ghi chú + hot exit IndexedDB (ADR #20), file + folder trên máy, nhận diện ngôn ngữ, Command Palette, ▶ Chạy → tab kết quả ở view kia (format, chuyển đổi, sinh kiểu), so sánh 2 view, bộ Notepad++ (bảng mã, EOL, dòng, macro, file > 50 MB), preview sơ đồ trong iframe sandbox + Markdown/HTML/SVG/bảng/draw.io, tìm/thay trong nhiều file, xuất/in/Copy as HTML, dịch (Translator API trên máy, không có thì hỏi rồi mới gửi MyMemory; dán link ⇒ dịch trang web qua Jina Reader) + đọc to + từ điển tiếng Anh; phase 8: công cụ dev (JWT, URL, epoch, lịch sử cục bộ IndexedDB v2), dữ liệu (cây, JSONPath / XPath, lint, Rainbow CSV), log + FIX (lọc, tail -f, hover từ điển FIX), thao tác editor (Outline, Goto Anything, bộ phím + Vim, Emmet, snippet, phiên có tên, link + ghi chú AES-GCM) — 3 bundle JS nạp lười sinh từ `src/one-editor/*.template.js`. Offline; draw.io + dịch MyMemory / trang web (Jina) + từ điển opt-in (ADR #22); cloud Drive/OneDrive hoãn (ADR #19) |; phase 9 (bundle nạp lười `tools/one-editor-extras.js`): cron, CSV/JSON → SQL, JSON Schema, thay hàng loạt, ký tự vô hình, bảng Markdown/TOC, recipe CyberChef, regex tester, chạy HTML/JS trong sandbox, code → ảnh; phase 12 (ADR #29): thanh hoạt động dạng rail (> 900 px) / dải cuộn + panel ⎇ Git chỉ đọc (≠ HEAD) · ⚠ Problems mọi tab mở · 🕘 Timeline · ☑ TODO/FIXME · 📋 lịch sử clipboard (RAM + 📌) · 🧩 Thư viện (xuất / nhập JSON), ⚙ 🗑 ở đáy rail

Ngoài tool còn **bài thi trắc nghiệm ôn tập**: trang `study.html` (root, KHÔNG liên kết từ `index.html`) liệt kê card các đề trong `study/`
(hiện có `study/CBTTCK.html` — 250 câu "Cơ bản về chứng khoán và TTCK", `study/PL-CK-TTCK.html` — 200 câu "Pháp luật về chứng khoán và TTCK" và `study/MG-DT-CK.html` — 300 câu "Môi giới và Tư vấn đầu tư CK"; đề 50 câu/60 phút, lịch sử kết quả, Lưu PDF).
Dựng đề mới theo playbook [`docs/study/README.md`](../docs/study/README.md); kiểm đề bằng `node scripts/validate-study-quiz-bank.js study/<MA_DE>.html`.

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
- **Không gửi dữ liệu đi đâu** — đây là cam kết hiển thị ngay trên UI; mọi thay đổi gọi mạng là breaking. Ngoại lệ đã chốt: tab draw.io (ADR #11), Bảng giá chứng khoán chỉ tải giá từ API công khai VPS (ADR #13).
- **Tự sửa = đoán**: mỗi sửa đổi phải được ghi vào danh sách `fixes`, không sửa âm thầm.
- **Mọi tool phải có khối tác giả** `<div class="author">` (Tác giả + GitHub Source) — markup/CSS chuẩn ở
  [`docs/architecture/README.md`](../docs/architecture/README.md) mục 3.
- **Mọi tool phải song ngữ English + Tiếng Việt** (nút `VI | EN` góc trên-phải, chuỗi gốc tiếng Việt + từ điển English) —
  tool mới/sửa tool làm đủ checklist song ngữ ở [`docs/architecture/README.md`](../docs/architecture/README.md) mục 3 (ADR #8).
- **Mọi tool phải có dữ liệu mẫu để test nhanh**: dropdown `Thử mẫu…` (chọn là nạp + chạy) + `?demo=<key>`; mẫu hợp lệ + mẫu lỗi,
  dữ liệu giả, nội dung bằng English — checklist "Dữ liệu mẫu" cùng mục 3.
- **Mọi tool phải có nút `🔗 Chia sẻ link`**: link `…#pako:<payload>` mang dữ liệu + tuỳ chọn (chỉ ở hash, không gửi lên server), mở là nạp + chạy;
  đọc thêm `?data=` — checklist "Link chia sẻ" cùng mục 3 (ADR #9).
- **Mọi tool phải theo hai tầng màu**: header teal `#164e63` = việc cấp ứng dụng + tab điều hướng, toolbar nền tint accent 10% = việc trên dữ liệu đang mở —
  CSS chung `src/data-workbench/styles/app-bar-tabs-toolbar-surfaces.css`, luật ở [`docs/architecture/README.md`](../docs/architecture/README.md) mục 3 (ADR #10).
- **Mọi tool phải dùng tốt cả Desktop và Mobile**: >900px pane cạnh nhau, 641–900px xếp dọc có sàn, ≤640px mỗi lúc 1 pane (carousel `scroll-snap`) + header gọn `⋯` + toolbar cuộn ngang,
  màn thấp cảm ứng thì trang cuộn; thao tác chuột/phím/chạm ngang nhau; kiểm ma trận kích thước — CSS/JS chung `src/data-workbench/styles/phone-portrait-layout.css` + `js/core/phone-pane-switcher.js`, checklist ở [`docs/architecture/README.md`](../docs/architecture/README.md) mục 3 (ADR #12).
- Git commit/push do user tự chạy.

## Đang vướng

Xem [`ai-context/working/issues-open.md`](working/issues-open.md).

## Trỏ tới chi tiết

- **Riêng từng tool** (luật detect, catalog sửa lỗi, contract, AST, module, giới hạn): `docs/tools/<tool>.md`
- Luật/contract/model **chung** mọi tool: `docs/business/` · `docs/api-contracts/` · `docs/data-models/` · `docs/architecture/`
- Bảo mật/riêng tư: `docs/security/` · Chạy/publish: `docs/deployment/`
- Thuật ngữ: `docs/glossary.md` · Quyết định đã chốt: `docs/decisions/`
