# API Contracts — web_tool

> Không expose REST/gRPC. "Contract" = các giao diện mà người dùng/link ngoài có thể phụ thuộc vào —
> đổi chúng là breaking. Contract riêng từng tool (URL param, tên file tải về…) nằm trong `docs/tools/<tool>.md`.

## Contract chung mọi tool

| Giao diện | Hợp đồng |
|-----------|----------|
| Đường dẫn | `tools/<ten-tool>.html` là URL người dùng bookmark/chia sẻ → đổi tên/di chuyển là breaking |
| Trang chủ | `index.html` ở root liệt kê mọi tool |
| Mạng | **Không có request nào** — là cam kết hiển thị trên UI |
