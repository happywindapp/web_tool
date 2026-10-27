# Prompt: Refactor Module

> Copy → điền biến `{{...}}` → chạy.

## Context
- Service / module: `{{repo}} / {{path}}` → đọc `{{repo}}/readme.md` (kiến thức toàn bộ repo) trước.
- Lý do refactor: `{{nợ kỹ thuật / khó test / trùng lặp ...}}`
- Ràng buộc: **KHÔNG đổi behavior** (giữ contract & test xanh).

## Mục tiêu
{{mô tả: tách module, giảm coupling, đặt tên lại, gom logic chung...}}

## Nguyên tắc
- DRY: gom trùng lặp. KISS: đơn giản hóa. YAGNI: bỏ code thừa.
- Giữ file < ~200 dòng, tách theo concern.
- Diff từng bước nhỏ, test sau mỗi bước.

## Output
- Code đã refactor + test vẫn pass.
- Cập nhật `docs/decisions/` nếu đổi pattern kiến trúc.
