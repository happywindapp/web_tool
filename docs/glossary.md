# Glossary

> Thuật ngữ dùng trong `web_tool`.

## Tool & kỹ thuật

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| Tool | 1 file HTML tự chứa trong `_tools/`, chạy client-side |
| Tolerant parser (bộ phân tích chịu lỗi) | Parser không dừng ở lỗi đầu tiên mà đoán ý định, sửa và ghi lại sửa đổi |
| Fix / fixes | Bản ghi `{line, col, msg}` của 1 sửa đổi tự động — audit trail cho người dùng duyệt |
| AST (cây cú pháp trừu tượng) | Mô hình JSON nội bộ `{t: obj\|arr\|str\|num\|lit}` (xem `docs/data-models/`) |
| Well-formed (XML hợp lệ cú pháp) | XML đúng cú pháp (đóng thẻ, 1 phần tử gốc, thoát ký tự) — chưa xét schema/XSD |
| Void element (thẻ rỗng) | Thẻ HTML không có nội dung/thẻ đóng: `br img input meta link hr …` |
| Optional end tag | Thẻ HTML được phép bỏ thẻ đóng: `p li td tr option …` |
| Raw text element | `script style textarea title` — nội dung giữ nguyên, không parse |
| NDJSON | Newline-delimited JSON — nhiều giá trị JSON liền nhau; tool gộp thành mảng |
| BOM | Byte Order Mark `U+FEFF` đầu file — tool bỏ khi đọc |
| Minify | Thu gọn về 1 dòng, bỏ khoảng trắng thừa (markup bỏ cả comment) |

## AI tooling (scaffold)

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| Skill | Folder + `SKILL.md`, năng lực AI nạp động theo `description` |
| Junction skills | `.claude/.agents/.github/.agent/.gemini` `/skills` → `ai-context/skills/` (gitignored) |
| Memory | Bài học file-based ở `ai-context/memory/` (đa-AI) và `~/.claude/projects/<workspace>/memory/` (Claude) |
