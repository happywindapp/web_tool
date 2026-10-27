# Data Models — web_tool

> Không có database. "Data model" = cấu trúc dữ liệu nội bộ (in-memory) của parser trong
> `_tools/format-json-xml-html.html`.

## 1. JSON AST (`JsonTool.parse`)

| `t` | Field | Ý nghĩa |
|-----|-------|---------|
| `obj` | `items: [{k, v}]` | Object; **mảng**, không phải map → giữ thứ tự và khoá trùng |
| `arr` | `items: [node]` | Array |
| `str` | `v: string` | Chuỗi đã unescape |
| `num` | `raw: string` | Số dạng chuỗi đã chuẩn hoá — không ép `Number` để khỏi mất chính xác |
| `lit` | `v: "true" \| "false" \| "null"` | Literal |

## 2. Markup node (`MarkupTool.build`)

```text
#root { name: "#root", children: [...] }
element { name, attrs: [{n, v|null}], children, self: bool, at: offset, raw?: string }
text { text } · comment { comment } · cdata { cdata } · pi { pi } · doctype { doctype }
```

- `attrs[].v = null` = thuộc tính boolean HTML (không có `=`).
- `raw` chỉ có ở `script style textarea title` (HTML) — nội dung không parse.
- `at` = offset ký tự gốc, dùng tính dòng/cột cho thông báo "chưa đóng".

## 3. Fix record

`{ line, col, msg }` — `line = 0` nghĩa là cảnh báo không gắn vị trí (vd khoá trùng).
Danh sách này là "audit trail" của mọi sửa đổi; hiển thị ở footer, đánh dấu ở gutter.
