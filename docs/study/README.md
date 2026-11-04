# Study — bài thi trắc nghiệm ôn tập (playbook dựng đề mới)

> Đọc file này trước khi tạo/sửa bất kỳ bài thi nào trong `study/`. Đề mẫu chuẩn: [`study/CBTTCK.html`](../../study/CBTTCK.html) — chi tiết ở [cbttck.md](cbttck.md).

## 1. Ranh giới

- Bài thi KHÔNG phải tool: file ở `study/<MA_DE>.html`, card thêm vào **`study.html`** (root), **không** thêm vào `index.html`, không vào bảng Tools của `README.md`.
- 1 bài thi = 1 file HTML tự chứa (CSS + JS + ngân hàng đề inline), mở trực tiếp bằng `file://`, không gọi mạng, không build.
- Nội dung đề tiếng Việt ⇒ chưa áp luật tool: song ngữ VI/EN, `🔗 Chia sẻ link`, `Thử mẫu…` (user chưa yêu cầu — hỏi trước nếu muốn áp).
- Vẫn áp: hai tầng màu (header teal `#164e63` + toolbar tint), khối `.author`, Desktop + Mobile, dark mode.

## 2. Dựng bài thi mới từ đề mẫu

1. Chép `study/CBTTCK.html` → `study/<MA_DE>.html`, thay ngân hàng đề `const BANK = [ ... ];` (giữ đúng dạng: mỗi câu 1 dòng, dòng cuối `\n];`).
2. Đổi các chỗ gắn tên đề: `<title>`, `<h1>` header, dòng phụ đề ở màn `#start`, `.print-only` ở màn kết quả, tiền tố tên file PDF `CBTTCK-ket-qua-` trong `savePdf()`.
3. Đổi cấu hình đầu module `Exam`: `COUNT` (số câu/đề), `MINUTES`, `PASS` (mốc đạt /10), và **`KEY` / `HKEY` riêng từng đề** (`study.<ma-de>.exam`, `study.<ma-de>.history`) — dùng chung key sẽ trộn bài dở/lịch sử giữa các đề.
4. Sửa 2 tile "30 câu mỗi đề", "60 phút làm bài" ở màn `#start` cho khớp `COUNT`/`MINUTES`.
5. Thêm card vào `study.html` (chép card có sẵn: `mark`, tiêu đề, mô tả, chips số câu/thời gian).
6. Chạy `node scripts/validate-study-quiz-bank.js study/<MA_DE>.html` (phải `OK`) rồi kiểm thử ở mục 6.

## 3. Ngân hàng đề — schema `BANK`

```js
{ "topic": "Thị trường thứ cấp", "q": "Câu hỏi?\nDòng 2 (bảng/ý I, II… xuống dòng bằng \\n)",
  "options": ["…", "…", "…", "…"], "answer": 2, "explain": "1–2 câu vì sao đúng, theo tài liệu.", "fixed": true }
```

- `options` 2–6 phương án; `answer` = chỉ số trong `options` gốc. Khi thi phương án **bị xáo** (trừ `fixed`).
- `fixed: true` bắt buộc khi phương án nhắc tới phương án khác ("Câu A, B", "Tất cả các câu trên", "Cả 2 phát biểu trên", "Trường hợp A…") — chữ cái trong text phải khớp chữ hiển thị A–F.
- Câu soạn mới (không `fixed`): CẤM phương án tham chiếu chéo; phân bố vị trí đáp án đều; phương án nhiễu dài tương đương đáp án (validator đếm câu "đáp án dài vượt trội").
- `q` hiển thị `white-space:pre-line` ⇒ bảng số liệu viết từng dòng `\n`.
- Câu dựa trên luật cũ phải ghi mốc luật trong câu hỏi ("theo Luật Chứng khoán 2006"). Không dùng số liệu thị trường theo thời điểm.

## 4. Quy trình soạn đề từ tài liệu (`Documents/<bộ tài liệu>/`)

