# API Contracts — web_tool

> Không expose REST/gRPC. "Contract" = các giao diện mà người dùng/link ngoài có thể phụ thuộc vào —
> đổi chúng là breaking.

## `format-json-xml-html.html`

| Giao diện | Hợp đồng |
|-----------|----------|
| URL query `?demo=json\|xml\|html` | Nạp file mẫu lỗi tương ứng rồi chạy "Format & sửa lỗi" ngay (dùng để demo/test thủ công) |
| Input | Dán text · `<input type=file>` · kéo-thả file vào trang; đọc **UTF-8**, bỏ BOM |
| Nhận diện theo đuôi | Danh sách đuôi ở `docs/business/README.md` §2 (`EXT` trong code) |
| Tên file tải về | `<base>.formatted.<ext>`; MIME `text/plain;charset=utf-8` |
| Clipboard | `navigator.clipboard.writeText` (cần secure context: `file://`, `https://` hoặc `localhost`) |
| Mạng | **Không có request nào** — là cam kết hiển thị trên UI |
