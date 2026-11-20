# Headless test tool có IndexedDB / hot exit: mỗi trang 1 browser context riêng

- **Triệu chứng:** script puppeteer kiểm One Editor mở nhiều trang bằng `browser.newPage()` → test sau thấy tab của test trước (hot exit khôi phục), tìm tab output theo tên bắt nhầm, share link / compare báo FAIL giả.
- **Nguyên nhân:** các trang cùng profile ⇒ dùng chung IndexedDB của `file://`.
- **Cách đúng:** `const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();` đóng `ctx` khi xong trang; test F5 dùng `page.reload()` trong cùng context. Tìm tab output theo `link.op`, không chỉ theo tên.
