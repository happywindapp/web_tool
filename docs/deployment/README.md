# Deployment — web_tool

> Không có server, không build, không CI/CD.

## 1. Chạy

```powershell
start C:\_web_tool\_tools\format-json-xml-html.html            # mở bằng trình duyệt mặc định
```

- Thử nhanh: thêm `?demo=json` (hoặc `xml`, `html`) vào URL → nạp mẫu lỗi và format ngay.
- Trình duyệt: Chromium/Edge/Firefox hiện đại (ES2018+, `DOMParser`, `Blob`, Clipboard API).

## 2. Phân phối

| Cách | Trạng thái |
|------|-----------|
| Gửi/clone repo, mở file local | Đang dùng |
| GitHub Pages / host tĩnh nội bộ | **Chưa cấu hình** — chỉ cần serve thư mục `_tools/` (không cần build) |

## 3. Kiểm thử thủ công trước khi push

1. Mở 3 URL `?demo=json`, `?demo=xml`, `?demo=html` → kết quả format được, danh sách fix hợp lý.
2. Kéo-thả 1 file thật lớn (vài MB) → không treo tab.
3. DevTools → tab Network: **0 request** ngoài chính file.

## 4. Biến môi trường

Không có. Xem [server-config.example.md](../../server-config.example.md).
