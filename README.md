# web_tool

Bộ công cụ web tiện ích chạy **100% trong trình duyệt**. Mỗi tool là **1 file HTML tự chứa** trong `tools/` —
không cài đặt, không build, không gửi dữ liệu đi đâu. Mở file là dùng được, kể cả offline.

## Tools

| Tool | File | Làm gì |
|------|------|--------|
| Data Workbench | [`tools/data-workbench.html`](tools/data-workbench.html) (sinh từ `src/data-workbench/`) | 5 tab: **Format JSON·XML·HTML** (kiểm tra, tự sửa lỗi, format 2/3/4/8/Tab, thu gọn, sắp khóa, giải JSON lồng, thành chuỗi JSON, cây) · **Chuyển đổi** JSON/CSV/TSV/XML/YAML → JSON/CSV/TSV/XML/YAML/JS object/SQL INSERT/Markdown/HTML table · **Bảng CSV** (bảng mã, sort, lọc, sửa ô, thêm/xoá hàng-cột, xuất có BOM) · **So sánh** (theo dòng, JSON theo cấu trúc) · **Format CSS·JS** |
| Soạn & xem trước sơ đồ Mermaid | [`tools/mermaid-diagram-editor.html`](tools/mermaid-diagram-editor.html) | Live editor như mermaid.live nhưng offline: tô màu cú pháp, báo dòng lỗi, 22 sơ đồ mẫu, theme/kiểu nét, pan-zoom, xuất PNG (1–4x)/SVG/.mmd, chép ảnh/Markdown, link chia sẻ `#pako:` (tương thích mermaid.live), nháp + lịch sử trong trình duyệt. Cần kèm `tools/vendor/` |
| FIX Parser | [`tools/fix-message-parser.html`](tools/fix-message-parser.html) (sinh từ `src/fix-message-parser/`) | Dán message/log FIX (SOH, `\|`, `^A`…, kèm tiền tố log) → bảng message (giờ UTC/VN, gửi→nhận, loại, Symbol, ClOrdID, trạng thái…) + chi tiết từng tag (tên, ý nghĩa giá trị, repeating group; rê chuột = tooltip giải thích theo FIX Orchestra + spec CBTS v1.15 của sàn, mã lỗi Server Sàn). Kiểm BodyLength/CheckSum, thứ tự header, tag bắt buộc, kiểu giá trị; từ điển FIX 4.4 + **Server Sàn** (BCGD `35=s/t/u`, ĐTTTT `S/AI/AJ/Z`); lọc/tìm `tag=value`, **lọc theo cột + khoảng giờ, kéo-thả thứ tự cột, ghi chú từng message, lưu phân tích, từ điển riêng CSV, ẩn danh theo nhóm (bí danh giữ chuỗi lệnh), chọn chuỗi lệnh / cha–con, Alt+rê chuột tra tag trên ô nhập, theme sáng/tối**, xuất CSV (Excel giữ nguyên giá trị)/JSON, chép bản sửa 9/10. Có sẵn mẫu nhiều báo cáo giao dịch Server Sàn |

## Dùng

1. Mở `index.html` (trang chủ) hoặc thẳng `tools/data-workbench.html` bằng Chrome/Edge/Firefox.
2. Chọn tab, dán nội dung, bấm **Mở file…** hoặc kéo-thả file vào trang. **Ctrl+Enter** = chạy. Nút **VI | EN** góc trên-phải đổi ngôn ngữ giao diện; **🔗 Chia sẻ link** chép link chứa dữ liệu + tuỳ chọn (sau dấu `#`, không gửi lên server).
3. Xem kết quả + danh sách thay đổi (bấm dòng để nhảy tới vị trí); **Gửi kết quả sang…** để chuyển sang tab khác.

Thử nhanh với mẫu lỗi: thêm `?demo=json`, `?demo=xml` hoặc `?demo=html` vào URL (tab Format); `?tab=convert|csv|diff|code` mở thẳng tab.

> Tự sửa lỗi là "đoán" ý định ban đầu — luôn đọc lại danh sách thay đổi trước khi dùng kết quả.

## Cấu trúc repo

```text
index.html       # trang chủ: danh sách tool
tools/           # mỗi tool 1 file .html tự chứa (data-workbench.html là file SINH RA — đừng sửa tay)
src/data-workbench/   # nguồn module của Data Workbench → pwsh scripts/build-data-workbench-single-file.ps1
src/fix-message-parser/  # nguồn module của FIX Parser → pwsh scripts/build-single-file-tool.ps1 -Tool fix-message-parser
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

Sau khi clone, chạy `pwsh scripts/link-shared-skills.ps1` một lần để tạo junction skills cho các AI tool.

## Thêm tool mới

1. Tạo `tools/<ten-viec-kebab-case>.html`, tự chứa (CSS/JS inline, không CDN, không gọi mạng); chép dòng tác giả `<div class="author">` (+ CSS `.author`) từ tool có sẵn, đặt ngay sau `</footer>`.
2. **Song ngữ English + Tiếng Việt (bắt buộc):** nút `VI | EN` góc trên-phải, module `I18n` + từ điển English — làm theo
   checklist song ngữ ở [`docs/architecture/README.md`](docs/architecture/README.md) mục 3.
3. **Dữ liệu mẫu để test nhanh (bắt buộc):** dropdown `Thử mẫu…` (chọn là nạp + chạy) + URL `?demo=<key>`; có mẫu hợp lệ
   và mẫu lỗi/ca khó, dữ liệu giả, nội dung bằng English — checklist "Dữ liệu mẫu" cùng mục 3 ở trên.
4. **Link chia sẻ (bắt buộc):** nút `🔗 Chia sẻ link` tạo link `#pako:` mang dữ liệu + tuỳ chọn, mở link là nạp + chạy; đọc thêm `?data=` —
   checklist "Link chia sẻ" cùng mục 3 ở trên (ADR #9).
5. Thêm 1 card vào `index.html` (kèm bản English của tên + mô tả trong `I18n.add` của `index.html`) và 1 dòng vào bảng **Tools** ở trên.
6. Viết `docs/tools/<ten-viec-kebab-case>.md` (ghi các key `?demo=` và contract link chia sẻ) theo khung trong [`docs/tools/README.md`](docs/tools/README.md).

Quy ước chi tiết: [`docs/decisions/README.md`](docs/decisions/README.md).
