# Issues & Blockers đang mở

> Bugs và blockers chưa giải quyết. Cập nhật khi tạo hoặc đóng issue.
> WT-1..5 rút từ đọc code 2026-10-27 — chưa tái hiện trên trình duyệt.

| ID | Mức độ | Mô tả | Vị trí | Trạng thái |
|----|--------|-------|--------|-----------|
| WT-1 | low | Chưa có test tự động nào cho parser; catalog sửa lỗi chỉ được kiểm qua 3 file `?demo=` | `_tools/format-json-xml-html.html` | open |
| WT-2 | low | `gutter()` dựng lại `innerHTML` tới 200.000 dòng mỗi lần gõ (debounce 400ms) → có thể giật với file lớn (cần verify) | `format-json-xml-html.html:503-510` | open |
| WT-3 | low | `URL.createObjectURL` không `revokeObjectURL` → mỗi lần "Tải về" giữ 1 Blob tới khi đóng tab | `format-json-xml-html.html:595` | open |
| WT-4 | low | `navigator.clipboard.writeText` không có `.catch` → host qua `http://` (không secure) thì "Sao chép" thất bại im lặng | `format-json-xml-html.html:589` | open |
| WT-5 | low | HTML: `&` chưa thoát được đổi thành `&amp;` nhưng không ghi vào `fixes` (XML thì có) — lệch nguyên tắc "không sửa âm thầm" | `format-json-xml-html.html:252-256` | open |

## Blockers

- _(không có)_
