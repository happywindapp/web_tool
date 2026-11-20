# web_tool

Bộ công cụ web tiện ích chạy **100% trong trình duyệt**. Mỗi tool là **1 file HTML tự chứa** trong `tools/` —
không cài đặt, không build, không gửi dữ liệu đi đâu (ngoại lệ: tab draw.io chỉ khi bấm kết nối; Bảng giá chứng khoán tải giá từ API công khai VPS). Mở file là dùng được, kể cả offline.

## Tools

| Tool | File | Làm gì |
|------|------|--------|
| Data Workbench | [`tools/data-workbench.html`](tools/data-workbench.html) (sinh từ `src/data-workbench/`) | 5 tab: **Format JSON·XML·HTML** (kiểm tra, tự sửa lỗi, format 2/3/4/8/Tab, thu gọn, sắp khóa, giải JSON lồng, thành chuỗi JSON, cây) · **Chuyển đổi** JSON/CSV/TSV/XML/YAML → JSON/CSV/TSV/XML/YAML/JS object/SQL INSERT/Markdown/HTML table · **Bảng CSV** (bảng mã, sort, lọc chữ + **lọc theo cột dạng chip / chuột phải chỉ hiện-loại trừ**, sửa ô, thêm/xoá + **kéo-thả đổi chỗ cột**, xuất có BOM + **giữ số cho Excel**) · **So sánh** (theo dòng, JSON theo cấu trúc) · **Format CSS·JS**. Chung: **💾 lưu phiên** đặt tên, **giao diện Tự động/Sáng/Tối** |
| Soạn & xem trước sơ đồ | [`tools/diagram-editor.html`](tools/diagram-editor.html) (file sinh ra từ `src/diagram-editor/`) | 6 tab **Mermaid · PlantUML · draw.io · DBML · D2 · Structurizr**: tô màu cú pháp, báo dòng lỗi, sơ đồ mẫu, pan-zoom, xuất PNG (1–4x)/SVG/mã nguồn, chép ảnh/Markdown, link chia sẻ `#pako:` (tab Mermaid tương thích mermaid.live), nháp + lịch sử + **💾 lưu sơ đồ đặt tên** riêng từng tab, **giao diện Tự động/Sáng/Tối**. Năm tab chạy offline, cần kèm `tools/vendor/`; **riêng draw.io cần mạng** và chỉ kết nối `embed.diagrams.net` sau khi bấm đồng ý |
| FIX Parser | [`tools/fix-message-parser.html`](tools/fix-message-parser.html) (sinh từ `src/fix-message-parser/`) | Dán message/log FIX (SOH, `\|`, `^A`…, kèm tiền tố log) → bảng message (giờ UTC/VN, gửi→nhận, loại, Symbol, ClOrdID, trạng thái…) + chi tiết từng tag (tên, ý nghĩa giá trị, repeating group; rê chuột = tooltip giải thích theo FIX Orchestra + spec CBTS v1.15 của sàn, mã lỗi Server Sàn). Kiểm BodyLength/CheckSum, thứ tự header, tag bắt buộc, kiểu giá trị; từ điển FIX 4.4 + **Server Sàn** (BCGD `35=s/t/u`, ĐTTTT `S/AI/AJ/Z`); lọc/tìm `tag=value`, **lọc theo cột + khoảng giờ, kéo-thả thứ tự cột, ghi chú từng message, lưu phân tích, từ điển riêng CSV, ẩn danh theo nhóm (bí danh giữ chuỗi lệnh), chọn chuỗi lệnh / cha–con, Alt+rê chuột tra tag trên ô nhập, theme sáng/tối**, xuất CSV (Excel giữ nguyên giá trị)/JSON, chép bản sửa 9/10. Có sẵn mẫu nhiều báo cáo giao dịch Server Sàn |
| Lịch vạn niên | [`tools/vietnamese-lunar-calendar.html`](tools/vietnamese-lunar-calendar.html) (sinh từ `src/vietnamese-lunar-calendar/`) | Lịch tháng dương–âm (bắt đầu Thứ Hai): ngày âm, mùng 1 dạng `1/10`, ngày hoàng đạo, ngày lễ dương/âm (24/11 Văn hóa Việt Nam từ 2026, 27/7 nghỉ từ 2027), tiết khí, **thời tiết** (Open-Meteo, 34 tỉnh/thành hoặc 📍 vị trí; ô ngày + dự báo hôm nay & 5 ngày tới + bảng chi tiết), danh ngôn + sách hay mỗi ngày, lịch sử thế giới/Việt Nam theo tháng, ghi chú chung + ghi chú theo ngày (localStorage). **Đổi ngày** dương ↔ âm bằng 1 ô nhập (`12/11/2026`, `âm 15/8/2026`, tháng nhuận `âm 1/6n/2025`), báo lỗi ngày không tồn tại. Chi tiết ngày: can chi năm/tháng/ngày/giờ + nạp âm, ngũ hành ngày, tiết khí (giờ giao tiết), thần hoàng/hắc đạo, trực (nên/kỵ), nhị thập bát tú, Khổng Minh, ngày kỵ, Hỷ/Tài/Hắc thần, tuổi xung ngày/tháng, bảng 12 giờ (can chi, thần, Lý Thuần Phong), đếm ngày tới Tết. Năm 1800–2199, giờ Việt Nam (UTC+7). **Tab Tử vi** (tham khảo, giải trí) theo tên + ngày/giờ sinh: tứ trụ, mệnh nạp âm, màu/số hợp, cung mệnh bát trạch + 8 hướng, tuổi hợp/xung, thần số học, sao chiếu mệnh + Tam Tai/Kim Lâu/Hoang Ốc/Thái Tuế năm nay & năm sau, 12 tháng tới, 10 năm tới, 4 đỉnh cao cuộc đời. **Tab SIM phong thủy**: chấm điểm số di động /10 theo 8 tiêu chí (âm dương, hành SIM – mệnh nạp âm, bổ khuyết dụng thần tứ trụ, quẻ chủ + quẻ hỗ Kinh Dịch Mai Hoa, Thể – Dụng, cửu tinh, dân gian: nút/bát tinh cặp số/đuôi số), vẽ quẻ chủ – hỗ – biến, gợi ý chọn SIM hợp mệnh; không có ngày sinh thì chấm riêng dãy số |
| Bảng giá chứng khoán | [`tools/vn-stock-price-board.html`](tools/vn-stock-price-board.html) (sinh từ `src/vn-stock-price-board/`) | Bảng giá realtime kiểu iBoard/CafeF/VNDirect, thêm tab **Thị trường** (độ rộng, heatmap theo ngành, ngành mạnh/yếu, top mã, khối ngoại), **Bộ lọc** cổ phiếu toàn thị trường, bảng giá theo **ngành ICB**, 🔔 cảnh báo giá + tín hiệu kỹ thuật, 📅 lịch sự kiện danh mục, tab **Dòng tiền** (khối ngoại / tự doanh 1–20 phiên), tab **Phái sinh** VN30F (OI, basis), 🔗 tương quan danh mục, ghi chú + giá mục tiêu riêng: thanh chỉ số VNINDEX · VN30 · HNX · UPCOM (sparkline, tăng/đứng/giảm), tab ★ Danh mục · VN30 · VN100 · HOSE · HNX · HNX30 · UPCOM · ETF · Chứng quyền + rổ VNMID/VNSML/VNDIAMOND/VNFINLEAD/VNX50; bảng 3 bước giá mua/bán + khớp lệnh + Cao/Thấp/TB + ĐTNN, màu trần/sàn/TC/tăng/giảm, flash ô đổi giá, sort, lọc, chế độ gọn, đơn vị KL ×10/cổ phiếu, xuất CSV. Pane chi tiết mã: sổ lệnh 3 bước, **biểu đồ kỹ thuật** (Lightweight Charts, nến VNDirect 1 tuần → tất cả lịch sử, nến 5m → 1 tháng, 6 kiểu chart, 18 chỉ báo, vẽ đường ngang/xu hướng/Fibonacci/đo, so với VNINDEX, PNG, bố cục 1/2/4 biểu đồ — gọn trong pane + cửa sổ toàn màn hình), biểu đồ giá + KL trong ngày, **9 tab chi tiết** (Tổng quan + chỉ số định giá + hiệu suất giá + khối ngoại · Định giá: Snowflake 5 trục, giá hợp lý Graham/P/E/P/B/DCF, P/E–P/B 5 năm, Piotroski, Altman Z · Kỹ thuật · Khớp lệnh · Tin tức · Báo cáo tài chính quý/năm · Sự kiện quyền · Hồ sơ + cổ đông lớn · Khuyến nghị: kế hoạch mua/bán + kiểm chứng tín hiệu 5 năm + giá mục tiêu CTCK), mua/bán chủ động, lịch sử khớp, thông tin chứng quyền. Dữ liệu từ **API công khai VPS** + nến lịch sử, tin tức, BCTC **VNDirect** (không chính thức, ADR #13 #14 #15), poll 3–30s, ngoài giờ tự giãn 60s |
| Bảng giá Crypto & On-chain | [`tools/crypto-market-board.html`](tools/crypto-market-board.html) (sinh từ `src/crypto-market-board/`) | Tổng hợp tính năng Token Terminal / DeFiLlama / Messari / Glassnode / CryptoQuant / LookIntoBitcoin / Arkham: **★ Danh mục** realtime (WebSocket Binance) + **vị thế lãi/lỗ**, **Top 100 / Top 250** CoinGecko, **Trending**, **Exchanges** (trust score, dự trữ + dòng tiền vào/ra sàn), **Mạng lưới** (Ethereum, BNB Chain, Solana…), **Spot Binance**, **Phái sinh** (funding, mark−index), **Bộ lọc** kỹ thuật (RSI, MA50/200, MACD, golden/death cross, bứt phá + KL, preset), **Đa biểu đồ** 2×2 realtime, **Tương quan** (ma trận, beta vs BTC, biến động), **Thị trường** (thị phần, Altcoin Season, Fear & Greed, **gợi ý mua/bán ngắn·trung·dài hạn**, heatmap kèm % thị phần, nhóm ngành, trending), **DeFi & Doanh thu** (TVL, chains, giao thức, fees/revenue P/F P/S, DEX, stablecoin), **Bitcoin On-chain** (halving, độ khó, phí, hashrate, nhiệt kế chu kỳ, 11 chart Rainbow / 200W MA / Pi Cycle / Mayer / Puell / S2F…), **Ví BTC & cá voi** (tra địa chỉ, sổ nhãn, whale realtime). Pane chi tiết: tokenomics, chart kỹ thuật (dùng chung Bảng giá CK, khoảng 1 ngày → tất cả, chỉ báo chọn bằng checkbox), **khuyến nghị** mua/bán ngắn·trung·dài hạn + **kiểm chứng quá khứ** (backtest), sổ lệnh realtime, phái sinh (OI, long/short, taker), hồ sơ. 🔔 cảnh báo giá + tín hiệu kỹ thuật (golden cross, MACD, RSI, vùng mua/bán), 🧮 DCA / quy đổi VND / giá thanh lý / khối lượng theo rủi ro. ADR #16 |
| One Editor | [`tools/one-editor.html`](tools/one-editor.html) + `tools/one-editor-preview-sandbox.html` (sinh từ `src/one-editor/`) | Soạn code + text kiểu VS Code / Sublime / Notepad++: Explorer + **1–4 view** (2 cột, 3 cột, 2 hàng, 2×2, clone), tab, **ghi chú tự lưu** (IndexedDB, khôi phục khi F5), mở/lưu **file + folder** trên máy, kéo-thả, **tự nhận diện ngôn ngữ** (143 ngôn ngữ CodeMirror 6), Command Palette / Quick Open / symbol / bookmark / macro. **▶ Chạy → tab kết quả ở view kia, tự cập nhật**: format (JSON/XML tự sửa, SQL, FIX, Prettier), minify, JSON ⇄ YAML ⇄ XML ⇄ CSV, HTML → Markdown, JSON → Go/TS/C#/Java/C++. **So sánh 2 view**, bảng mã + EOL + thao tác dòng/cột/MIME/hash kiểu Notepad++, file > 50 MB theo đoạn. **Preview** sơ đồ (Mermaid + chart, PlantUML, D2, DBML, Structurizr, Graphviz — trong iframe sandbox), Markdown, HTML, SVG, bảng CSV/JSON, draw.io (opt-in). **Tìm / thay trong nhiều file** (tab + ghi chú + folder), xuất .txt / in / Copy as HTML có màu. **Dịch kiểu Google Translate** (bộ dịch trên máy của Chrome / Edge, không có thì hỏi rồi mới gửi MyMemory; dán link ⇒ dịch cả trang web qua Jina Reader), đọc to, từ điển + IPA tiếng Anh. **Phase 8**: JWT / URL / epoch / hex + tooltip, lịch sử cục bộ, cây + JSONPath / XPath, lint khi gõ, Rainbow CSV, lọc log + tail -f, hover FIX, Outline + breadcrumbs, Goto Anything, bộ phím Sublime / Notepad++ + Vim, Emmet, snippet, phiên có tên, link + ghi chú có mật khẩu. Offline; ADR #19–#22 | **Phase 9:** cron (giải thích + lần chạy kế), CSV / JSON → SQL INSERT / UPDATE, JSON → JSON Schema, thay hàng loạt, ký tự vô hình / `U+XXXX`, bảng Markdown + TOC, recipe kiểu CyberChef, regex tester, chạy HTML / JS trong sandbox (console, dừng vòng lặp vô hạn), code → ảnh PNG / SVG.

## Dùng

1. Mở `index.html` (trang chủ) hoặc thẳng `tools/data-workbench.html` bằng Chrome/Edge/Firefox.
2. Chọn tab, dán nội dung, bấm **Mở file…** hoặc kéo-thả file vào trang. **Ctrl+Enter** = chạy. Nút **VI | EN** góc trên-phải đổi ngôn ngữ giao diện; **🔗 Chia sẻ link** chép link chứa dữ liệu + tuỳ chọn (sau dấu `#`, không gửi lên server).
3. Xem kết quả + danh sách thay đổi (bấm dòng để nhảy tới vị trí); **Gửi kết quả sang…** để chuyển sang tab khác.

Thử nhanh với mẫu lỗi: thêm `?demo=json`, `?demo=xml` hoặc `?demo=html` vào URL (tab Format); `?tab=convert|csv|diff|code` mở thẳng tab.

> Tự sửa lỗi là "đoán" ý định ban đầu — luôn đọc lại danh sách thay đổi trước khi dùng kết quả.

## Cấu trúc repo

```text
index.html       # trang chủ: danh sách tool
study.html       # trang Ôn tập: card các bài thi trắc nghiệm (không liên kết từ index.html)
study/           # mỗi bài thi 1 file .html tự chứa, ngân hàng đề inline — playbook: docs/study/README.md
tools/           # mỗi tool 1 file .html tự chứa (data-workbench.html là file SINH RA — đừng sửa tay)
src/data-workbench/   # nguồn module của Data Workbench → pwsh scripts/build-data-workbench-single-file.ps1
src/fix-message-parser/  # nguồn module của FIX Parser → pwsh scripts/build-single-file-tool.ps1 -Tool fix-message-parser
src/vietnamese-lunar-calendar/  # nguồn module của Lịch vạn niên → pwsh scripts/build-single-file-tool.ps1 -Tool vietnamese-lunar-calendar
src/vn-stock-price-board/  # nguồn module của Bảng giá chứng khoán → pwsh scripts/build-single-file-tool.ps1 -Tool vn-stock-price-board
src/one-editor/  # nguồn module của One Editor → pwsh scripts/build-single-file-tool.ps1 -Tool one-editor (ra 2 file HTML + 4 file JS nạp lười: one-editor-data-tools.js, one-editor-fix-dictionary.js, one-editor-editor-extras.js, one-editor-power-tools.js)
docs/            # tài liệu (single source of truth); docs/tools/<tool>.md = kiến thức riêng từng tool
ai-context/      # ngữ cảnh cho AI agent (đọc project-context.md đầu tiên)
CLAUDE.md · AGENTS.md · GEMINI.md · .github/copilot-instructions.md · .agent/   # config từng AI tool
scripts/         # link-shared-skills.ps1 · build-single-file-tool.ps1 (+ wrapper build-data-workbench-single-file.ps1) · generate-fix-dictionary-from-quickfix-xml.js
```

### Sửa Data Workbench

```powershell
# sửa file trong src/data-workbench/, rồi:
pwsh scripts/build-data-workbench-single-file.ps1          # ghép → tools/data-workbench.html
pwsh scripts/build-data-workbench-single-file.ps1 -Check   # báo STALE nếu quên build
node --test src/data-workbench/tests/pure-modules.test.js  # test parser/converter/diff
```

### Sửa FIX Parser

```powershell
# sửa file trong src/fix-message-parser/, rồi:
pwsh scripts/build-single-file-tool.ps1 -Tool fix-message-parser          # ghép → tools/fix-message-parser.html
pwsh scripts/build-single-file-tool.ps1 -Tool fix-message-parser -Check   # báo STALE nếu quên build
pwsh scripts/build-single-file-tool.ps1 [-Check]                          # bỏ -Tool = mọi tool (sửa module chung ở src/data-workbench/ thì chạy lệnh này)
node --test src/fix-message-parser/tests/*.test.js                        # codec, validator, mẫu Server Sàn, chuỗi lệnh, i18n
```

### Sửa Lịch vạn niên

```powershell
pwsh scripts/build-single-file-tool.ps1 -Tool vietnamese-lunar-calendar   # ghép src/vietnamese-lunar-calendar/ → tools/vietnamese-lunar-calendar.html
node --test src/vietnamese-lunar-calendar/tests/*.test.js                 # đổi lịch 1800–2199, đối chiếu lichngaytot, parser ngày, ngày lễ, thời tiết, i18n
```

### Sửa Bảng giá Crypto

```powershell
pwsh scripts/build-single-file-tool.ps1 -Tool crypto-market-board   # ghép src/crypto-market-board/ → tools/crypto-market-board.html
node --test src/crypto-market-board/tests/*.test.js
```

### Sửa Bảng giá chứng khoán

```powershell
pwsh scripts/build-single-file-tool.ps1 -Tool vn-stock-price-board   # ghép src/vn-stock-price-board/ → tools/vn-stock-price-board.html
node --test src/vn-stock-price-board/tests/*.test.js            # chuẩn hoá quote VPS, màu giá, phiên, danh mục, sort, chart, i18n
```

### Sửa One Editor

```powershell
pwsh scripts/build-single-file-tool.ps1 -Tool one-editor          # ghép src/one-editor/ → tools/one-editor.html + one-editor-preview-sandbox.html + 4 bundle JS nạp lười (*.template.js)
pwsh scripts/build-single-file-tool.ps1 -Tool one-editor -Check   # báo STALE mọi file sinh ra
node --test src/one-editor/tests/pure-modules.test.js src/one-editor/tests/notepadpp-text-tools.test.js src/one-editor/tests/format-convert-compare.test.js src/one-editor/tests/live-preview-pure-modules.test.js src/one-editor/tests/markdown-table-preview.test.js src/one-editor/tests/i18n-dictionary-coverage.test.js src/one-editor/tests/find-in-files-export.test.js src/one-editor/tests/translate-pure-modules.test.js src/one-editor/tests/devtools-pure-modules.test.js src/one-editor/tests/data-tools-pure-modules.test.js src/one-editor/tests/log-fix-pure-modules.test.js src/one-editor/tests/editor-extras-pure-modules.test.js src/one-editor/tests/power-tools-pure-modules.test.js src/one-editor/tests/transform-recipe-pure-modules.test.js src/one-editor/tests/regex-run-code-pure-modules.test.js src/one-editor/tests/code-image-pure-modules.test.js
```

Sau khi clone, chạy `pwsh scripts/link-shared-skills.ps1` một lần để tạo junction skills cho các AI tool.

## Thêm tool mới

1. Tạo `tools/<ten-viec-kebab-case>.html`, tự chứa (CSS/JS inline, không CDN, không gọi mạng); chép dòng tác giả `<div class="author">` (+ CSS `.author`) từ tool có sẵn, đặt ngay sau `</footer>`.
2. **Song ngữ English + Tiếng Việt (bắt buộc):** nút `VI | EN` góc trên-phải, module `I18n` + từ điển English — làm theo
   checklist song ngữ ở [`docs/architecture/README.md`](docs/architecture/README.md) mục 3.
3. **Dữ liệu mẫu để test nhanh (bắt buộc):** dropdown `Thử mẫu…` (chọn là nạp + chạy, chỉ hiện khi chạy local) + URL `?demo=<key>`; có mẫu hợp lệ
   và mẫu lỗi/ca khó, dữ liệu giả, nội dung bằng English — checklist "Dữ liệu mẫu" cùng mục 3 ở trên.
4. **Link chia sẻ (bắt buộc):** nút `🔗 Chia sẻ link` tạo link `#pako:` mang dữ liệu + tuỳ chọn, mở link là nạp + chạy; đọc thêm `?data=` —
   checklist "Link chia sẻ" cùng mục 3 ở trên (ADR #9).
5. **Hai tầng màu (bắt buộc):** header teal `#164e63` cho việc cấp ứng dụng + tab, toolbar nền tint cho việc trên dữ liệu + nút chính —
   mục "Hai tầng màu" cùng mục 3 ở trên (ADR #10).
6. Thêm 1 card vào `index.html` (kèm bản English của tên + mô tả trong `I18n.add` của `index.html`) và 1 dòng vào bảng **Tools** ở trên.
7. Viết `docs/tools/<ten-viec-kebab-case>.md` (ghi các key `?demo=` và contract link chia sẻ) theo khung trong [`docs/tools/README.md`](docs/tools/README.md).

Quy ước chi tiết: [`docs/decisions/README.md`](docs/decisions/README.md).
