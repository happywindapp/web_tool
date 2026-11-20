# iframe sandbox chạy cùng process trang chính ⇒ vòng lặp vô hạn treo cả trang (không "reload iframe" được)

**Triệu chứng.** Thiết kế "chạy code người dùng trong iframe sandbox, quá timeout thì trang chính reload iframe" không chạy: `while(true){}` trong iframe làm trang chính đứng hẳn — timer của trang chính không bao giờ tới lượt.

**Nguyên nhân.** Đo headless Chrome 157 trên `file://` (2026-11-21, One Editor phase 9c): iframe con `srcdoc` có `sandbox="allow-scripts"` (origin null) nằm **cùng process / cùng main thread** với trang cha. Site Isolation không tách nó ra; vòng lặp đồng bộ chiếm luôn thread của trang chính.

**Cách làm đúng.**
- JS thuần (không cần DOM) ⇒ chạy trong **Web Worker** (blob URL; CSP trang sandbox có `worker-src blob:`), heartbeat `setInterval` + watchdog ở trang sandbox ⇒ im lặng quá N giây thì `worker.terminate()`; luôn dừng được.
- HTML (cần DOM) ⇒ chèn **loop guard** vào điều kiện vòng lặp (`while (__oeLoop() && (cond))`, `for (a; __oeLoop() && (b); c)`), scanner bỏ qua chuỗi / comment / regex / template, **không thêm xuống dòng** để số dòng lỗi giữ đúng; guard ném lỗi khi một task chạy quá N ms rồi gỡ iframe. Kiểm cú pháp sau khi chèn bằng `new Function` — chỉ trong trang sandbox có `'unsafe-eval'`, không bao giờ ở trang chính.
- Guard không bắt được: `for…of` qua generator vô hạn, `eval` / `setTimeout("chuỗi")` / thuộc tính `onclick` ⇒ ghi giới hạn trong doc.
- Kiểm headless: chạy vòng lặp rồi đo `page.evaluate(() => 1)` < 500 ms sau khi dừng; với Worker đo trong lúc đang lặp.

**Bẫy thứ 2 — `file://` dùng chung storage.** Trang sandbox mở trên `file://` bị bỏ thuộc tính `sandbox` (Chrome không cho iframe sandbox nạp script local) — `self.origin` là `"null"` nhưng mọi trang `file://` chung storage key ⇒ Worker tạo thẳng ở đó **mở được IndexedDB của trang chính** (đo 2026-11-21). Code người dùng (cả Worker) phải chạy trong iframe con `srcdoc` có `sandbox="allow-scripts"` — ở đó `indexedDB.open` ném `SecurityError`. Kiểm headless: chạy `indexedDB.open('<tên DB>')` từ code người dùng, phải ra lỗi.

**Liên quan.** `src/one-editor/js/extras/sandbox-code-runner.js`, `sandbox-loop-guard.js`; ADR #21 (bổ sung 2026-11-21); [iframe srcdoc kế thừa CSP](iframe-srcdoc-inherits-parent-csp-use-separate-sandbox-file.md).
