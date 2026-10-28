# web_tool

Bộ công cụ web tiện ích chạy **100% trong trình duyệt**. Mỗi tool là **1 file HTML tự chứa** trong `tools/` —
không cài đặt, không build, không gửi dữ liệu đi đâu. Mở file là dùng được, kể cả offline.

## Tools

| Tool | File | Làm gì |
|------|------|--------|
| Data Workbench | [`tools/data-workbench.html`](tools/data-workbench.html) (sinh từ `src/data-workbench/`) | 5 tab: **Format JSON·XML·HTML** (kiểm tra, tự sửa lỗi, format 2/3/4/8/Tab, thu gọn, sắp khóa, giải JSON lồng, thành chuỗi JSON, cây) · **Chuyển đổi** JSON/CSV/TSV/XML/YAML → JSON/CSV/TSV/XML/YAML/JS object/SQL INSERT/Markdown/HTML table · **Bảng CSV** (bảng mã, sort, lọc, sửa ô, thêm/xoá hàng-cột, xuất có BOM) · **So sánh** (theo dòng, JSON theo cấu trúc) · **Format CSS·JS** |
| Soạn & xem trước sơ đồ Mermaid | [`tools/mermaid-diagram-editor.html`](tools/mermaid-diagram-editor.html) | Live editor như mermaid.live nhưng offline: tô màu cú pháp, báo dòng lỗi, 22 sơ đồ mẫu, theme/kiểu nét, pan-zoom, xuất PNG (1–4x)/SVG/.mmd, chép ảnh/Markdown, link chia sẻ `#pako:` (tương thích mermaid.live), nháp + lịch sử trong trình duyệt. Cần kèm `tools/vendor/` |

## Dùng

1. Mở `index.html` (trang chủ) hoặc thẳng `tools/data-workbench.html` bằng Chrome/Edge/Firefox.
2. Chọn tab, dán nội dung, bấm **Mở file…** hoặc kéo-thả file vào trang. **Ctrl+Enter** = chạy. Nút **VI | EN** góc trên-phải đổi ngôn ngữ giao diện.
3. Xem kết quả + danh sách thay đổi (bấm dòng để nhảy tới vị trí); **Gửi kết quả sang…** để chuyển sang tab khác.

Thử nhanh với mẫu lỗi: thêm `?demo=json`, `?demo=xml` hoặc `?demo=html` vào URL (tab Format); `?tab=convert|csv|diff|code` mở thẳng tab.

> Tự sửa lỗi là "đoán" ý định ban đầu — luôn đọc lại danh sách thay đổi trước khi dùng kết quả.

## Cấu trúc repo

```text
index.html       # trang chủ: danh sách tool
tools/           # mỗi tool 1 file .html tự chứa (data-workbench.html là file SINH RA — đừng sửa tay)
src/data-workbench/   # nguồn module của Data Workbench → pwsh scripts/build-data-workbench-single-file.ps1
docs/            # tài liệu (single source of truth); docs/tools/<tool>.md = kiến thức riêng từng tool
ai-context/      # ngữ cảnh cho AI agent (đọc project-context.md đầu tiên)
CLAUDE.md · AGENTS.md · GEMINI.md · .github/copilot-instructions.md · .agent/   # config từng AI tool
scripts/         # link-shared-skills.ps1 · build-data-workbench-single-file.ps1
```

### Sửa Data Workbench

```powershell
# sửa file trong src/data-workbench/, rồi:
pwsh scripts/build-data-workbench-single-file.ps1          # ghép → tools/data-workbench.html
pwsh scripts/build-data-workbench-single-file.ps1 -Check   # báo STALE nếu quên build
node --test src/data-workbench/tests/pure-modules.test.js  # test parser/converter/diff
```

Sau khi clone, chạy `pwsh scripts/link-shared-skills.ps1` một lần để tạo junction skills cho các AI tool.

## Thêm tool mới

1. Tạo `tools/<ten-viec-kebab-case>.html`, tự chứa (CSS/JS inline, không CDN, không gọi mạng); chép dòng tác giả `<div class="author">` (+ CSS `.author`) từ tool có sẵn, đặt ngay sau `</footer>`.
2. Thêm 1 card vào `index.html` và 1 dòng vào bảng **Tools** ở trên.
3. Viết `docs/tools/<ten-viec-kebab-case>.md` theo khung trong [`docs/tools/README.md`](docs/tools/README.md).

Quy ước chi tiết: [`docs/decisions/README.md`](docs/decisions/README.md).