1. **Trích text:** `pdftotext -enc UTF-8 -layout <file.pdf> <out.txt>` (pdftotext có ở `C:\_devtools\Beyond Compare 4\`) vào scratchpad, không ghi vào repo.
   Nguồn `.pptx`: `python-pptx` (shape text + bảng + notes); text SmartArt KHÔNG có trong shape ⇒ đọc thêm `ppt/diagrams/data*.xml` (`<a:t>`) trong zip.
   Nguồn `.ppt`/`.doc` cũ: chuyển sang `.pptx`/`.docx` bằng COM PowerPoint/Word (PowerShell `New-Object -ComObject PowerPoint.Application` → `SaveAs(out, 24)`; Word `SaveAs2(out, 16)`) vào scratchpad, rồi `python-pptx` (gồm cả bảng, notes).
   Nguồn `.docx`: `python-docx` duyệt `document.element.body` theo thứ tự (đoạn + bảng xen kẽ, không dùng `doc.tables` riêng); ký hiệu ≥ ≤ dạng công thức bị mất khi trích ⇒ suy từ ngữ cảnh.
2. **PDF scan** (text rỗng): máy không có `pdftoppm` ⇒ Read tool `pages` không đọc được; dùng
   `python -I scripts/extract-pdf-text-bold-or-images-for-quiz.py <file.pdf> --images <dir>` rồi đọc từng ảnh.
3. **File đáp án in đậm** (dạng "Câu hỏi ôn tập … đáp án in đậm"): `python -I scripts/extract-pdf-text-bold-or-images-for-quiz.py <file.pdf>` → đáp án đúng nằm trong `**…**`.
   Text PDF hay vỡ dấu cách ("giao d ịch") ⇒ chép lại câu sạch, sửa lỗi chính tả rõ ràng.
4. **Soạn song song:** chia tài liệu thành ~5 nhóm (~40 câu/nhóm, số câu tỷ lệ độ dày tài liệu), mỗi nhóm 1 subagent ghi `q-<nhóm>.json` vào scratchpad theo schema mục 3 + luật soạn mục 3; subagent tự kiểm JSON bằng node và chỉ trả tóm tắt (không dán câu hỏi).
5. **Gộp + kiểm:** gộp các `q-*.json` vào `BANK` (mỗi câu 1 dòng, escape `</` thành `<\/`), chạy validator.
6. **Tự tính lại mọi câu tính toán** (khớp lệnh định kỳ/liên tục, giá tham chiếu không hưởng quyền, NAV, lãi/lỗ quyền chọn, chỉ số giá…) — subagent có thể tính sai.
7. **Đáp án chính thức sai/mâu thuẫn lý thuyết:** sửa + ghi rõ trong `explain` ("file đáp án gốc in đậm X, mâu thuẫn … nên đã sửa") + báo user. Tài liệu in trùng phương án ⇒ thay phương án, ghi chú trong `explain`.

## 5. Giao diện & hành vi (đã chốt, giữ khi làm đề mới)

- **Không nút nền trắng** (user phản hồi: lẫn với nền). 3 kiểu nút: `button` mặc định = nền teal nhạt `--acc-soft` + viền/chữ teal; `.main` = teal đặc chữ trắng; `.danger` = nền đỏ nhạt. Cỡ `.sm` / `.lg`.
- Hover chỉ trong `@media (hover:hover)` — tránh hover "kẹt" trên mobile trông như đang chọn.
- Phương án = thẻ nền `--soft` viền 1.5px; đang chọn: viền 2px teal + nền tint + chữ đậm + `✓`.
- Màn làm bài: desktop 2 cột (câu hỏi | bảng câu hỏi sticky), ≤900px xếp dọc. Bảng câu hỏi có chú thích màu: teal = đã trả lời, cam = ⚑ đánh dấu xem lại, xám = chưa làm, viền đen = đang xem.
- Toolbar: "Đã làm x/n" + thanh tiến độ + số câu ⚑ + `Nộp bài`. Đồng hồ: vàng ≤10 phút, đỏ nhấp nháy ≤5 phút, hết giờ tự nộp. Câu cuối nút "Câu sau" thành "Nộp bài ✓". Nộp luôn hỏi xác nhận (kèm số câu chưa làm / đang ⚑).
- Phím tắt: `1–6` / `A–F` chọn, `←/→` chuyển câu.
- Bài đang làm lưu `localStorage[KEY]` (tải lại trang → "Tiếp tục bài đang làm"; hết giờ trong lúc đóng trang → tự nộp khi mở lại).
- Kết quả lưu `localStorage[HKEY]` (mới nhất trước, tối đa 50) kèm **bản chụp nội dung câu hỏi** ⇒ xem lại đúng dù `BANK` đổi. Màn `#start` có bảng "Kết quả đã làm" (Xem lại / Xóa).
- Màn kết quả: vòng điểm (`conic-gradient`), nhãn Đạt/Chưa đạt theo `PASS`, 4 thẻ Đúng/Sai/Bỏ trống/Thời gian, bảng theo chủ đề có thanh % (yếu nhất lên đầu), bảng câu xanh/đỏ/vàng, lọc có số đếm, từng câu tô đáp án đúng/chọn sai + giải thích.
- **Lưu PDF** = `window.print()` + `@media print` (ẩn `.top`/`.no-print`/`.author`, ép màu sáng, hiện cả câu đang bị lọc ẩn, `print-color-adjust:exact`); tạm đổi `document.title` để tên file PDF gợi ý đúng.

## 6. Kiểm thử trước khi báo xong

- `node scripts/validate-study-quiz-bank.js study/<MA_DE>.html` → `OK`.
- Headless Chrome (puppeteer trong `~/.claude/skills/chrome-devtools/scripts`, `executablePath` Chrome hệ thống, `page.on("dialog", d => d.accept())`), desktop 1366 + mobile 390 (`isMobile`, `hasTouch`) + dark (`emulateMediaFeatures prefers-color-scheme`):
  bắt đầu → chọn đáp án (chuột + phím, câu `fixed` 6 phương án, phím ngoài khoảng bị bỏ qua) → ⚑ → tải lại + Tiếp tục → nộp → điểm/thẻ/lọc đúng → `emulateMediaType("print")` hiện đủ n câu → Về trang đầu có 1 dòng lịch sử → Xem lại khớp điểm → Xóa → hết giờ tự nộp + lưu lịch sử; `scrollWidth == innerWidth`; không `pageerror`.
- `click` + `waitForNavigation` phải chạy trong `Promise.all` (file:// điều hướng xong trước khi kịp chờ).
