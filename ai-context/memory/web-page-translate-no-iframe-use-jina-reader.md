# Dịch trang web trong tool client-side: không nhúng được Google/Yandex, dùng Jina Reader

**Triệu chứng.** Muốn "dán link ⇒ view kia hiện trang đã dịch" (như Google Dịch trang web) trong tool 1 file HTML chạy `file://`. Nhúng iframe Google Dịch / Yandex ra trang trắng; `fetch` thẳng trang lạ bị CORS chặn.

**Nguyên nhân (đo 2026-11-20).**
- `*.translate.goog` gửi `frame-ancestors *.translate.goog`; `translate.google.com/translate` gửi `X-Frame-Options: SAMEORIGIN`; Yandex `X-Frame-Options: DENY`.
- Proxy CORS công khai: `api.allorigins.win` 522, `corsproxy.io` 401 (cần key).

**Cách xử lý đúng.**
- Lấy nội dung qua **Jina Reader** `https://r.jina.ai/<url>` với `Accept: application/json` (header safelisted ⇒ không preflight): trả `{data:{title,url,content (Markdown),metadata.lang}}`, `Access-Control-Allow-Origin` cả với `Origin: null`. Lỗi ⇒ `{data:null, code, readableMessage}`; free ~20 req/phút (429).
- Chỉ gửi URL (bỏ `#fragment`) sau `confirm`; dịch Markdown bằng bộ dịch sẵn có nhưng **tách URL, `![`, inline code, `|`, khoảng trắng đầu/cuối** ra khỏi phần gửi cho bộ dịch (One Editor: `WebPage.plan`).
- Giao diện gốc ⇒ chỉ có nút mở Google Dịch ở tab mới.
- Chỉ lấy bài viết: header `X-Target-Selector: main, article, [role=main]` (+ `X-Remove-Selector` menu/quảng cáo) — CNN 34.608 → 5.505 ký tự; trang không có các thẻ đó ⇒ 422 "No content available … with target selector" ⇒ gọi lại không selector.
- **Đừng thêm `img-src https:` vào trang chính để hiện ảnh trang**: SVG trong link chia sẻ sẽ tự tải ảnh ngoài qua `srcset`, `background=`, CSS custom property có escape (`--b:\75 rl(...)` — Chrome giữ escape khi serialize) — sanitizer blocklist không đóng hết. Ảnh ⇒ link bấm mở tab mới. Xem ADR #22 (bổ sung 2026-11-20) và `docs/tools/one-editor.md`.
