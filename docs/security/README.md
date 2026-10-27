# Security — web_tool

> Không có auth/người dùng/secret. Rủi ro chính = **XSS khi render input của người dùng** và **rò dữ liệu**
> nếu sau này tool gọi mạng. Guardrails vận hành AI: `~/.claude/CLAUDE.md` + `.agent/rules/10-guardrails.md`.

## 1. Cam kết riêng tư (phải giữ)

- Không `fetch`/`XMLHttpRequest`/`WebSocket`/`<script src>`/font/ảnh ngoài. Đã kiểm 2026-10-27: **0 tài nguyên ngoài**.
- Không lưu input vào `localStorage`/cookie/IndexedDB.
- File tải về tạo bằng `Blob` + `URL.createObjectURL` ngay trên máy.

## 2. XSS — các điểm `innerHTML` (đã rà 2026-10-27)

| Điểm | Nội dung đưa vào | Escape |
|------|------------------|--------|
| `#out` | `ViewRender.highlight` | Mọi đoạn đi qua `esc()`/`span()` (`& < >`) |
| `#tree` | `ViewRender.tree` | Khoá/giá trị/tên thẻ/thuộc tính qua `span()` → `esc()` |
| `#msgs` | Thông báo fix (có thể chứa trích đoạn input) | `ViewRender.esc(x.msg)`; `line/col` là số |
| `#gut` | Số dòng | Chỉ số nguyên |
| `#fname` | Tên file | `textContent` (an toàn) |

Kết luận: chưa thấy đường XSS. **Luật khi sửa code:** mọi chuỗi bắt nguồn từ input phải qua `ViewRender.esc`
trước khi vào `innerHTML`; `esc` chỉ thoát `& < >` → **không dùng kết quả của nó bên trong giá trị thuộc tính**
(thiếu `"`), hãy dùng `textContent`/`setAttribute`.

## 3. Secrets

Không có. Repo có remote GitHub → không commit
payload thật (log UAT, điện, dữ liệu khách hàng) làm file mẫu.
