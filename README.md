# web_tool

Bộ công cụ web tiện ích chạy **100% trong trình duyệt**. Mỗi tool là **1 file HTML tự chứa** trong `tools/` —
không cài đặt, không build, không gửi dữ liệu đi đâu (ngoại lệ: tab draw.io chỉ khi bấm kết nối; Bảng giá chứng khoán tải giá từ API công khai VPS). Mở file là dùng được, kể cả offline.

## Tools

| Tool | File | Làm gì |
|------|------|--------|
| Data Workbench | [`tools/data-workbench.html`](tools/data-workbench.html) (sinh từ `src/data-workbench/`) | 5 tab: **Format JSON·XML·HTML** (kiểm tra, tự sửa lỗi, format 2/3/4/8/Tab, thu gọn, sắp khóa, giải JSON lồng, thành chuỗi JSON, cây) · **Chuyển đổi** JSON/CSV/TSV/XML/YAML → JSON/CSV/TSV/XML/YAML/JS object/SQL INSERT/Markdown/HTML table · **Bảng CSV** (bảng mã, sort, lọc chữ + **lọc theo cột dạng chip / chuột phải chỉ hiện-loại trừ**, sửa ô, thêm/xoá + **kéo-thả đổi chỗ cột**, xuất có BOM + **giữ số cho Excel**) · **So sánh** (theo dòng, JSON theo cấu trúc) · **Format CSS·JS**. Chung: **💾 lưu phiên** đặt tên, **giao diện Tự động/Sáng/Tối** |
| Soạn & xem trước sơ đồ | [`tools/diagram-editor.html`](tools/diagram-editor.html) (file sinh ra từ `src/diagram-editor/`) | 6 tab **Mermaid · PlantUML · draw.io · DBML · D2 · Structurizr**: tô màu cú pháp, báo dòng lỗi, sơ đồ mẫu, pan-zoom, xuất PNG (1–4x)/SVG/mã nguồn, chép ảnh/Markdown, link chia sẻ `#pako:` (tab Mermaid tương thích mermaid.live), nháp + lịch sử + **💾 lưu sơ đồ đặt tên** riêng từng tab, **giao diện Tự động/Sáng/Tối**. Năm tab chạy offline, cần kèm `tools/vendor/`; **riêng draw.io cần mạng** và chỉ kết nối `embed.diagrams.net` sau khi bấm đồng ý |
| FIX Parser | [`tools/fix-message-parser.html`](tools/fix-message-parser.html) (sinh từ `src/fix-message-parser/`) | Dán message/log FIX (SOH, `\|`, `^A`…, kèm tiền tố log) → bảng message (giờ UTC/VN, gửi→nhận, loại, Symbol, ClOrdID, trạng thái…) + chi tiết từng tag (tên, ý nghĩa giá trị, repeating group; rê chuột = tooltip giải thích theo FIX Orchestra + spec CBTS v1.15 của sàn, mã lỗi Server Sàn). Kiểm BodyLength/CheckSum, thứ tự header, tag bắt buộc, kiểu giá trị; từ điển FIX 4.4 + **Server Sàn** (BCGD `35=s/t/u`, ĐTTTT `S/AI/AJ/Z`); lọc/tìm `tag=value`, **lọc theo cột + khoảng giờ, kéo-thả thứ tự cột, ghi chú từng message, lưu phân tích, từ điển riêng CSV, ẩn danh theo nhóm (bí danh giữ chuỗi lệnh), chọn chuỗi lệnh / cha–con, Alt+rê chuột tra tag trên ô nhập, theme sáng/tối**, xuất CSV (Excel giữ nguyên giá trị)/JSON, chép bản sửa 9/10. Có sẵn mẫu nhiều báo cáo giao dịch Server Sàn |
| Lịch vạn niên | [`tools/vietnamese-lunar-calendar.html`](tools/vietnamese-lunar-calendar.html) (sinh từ `src/vietnamese-lunar-calendar/`) | Lịch tháng dương–âm (bắt đầu Thứ Hai): ngày âm, mùng 1 dạng `1/10`, ngày hoàng đạo, ngày lễ dương/âm, tiết khí. **Đổi ngày** dương ↔ âm bằng 1 ô nhập (`12/11/2026`, `âm 15/8/2026`, tháng nhuận `âm 1/6n/2025`), báo lỗi ngày không tồn tại. Chi tiết ngày: can chi năm/tháng/ngày/giờ + nạp âm, ngũ hành ngày, tiết khí (giờ giao tiết), thần hoàng/hắc đạo, trực (nên/kỵ), nhị thập bát tú, Khổng Minh, ngày kỵ, Hỷ/Tài/Hắc thần, tuổi xung ngày/tháng, bảng 12 giờ (can chi, thần, Lý Thuần Phong), đếm ngày tới Tết. Năm 1800–2199, giờ Việt Nam (UTC+7). **Tab Tử vi** (tham khảo, giải trí) theo tên + ngày/giờ sinh: tứ trụ, mệnh nạp âm, màu/số hợp, cung mệnh bát trạch + 8 hướng, tuổi hợp/xung, thần số học, sao chiếu mệnh + Tam Tai/Kim Lâu/Hoang Ốc/Thái Tuế năm nay & năm sau, 12 tháng tới, 10 năm tới, 4 đỉnh cao cuộc đời |
| Bảng giá chứng khoán | [`tools/vn-stock-price-board.html`](tools/vn-stock-price-board.html) (sinh từ `src/vn-stock-price-board/`) | Bảng giá realtime kiểu iBoard/CafeF/VNDirect, thêm tab **Thị trường** (độ rộng, heatmap theo ngành, ngành mạnh/yếu, top mã, khối ngoại), **Bộ lọc** cổ phiếu toàn thị trường, bảng giá theo **ngành ICB**, 🔔 cảnh báo giá, 📅 lịch sự kiện danh mục, ghi chú + giá mục tiêu riêng: thanh chỉ số VNINDEX · VN30 · HNX · UPCOM (sparkline, tăng/đứng/giảm), tab ★ Danh mục · VN30 · VN100 · HOSE · HNX · HNX30 · UPCOM · ETF · Chứng quyền + rổ VNMID/VNSML/VNDIAMOND/VNFINLEAD/VNX50; bảng 3 bước giá mua/bán + khớp lệnh + Cao/Thấp/TB + ĐTNN, màu trần/sàn/TC/tăng/giảm, flash ô đổi giá, sort, lọc, chế độ gọn, đơn vị KL ×10/cổ phiếu, xuất CSV. Pane chi tiết mã: sổ lệnh 3 bước, **biểu đồ kỹ thuật** (Lightweight Charts, nến VNDirect 1 tuần → tất cả lịch sử, nến 5m → 1 tháng, 6 kiểu chart, 18 chỉ báo, vẽ đường ngang/xu hướng/Fibonacci/đo, so với VNINDEX, PNG — gọn trong pane + cửa sổ toàn màn hình), biểu đồ giá + KL trong ngày, **9 tab chi tiết** (Tổng quan + chỉ số định giá + hiệu suất giá + khối ngoại · Định giá: Snowflake 5 trục, giá hợp lý Graham/P/E/P/B/DCF, P/E–P/B 5 năm, Piotroski, Altman Z · Kỹ thuật · Khớp lệnh · Tin tức · Báo cáo tài chính quý/năm · Sự kiện quyền · Hồ sơ + cổ đông lớn · Khuyến nghị giá mục tiêu), mua/bán chủ động, lịch sử khớp, thông tin chứng quyền. Dữ liệu từ **API công khai VPS** + nến lịch sử, tin tức, BCTC **VNDirect** (không chính thức, ADR #13 #14 #15), poll 3–30s, ngoài giờ tự giãn 60s |

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
node --test src/vietnamese-lunar-calendar/tests/*.test.js                 # đổi lịch 1800–2199, đối chiếu lichngaytot, parser ngày, ngày lễ, i18n
```

### Sửa Bảng giá chứng khoán

```powershell
pwsh scripts/build-single-file-tool.ps1 -Tool vn-stock-price-board   # ghép src/vn-stock-price-board/ → tools/vn-stock-price-board.html
node --test src/vn-stock-price-board/tests/*.test.js            # chuẩn hoá quote VPS, màu giá, phiên, danh mục, sort, chart, i18n
```

Sau khi clone, chạy `pwsh scripts/link-shared-skills.ps1` một lần để tạo junction skills cho các AI tool.

## Thêm tool mới

1. Tạo `tools/<ten-viec-kebab-case>.html`, tự chứa (CSS/JS inline, không CDN, không gọi mạng); chép dòng tác giả `<div class="author">` (+ CSS `.author`) từ tool có sẵn, đặt ngay sau `</footer>`.
2. **Song ngữ English + Tiếng Việt (bắt buộc):** nút `VI | EN` góc trên-phải, module `I18n` + từ điển English — làm theo
   checklist song ngữ ở [`docs/architecture/README.md`](docs/architecture/README.md) mục 3.
3. **Dữ liệu mẫu để test nhanh (bắt buộc):** dropdown `Thử mẫu…` (chọn là nạp + chạy) + URL `?demo=<key>`; có mẫu hợp lệ
   và mẫu lỗi/ca khó, dữ liệu giả, nội dung bằng English — checklist "Dữ liệu mẫu" cùng mục 3 ở trên.
4. **Link chia sẻ (bắt buộc):** nút `🔗 Chia sẻ link` tạo link `#pako:` mang dữ liệu + tuỳ chọn, mở link là nạp + chạy; đọc thêm `?data=` —
   checklist "Link chia sẻ" cùng mục 3 ở trên (ADR #9).
5. **Hai tầng màu (bắt buộc):** header teal `#164e63` cho việc cấp ứng dụng + tab, toolbar nền tint cho việc trên dữ liệu + nút chính —
   mục "Hai tầng màu" cùng mục 3 ở trên (ADR #10).
6. Thêm 1 card vào `index.html` (kèm bản English của tên + mô tả trong `I18n.add` của `index.html`) và 1 dòng vào bảng **Tools** ở trên.
7. Viết `docs/tools/<ten-viec-kebab-case>.md` (ghi các key `?demo=` và contract link chia sẻ) theo khung trong [`docs/tools/README.md`](docs/tools/README.md).

Quy ước chi tiết: [`docs/decisions/README.md`](docs/decisions/README.md).
