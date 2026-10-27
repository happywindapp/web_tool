# Data Models — web_tool

> Không có database. "Data model" = cấu trúc dữ liệu in-memory. Model riêng từng tool (AST, node…) nằm trong
> `docs/tools/<tool>.md`; ở đây chỉ giữ model dùng chung.

## Fix record

`{ line, col, msg }` — `line = 0` nghĩa là cảnh báo không gắn vị trí (vd khoá trùng).
Danh sách này là "audit trail" của mọi sửa đổi; hiển thị ở footer, đánh dấu ở gutter.
