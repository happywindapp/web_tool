# Issues & Blockers đang mở

> Bugs và blockers chưa giải quyết. Cập nhật khi tạo hoặc đóng issue.
> WT-1..5 rút từ đọc code 2026-10-27 — chưa tái hiện trên trình duyệt.

| ID | Mức độ | Mô tả | Vị trí | Trạng thái |
|----|--------|-------|--------|-----------|
| WT-1 | low | Chưa có test tự động nào cho parser; catalog sửa lỗi chỉ được kiểm qua 3 file `?demo=` | `src/data-workbench/tests/` | partial 2026-10-28: 11 test node cho parser/converter/diff; catalog sửa lỗi chưa phủ hết |
| WT-2 | low | `gutter()` dựng lại `innerHTML` tới 200.000 dòng mỗi lần gõ (debounce 400ms) → có thể giật với file lớn (cần verify) | `LineEditor.paint` | closed 2026-10-28: chỉ vẽ lại khi số dòng / dòng lỗi đổi |
| WT-3 | low | `URL.createObjectURL` không `revokeObjectURL` → mỗi lần "Tải về" giữ 1 Blob tới khi đóng tab | `Dom.download` | closed 2026-10-28 |
| WT-4 | low | `navigator.clipboard.writeText` không có `.catch` → host qua `http://` (không secure) thì "Sao chép" thất bại im lặng | `Dom.copy` | closed 2026-10-28: fallback `execCommand` + báo khi thất bại |
| WT-5 | low | HTML: `&` chưa thoát được đổi thành `&amp;` nhưng không ghi vào `fixes` (XML thì có) — lệch nguyên tắc "không sửa âm thầm" | `MarkupTool.build` / `escText` | closed 2026-10-28: HTML giữ nguyên `&` (hợp lệ HTML), XML vẫn sửa + báo |
| WT-6 | low | Tab CSV đoán kiểu số theo chuẩn JSON: `27.500` (kiểu VN = 27500) bị hiểu là 27.5 khi chuyển sang JSON/SQL. Người dùng tắt "Tự đoán kiểu" khi dữ liệu dùng dấu chấm ngăn nghìn | `Val.infer` | open — cân nhắc tuỳ chọn locale số |

## Blockers

- _(không có)_
