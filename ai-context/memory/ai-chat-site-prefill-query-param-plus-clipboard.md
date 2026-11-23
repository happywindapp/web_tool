# Mở trang AI với câu hỏi điền sẵn: `?q=` không chính thức ⇒ luôn kèm clipboard

**Triệu chứng:** mở ChatGPT / Gemini / Copilot / Perplexity / Grok / Claude ở tab mới với text điền sẵn — có trang ô hỏi trống, có trang tự gửi luôn, tab mới cướp focus làm `navigator.clipboard` trong test báo lỗi.

**Nguyên nhân:** không trang nào có tài liệu chính thức cho tham số điền sẵn (OpenAI community: `?q=` không phải cơ chế được hỗ trợ). Gemini không có tham số nào. Query dài bị HTTP 414. Tab mới lấy focus nên ghi/đọc clipboard sau `window.open` có thể hỏng.

**Cách xử lý đúng (One Editor "🤖 Hỏi AI", ADR #26, `src/one-editor/js/workbench/editor-selection-actions.js`):**
- Chép clipboard **trước** (`Dom.copy`, lúc trang còn focus), rồi mở `about:blank` trong cú bấm, `opener = null`, mới `location.replace(url)`.
- `?q=` cho ChatGPT, Copilot, Perplexity (`/search?q=`), Grok, Claude (`/new?q=`); Gemini chỉ mở `gemini.google.com/app` + báo "nhấn Ctrl+V". Query mã hoá > 6.000 ký tự ⇒ chỉ mở trang + clipboard.
- Test headless: `--host-resolver-rules=MAP chatgpt.com 127.0.0.1, …` để không gửi dữ liệu ra ngoài; chỉ kiểm URL của target mới; `page.bringToFront()` trước khi `navigator.clipboard.readText()`.
