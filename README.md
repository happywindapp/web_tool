# web_tool

Bộ công cụ web tiện ích chạy **100% trong trình duyệt**. Mỗi tool là **1 file HTML tự chứa** trong `tools/` —
không cài đặt, không build, không gửi dữ liệu đi đâu. Mở file là dùng được, kể cả offline.

## Tools

| Tool | File | Làm gì |
|------|------|--------|
| Đọc & Format JSON · XML · HTML | [`tools/format-json-xml-html.html`](tools/format-json-xml-html.html) | Kiểm tra cú pháp (báo dòng/cột), tự sửa lỗi phổ biến (thiếu dấu phẩy, nháy đơn, chú thích, thẻ chưa đóng…), format 2/4 space/Tab, thu gọn 1 dòng, xem dạng cây, sao chép/tải về |
| Soạn & xem trước sơ đồ Mermaid | [`tools/mermaid-diagram-editor.html`](tools/mermaid-diagram-editor.html) | Live editor như mermaid.live nhưng offline: tô màu cú pháp, báo dòng lỗi, 22 sơ đồ mẫu, theme/kiểu nét, pan-zoom, xuất PNG (1–4x)/SVG/.mmd, chép ảnh/Markdown, link chia sẻ `#pako:` (tương thích mermaid.live), nháp + lịch sử trong trình duyệt. Cần kèm `tools/vendor/` |

## Dùng

1. Mở `index.html` (trang chủ) hoặc thẳng `tools/format-json-xml-html.html` bằng Chrome/Edge/Firefox.
2. Dán nội dung, bấm **Mở file…** hoặc kéo-thả file vào trang.
3. **Kiểm tra** → xem lỗi; **Format & sửa lỗi** → xem kết quả + danh sách thay đổi (bấm dòng để nhảy tới vị trí).

Thử nhanh với mẫu lỗi: thêm `?demo=json`, `?demo=xml` hoặc `?demo=html` vào URL.

> Tự sửa lỗi là "đoán" ý định ban đầu — luôn đọc lại danh sách thay đổi trước khi dùng kết quả.

## Cấu trúc repo

```text
index.html       # trang chủ: danh sách tool
tools/           # mỗi tool 1 file .html tự chứa
docs/            # tài liệu (single source of truth); docs/tools/<tool>.md = kiến thức riêng từng tool
ai-context/      # ngữ cảnh cho AI agent (đọc project-context.md đầu tiên)
CLAUDE.md · AGENTS.md · GEMINI.md · .github/copilot-instructions.md · .agent/   # config từng AI tool
scripts/         # link-shared-skills.ps1
```

Sau khi clone, chạy `pwsh scripts/link-shared-skills.ps1` một lần để tạo junction skills cho các AI tool.

## Thêm tool mới

1. Tạo `tools/<ten-viec-kebab-case>.html`, tự chứa (CSS/JS inline, không CDN, không gọi mạng).
2. Thêm 1 card vào `index.html` và 1 dòng vào bảng **Tools** ở trên.
3. Viết `docs/tools/<ten-viec-kebab-case>.md` theo khung trong [`docs/tools/README.md`](docs/tools/README.md).

Quy ước chi tiết: [`docs/decisions/README.md`](docs/decisions/README.md).
