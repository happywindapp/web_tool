# Headless: script chèn từ CDP bỏ qua kiểm eval của CSP

- Đo 2026-11-20 (One Editor phase 3a): trang có CSP `script-src 'self' 'unsafe-inline'` (không `'unsafe-eval'`) — `eval` lúc trang tự chạy bị chặn (`EvalError`), nhưng `<script>` tạo từ `page.evaluate` (puppeteer/CDP) rồi gọi `eval` vẫn **chạy được**; `eval` gọi thẳng trong `page.evaluate` cũng chạy.
- Muốn kiểm CSP chặn eval bằng headless: dùng `setTimeout("window.__x = 1", 0)` (chuỗi) trong `page.evaluate` rồi đọc `window.__x` — cái này vẫn bị CSP chặn. Console sẽ có lỗi "Evaluating a string as JavaScript violates…" ⇒ lọc khỏi danh sách lỗi trang.
- Không kết luận "CSP hỏng" từ phép thử chèn script qua CDP.
