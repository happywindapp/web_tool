# One Editor: trùng tên global giữa các module + giá trị bí mật trong tuỳ chọn phép ▶

## Triệu chứng
1. Sau khi thêm module mới, trang không boot (headless chỉ báo timeout chờ `body.ready`); console: `Identifier 'TextUtil' has already been declared`.
2. Khoá HMAC đã lọc ở chỗ lưu recipe nhưng vẫn xuất hiện trong `outputTab.link.opts` (được hot exit ghi vào IndexedDB).

## Nguyên nhân
1. Build ghép mọi `@include` (`src/one-editor/`, `src/data-workbench/`, `src/fix-message-parser/`) vào cùng 1 scope script ⇒ `const X` trùng tên là lỗi cú pháp toàn trang. `TextUtil` đã có ở `data-workbench/js/core/text-utils.js`.
2. `PvRecipe.show` (pane Recipe) tự gọi `PowerUi.saveOpts` mỗi lần hiện, với danh sách bước còn khoá.

## Cách xử lý đúng
1. Trước khi đặt tên module: `grep -rE "^(const|let|function|class) X\b" src/`.
2. Tuỳ chọn có giá trị bí mật ⇒ arg `type: "secret"` (bị `RecipeRun.clean` xoá trắng) và truyền `persist = RecipeRun.clean(list)` vào `PowerUi.saveOpts(src, op, v, persist)` ở **mọi** chỗ gọi (op, pane, demo, Palette); link chia sẻ và recipe đã lưu cũng qua `clean`. Kiểm headless: `JSON.stringify(out.link.opts)` không chứa giá trị.
