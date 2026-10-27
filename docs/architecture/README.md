# Architecture — web_tool

> Rút từ `_tools/format-json-xml-html.html` (commit `365d471`, 618 dòng).

## 1. Mô hình

- **Static single-file tool (công cụ 1 file tĩnh)**: mỗi tool = 1 file `.html` trong `_tools/`, CSS + JS inline.
- Không backend, không build, không dependency, không network request. Mở bằng `file://` hay host tĩnh đều chạy.
- Trạng thái chỉ sống trong DOM/biến JS của tab — không `localStorage`, không cookie.

## 2. Module trong `format-json-xml-html.html`

| Module (IIFE) | Dòng | Việc | API |
|---------------|------|------|-----|
| `JsonTool` | 72–231 | Kiểm tra strict + **tolerant parser (bộ phân tích chịu lỗi)** dựng AST, giữ số nguyên gốc & khoá trùng | `check(text)`, `parse(text) → {ast, fixes}`, `stringify(ast, indent)` |
| `MarkupTool` | 234–428 | Tokenizer + tree builder chịu lỗi cho XML/HTML, pretty-print, minify | `build(text, html) → {root, fixes}`, `serialize`, `minify`, `checkXml` |
| `ViewRender` | 431–482 | Tô màu cú pháp pane "Văn bản", dựng cây `<details>` pane "Cây dữ liệu" | `highlight(code, kind)`, `tree(model, kind)`, `esc` |
| UI wiring | 485–614 | Mở file / kéo-thả, detect định dạng, gutter số dòng, báo lỗi, nhảy dòng, copy/tải về, demo | `detect`, `check`, `run(mode)`, `load`, `jump` |

## 3. Luồng xử lý

```text
load(name, text) | input (debounce 400ms) ──► check()
   ├─ JSON : JsonTool.check  → JSON.parse native, lấy line/col từ message lỗi
   ├─ XML  : MarkupTool.checkXml → DOMParser("application/xml") → <parsererror>
   └─ HTML : MarkupTool.build(html=true) → số fixes (cảnh báo, không phải lỗi cứng)

nút "Format & sửa lỗi" → run("pretty") · nút "Thu gọn 1 dòng" → run("min")
   ├─ JSON : parse → AST + fixes → stringify(indent | "")
   └─ XML/HTML : build → tree + fixes → serialize(indent) | minify
   └─► out.dataset.raw = kết quả · highlight → #out · tree → #tree · report(fixes) → #msgs
```

- `report()` đánh dấu đỏ các dòng có lỗi ở gutter; bấm 1 dòng trong `#msgs` → `jump(line)` chọn dòng đó ở textarea.
- "← Dùng kết quả" đưa output sang input để sửa tiếp (vòng lặp sửa nhiều lượt).

## 4. Giới hạn hiệu năng (hằng số trong code)

| Giới hạn | Giá trị | Hành vi |
|----------|---------|---------|
| Tô màu output | > 1.500.000 ký tự | Chỉ escape, không tô màu |
| Cây dữ liệu | 4.000 nút | Cắt, hiện "… còn nữa"; tự mở 60 nút JSON / 80 nút markup đầu |
| Gutter số dòng | 200.000 dòng | Không đánh số quá mức này |
| Auto-check khi gõ | < 3.000.000 ký tự | Lớn hơn thì chỉ cập nhật gutter |

## 5. Nguyên tắc kiến trúc

- Thêm tool mới = thêm 1 file `_tools/<ten-kebab>.html`, cùng khuôn: header toolbar · 2 pane · footer trạng thái.
- Không đưa thư viện ngoài vào; nếu bắt buộc → hỏi user và ghi ADR (đổi cam kết offline/riêng tư).
- Parser trả `fixes` thay vì throw — chỉ throw khi không thể xử lý (vd nội dung trống).
