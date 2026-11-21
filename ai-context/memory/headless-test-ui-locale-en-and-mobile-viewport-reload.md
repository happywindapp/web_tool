# Headless test: UI mặc định English + đổi viewport mobile làm tải lại trang

- **Triệu chứng 1:** script puppeteer so chuỗi tiếng Việt báo FAIL giả — tiêu đề Explorer là "Pinned" chứ không phải "Đã ghim", `confirm` hiện câu tiếng Anh, selector `[title='Xoá ghi chú']` không thấy.
- **Nguyên nhân 1:** Chrome headless báo ngôn ngữ `en` ⇒ `I18n.init()` bật UI English.
- **Cách đúng 1:** gọi `await page.evaluate(() => I18n.set("vi"))` ngay sau `waitForSelector("body.ready")` (cả sau `page.reload()`).
- **Triệu chứng 2:** ảnh chụp mobile mất trạng thái vừa thao tác (tab hết ghim, pane về View 1) dù code đúng.
- **Nguyên nhân 2:** `page.setViewport` đổi `isMobile` / `hasTouch` giữa chừng ⇒ puppeteer reload trang; thay đổi chưa flush (hot exit debounce 700 ms) bị mất.
- **Cách đúng 2:** kiểm điện thoại bằng context / trang riêng, đặt viewport mobile **trước** `goto`.
