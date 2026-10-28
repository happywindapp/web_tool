# Tool mới / sửa tool: luôn song ngữ English + Tiếng Việt

**Triệu chứng:** tool mới chỉ có tiếng Việt, hoặc thêm nút/thông báo mới mà quên bản English → ở chế độ EN
lẫn chữ tiếng Việt; nội dung dựng bằng JS không đổi ngôn ngữ khi bấm `VI | EN`.

**Nguyên nhân:** chuỗi viết thẳng trong template literal (`` `Đã nạp ${n} hàng` ``) thay vì `T()`; quên từ điển;
quên dựng lại UI động trong `I18n.onChange`; quên dịch card mới trong `index.html`.

**Cách làm đúng (bắt buộc mọi AI, mọi tool + `index.html`):**

- Theo **checklist song ngữ** ở `docs/architecture/README.md` mục 3 (nguồn chân lý) + ADR #8 ở `docs/decisions/README.md`.
- Nút `VI | EN` góc trên-phải header, màu chuẩn (cam đậm khi chọn / vàng nhạt khi không chọn).
- Chép module `I18n` nguyên văn từ `src/data-workbench/js/core/i18n-ui-language-vi-en.js`; chuỗi gốc tiếng Việt làm khoá,
  `T("… {x} …", { x })` cho chuỗi động, thêm bản English vào `I18n.add({...})`.
- Chưa song ngữ = chưa xong. Kiểm bằng snippet DevTools trong checklist (EN phải ra mảng rỗng);
  Data Workbench chạy thêm `node --test src/data-workbench/tests/i18n-dictionary-coverage.test.js`.
