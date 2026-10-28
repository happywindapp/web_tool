# Deployment — web_tool

> Không có server, không build, không CI/CD.

## 1. Chạy

```powershell
start C:\_web_tool\index.html                                  # trang chủ: danh sách tool
start C:\_web_tool\tools\data-workbench.html                    # mở thẳng 1 tool
```

- Thử nhanh: thêm `?demo=json` (hoặc `xml`, `html`) vào URL → nạp mẫu lỗi và format ngay.
- `tools/data-workbench.html` là file sinh ra: sửa `src/data-workbench/` rồi `pwsh scripts/build-data-workbench-single-file.ps1`
  (`-Check` trước khi commit để chắc không quên build). Pages publish file sinh ra đã commit — không cần build trên server.
- Trình duyệt: Chromium/Edge/Firefox hiện đại (ES2018+, `DOMParser`, `Blob`, Clipboard API).

## 2. Phân phối

| Cách | Trạng thái |
|------|-----------|
| Gửi/clone repo, mở file local | Đang dùng |
| GitHub Pages | Nguồn: nhánh `main`, thư mục `/` (root) → `https://happywindapp.github.io/web_tool/`. Bật ở repo **Settings → Pages → Deploy from a branch**; tự build lại sau mỗi push. Không đặt thư mục web bắt đầu bằng `_` (Jekyll của Pages bỏ qua) |

## 3. Kiểm thử thủ công trước khi push

1. Mở 3 URL `?demo=json`, `?demo=xml`, `?demo=html` → kết quả format được, danh sách fix hợp lý.
2. Kéo-thả 1 file thật lớn (vài MB) → không treo tab.
3. DevTools → tab Network: **0 request** ngoài chính file.

## 4. Biến môi trường

Không có — mọi tool chạy client-side.
