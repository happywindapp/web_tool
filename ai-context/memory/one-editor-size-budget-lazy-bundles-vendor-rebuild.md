# One Editor: ngân sách file chính (≤ 1 MB từ 2026-11-20, trước là 700 KB) → bundle nạp lười; script vendor build lại core

**Triệu chứng.** Thêm tính năng vào One Editor làm `tools/one-editor.html` vượt 700 KB (ngân sách phase 6). Chạy `scripts/vendor-one-editor-libraries.ps1` để thêm 1 gói (Vim / Emmet) làm `tools/vendor/codemirror-6.43.15/codemirror-core.min.js` + `codemirror-languages.min.js` đổi hash dù không đổi phiên bản.

**Nguyên nhân.** File chính đã ~700 KB sau phase 8. Script vendor cài lại mọi gói, phụ thuộc bắc cầu (`@lezer/*`, `style-mod`…) được resolve bản mới hơn.

**Cách xử lý đúng.**
- Tính năng ít dùng ⇒ đặt module trong `src/one-editor/<bundle>.template.js` (build script ghép `*.template.js` → `tools/<bundle>.js`), nạp bằng `VendorPaths.load` lúc dùng; pane đăng ký `PreviewPane.addView`; chuỗi EN của module lazy để trong file i18n riêng `@include` vào chính bundle. Hiện có `one-editor-data-tools.js`, `one-editor-fix-dictionary.js`, `one-editor-editor-extras.js`, `one-editor-power-tools.js` (phase 9).
- Test node không nạp bundle ⇒ `node --check` mọi `src/one-editor/js/*/*.js` trước khi kiểm trình duyệt.
- Chỉ thêm gói vendor: chạy script rồi `git checkout -- tools/vendor/codemirror-6.43.15/codemirror-core.min.js tools/vendor/codemirror-6.43.15/codemirror-languages.min.js`, kiểm hash các file khác không đổi.
- Bẫy gặp ở phase 9 (2026-11-21): CSS của bundle ⇒ `@include styles/x.css` trong `*.template.js` (build chèn `<style>` khi bundle chạy); file JS được `@include` không được chứa chữ `<script` (build từ chối) ⇒ ghép `"scr" + "ipt"`; view của pane **không** được có field `error` (PreviewPane.show coi là lỗi cả pane) ⇒ đặt tên khác (`failed`); tham số op theo tab cần sống qua F5 ⇒ lưu ở `doc.link.opts` của tab kết quả (document-store + HotExit giữ), link / demo đặt sẵn phải ghi vào đó khi tab kết quả đã tạo; op cần syntax tree phải `await LangLoader.apply(src)` (gói ngôn ngữ nạp lười).
