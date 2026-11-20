# Headless: `navigator.userActivation` luôn bật — giả lập getter để kiểm luồng "chưa bấm"

- **Triệu chứng:** kiểm One Editor phase 7 ("mở `?demo=` khi gói dịch cần tải ⇒ tab dịch chờ bấm ▶ Dịch") báo FAIL: trang tự tải gói và dịch luôn; đợi > 5 s cho transient activation hết hạn cũng không đổi.
- **Nguyên nhân:** sau `page.goto` của puppeteer, `navigator.userActivation.isActive` = `true` suốt phiên (người dùng thật mở link thì `false`).
- **Cách đúng:** giả lập trong trang: `const real = Object.getOwnPropertyDescriptor(Navigator.prototype, "userActivation").get; Object.defineProperty(navigator, "userActivation", { configurable: true, get() { return window.__noClick ? { isActive: false } : real.call(navigator); } });` rồi bật/tắt `window.__noClick`. Mock `Translator` / `LanguageDetector` (Chrome built-in AI) là object có `availability` + `create` — code phát hiện theo khả năng, không theo `typeof === "function"`.
