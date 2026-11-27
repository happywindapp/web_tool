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
| WT-7 | low | (có từ tool cũ) `fix()` tính `lineCol` bằng slice từ đầu chuỗi mỗi lần → O(n × số fix), XML vài MB nhiều `&` trần có thể đứng tab; HTML không phát hiện thuộc tính trùng khác hoa/thường (`ID`/`id`) | `JsonTool.parse` / `MarkupTool.build` | open |
| WT-8 | low | SQL INSERT chỉ nhân đôi `'` (chuẩn ANSI/PostgreSQL/SQL Server); MySQL mặc định coi `\` là escape → giá trị kết thúc bằng `\` làm vỡ câu lệnh | `Writers.sql` | closed 2026-10-28: chọn PostgreSQL (mặc định) / MySQL / SQL Server / SQLite |
| WT-9 | low | One Editor: headless `phase12c` mục `640: tap 🕘 ⇒ Timeline` FAIL ổn định, `phase12a` `640: tap ☰ → Outline` chập chờn; `phase11b` `390x844: tap the check box` chập chờn (FAIL trên bản build 14b, PASS trên 14c) — có cả trên bản build trước 14a (nghi từ phase 13, chưa tìm nguyên nhân) | `plans/261118-0209-one-editor/headless/phase12c-headless.mjs` | open 2026-11-25 |
| WT-10 | low | One Editor: headless `phase11a` crash ở dòng 199 (`null.textContent`) và `phase10` mục `bin survives F5` FAIL — y hệt trên bản build 14a (2 script gán cứng BASE, không đọc `OE_BASE`) | `plans/261118-0209-one-editor/headless/phase11a-headless.mjs`, `phase10-explorer-file-manager-headless.mjs` | open 2026-11-25 |
| WT-11 | low | One Editor: headless `phase12d` mục Palette “Dán từ lịch sử clipboard…” FAIL — lệnh `clipPaste` không usable (`hasDoc` false sau F5, không có tab đang hoạt động); FAIL y hệt trên file chính trước 15a (bản 14f) ⇒ có sẵn từ 14d–14f | `plans/261118-0209-one-editor/headless/phase12d-headless.mjs:49`, `js/workbench/command-list.js:57` | open 2026-11-27 |

## Blockers

- _(không có)_
