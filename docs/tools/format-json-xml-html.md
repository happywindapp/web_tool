# Tool: Đọc & Format JSON · XML · HTML

> File: [`tools/format-json-xml-html.html`](../../tools/format-json-xml-html.html). Toàn bộ kiến thức riêng của tool
> nằm ở đây; luật chung mọi tool xem `docs/architecture/`, `docs/security/`, `docs/decisions/`.

## 1. Người dùng & mục đích

Dev/QA/BA cần đọc nhanh payload JSON, file cấu hình XML (`.csproj`, `.config`, `.wsdl`, `.pdm`…) hoặc HTML
bị lỗi cú pháp/1 dòng dài: kiểm tra → biết lỗi ở dòng/cột nào → tự sửa → format → copy/tải về.
**Dữ liệu không rời máy** — tool có thể dùng với payload nhạy cảm (UAT log, điện tử…).

## 2. Contract (đổi là breaking)

| Giao diện | Hợp đồng |
|-----------|----------|
| URL query `?demo=json\|xml\|html` | Nạp file mẫu lỗi tương ứng rồi chạy "Format & sửa lỗi" ngay (dùng để demo/test thủ công) |
| Input | Dán text · `<input type=file>` · kéo-thả file vào trang; đọc **UTF-8**, bỏ BOM |
| Nhận diện theo đuôi | Danh sách đuôi ở §3 (`EXT` trong code) |
| Tên file tải về | `<base>.formatted.<ext>`; MIME `text/plain;charset=utf-8` |
| Clipboard | `navigator.clipboard.writeText` (cần secure context: `file://`, `https://` hoặc `localhost`) |
| Mạng | **Không có request nào** — là cam kết hiển thị trên UI |

## 3. Nhận diện định dạng (`detect`)

1. Chọn tay ở dropdown → dùng luôn.
2. Theo đuôi file (khi mở/kéo-thả): `json` ← `json jsonc json5 geojson har ipynb webmanifest map babelrc eslintrc`;
   `xml` ← `xml cdm pdm ldm oom bpm svg xsd xsl xslt wsdl config csproj vbproj props targets plist kml gpx rss atom xaml resx pom nuspec dtsx`;
   `html` ← `html htm xhtml shtml`.
3. Theo ký tự đầu (bỏ BOM, khoảng trắng): `{`/`[` → JSON; `<` → HTML nếu mở bằng doctype/`html`/`head`/`body`
   hoặc chứa `div p span table script a`, ngược lại XML; `"`/số/`-`/`true|false|null` → JSON; còn lại → XML.

## 4. Kiểm tra (nút "Kiểm tra", tự chạy khi gõ)

| Định dạng | Cách kiểm | Kết quả |
|-----------|-----------|---------|
| JSON | `JSON.parse` (strict) | ✔ hợp lệ / ✖ lỗi kèm dòng-cột (lấy từ message trình duyệt) |
| XML | `DOMParser` `application/xml` | ✔ well-formed / ✖ lỗi đầu tiên |
| HTML | chạy tree builder, đếm fixes | ✔ / ⚠ N lỗi cấu trúc (trình duyệt vẫn hiển thị được) |

## 5. Catalog tự sửa JSON (`JsonTool.parse`)

| Lỗi đầu vào | Sửa thành |
|-------------|-----------|
| Chú thích `//`, `#`, `/* */` | Bỏ |
| Chuỗi nháy đơn `'x'` | Nháy kép |
| Chuỗi thiếu nháy đóng | Đóng ở cuối dòng (hoặc cuối file) |
| Escape lạ `\q` · Tab thô trong chuỗi | Giữ `\` · thành `\t` |
| Số `0x1F`, `+1`, `.5`, `1.`, `007` | `31`, `1`, `0.5`, `1`, `7` · số không hợp lệ → `null` |
| `True/False/None/undefined/NaN/Infinity/TRUE/FALSE/NULL` | `true/false/null` |
| Giá trị chữ trần `abc` | `"abc"` |
| Khoá không nháy `key:` · dùng `=` thay `:` · thiếu `:` | Thêm nháy · `:` · tự thêm `:` |
| Thiếu dấu phẩy giữa phần tử · dấu phẩy thừa/cuối | Thêm · bỏ |
| Thiếu `}`/`]` · đóng sai loại | Tự thêm · đổi đúng loại |
| Nhiều giá trị gốc liền nhau (NDJSON) | Gộp thành mảng · nội dung rác sau gốc → bỏ |
| Khoá trùng | **Không sửa**, chỉ cảnh báo, giữ cả hai |

Số giữ nguyên chuỗi gốc (`raw`) → không mất độ chính xác với số lớn (id 19 chữ số, decimal tiền).

## 6. Catalog tự sửa XML / HTML (`MarkupTool.build`)

| Lỗi | XML | HTML |
|-----|-----|------|
| Thẻ chưa đóng | Tự đóng + báo | Tự đóng; thẻ optional-end (`p li td tr option…`) không báo |
| Thẻ đóng thừa / `</img>` | Bỏ + báo | Bỏ + báo |
| Thẻ thiếu `>` · thẻ đóng thiếu `>` | Tự thêm | Tự thêm |
| `&` chưa thoát · `<` đứng riêng | `&amp;` · `&lt;` + báo | Sửa; `&` sửa **không báo** |
| Comment / CDATA / `<?…` chưa đóng | Đóng ở cuối file | Như XML |
| Giá trị thuộc tính thiếu nháy đóng | Tự đóng | Tự đóng |
| Thuộc tính không nháy `id=1` · không giá trị `con-hang` | Thêm nháy · `con-hang="con-hang"` | Chấp nhận (hợp lệ HTML) |
| Thuộc tính trùng | Bỏ bản sau | Bỏ bản sau |
| `<div/>` (non-void tự đóng) | Hợp lệ | → `<div></div>` + báo |
| Mở khối khi `<p>`/`<li>`/`<td>` đang mở | — | Tự đóng thẻ trước (luật HTML) |
| Không có / nhiều phần tử gốc | Bọc trong `<root>` | — |

HTML: tên thẻ/thuộc tính hạ chữ thường; `script style textarea title` giữ nguyên nội dung thô.

## 7. Đầu ra

- Format: thụt 2 / 4 dấu cách / Tab. Minify: 1 dòng, markup bỏ comment.
- Tải về: `<tên-gốc>.formatted.<đuôi-gốc>`; dán tay thì `ket-qua.formatted.<json|xml|html>`.
- **Tự sửa là đoán ý định** — UI nhắc người dùng luôn đọc lại danh sách thay đổi.

## 8. Data model (in-memory)

JSON AST (`JsonTool.parse`):

| `t` | Field | Ý nghĩa |
|-----|-------|---------|
| `obj` | `items: [{k, v}]` | Object; **mảng**, không phải map → giữ thứ tự và khoá trùng |
| `arr` | `items: [node]` | Array |
| `str` | `v: string` | Chuỗi đã unescape |
| `num` | `raw: string` | Số dạng chuỗi đã chuẩn hoá — không ép `Number` để khỏi mất chính xác |
| `lit` | `v: "true" \| "false" \| "null"` | Literal |

Markup node (`MarkupTool.build`):

```text
#root { name: "#root", children: [...] }
element { name, attrs: [{n, v|null}], children, self: bool, at: offset, raw?: string }
text { text } · comment { comment } · cdata { cdata } · pi { pi } · doctype { doctype }
```

- `attrs[].v = null` = thuộc tính boolean HTML (không có `=`).
- `raw` chỉ có ở `script style textarea title` (HTML) — nội dung không parse.
- `at` = offset ký tự gốc, dùng tính dòng/cột cho thông báo "chưa đóng".

Fix record dùng chung: xem [`docs/data-models/`](../data-models/README.md).

## 9. Module (IIFE trong 1 `<script>`)

| Module | Việc | API |
|--------|------|-----|
| `JsonTool` | Kiểm tra strict + **tolerant parser (bộ phân tích chịu lỗi)** dựng AST, giữ số nguyên gốc & khoá trùng | `check(text)`, `parse(text) → {ast, fixes}`, `stringify(ast, indent)` |
| `MarkupTool` | Tokenizer + tree builder chịu lỗi cho XML/HTML, pretty-print, minify | `build(text, html) → {root, fixes}`, `serialize`, `minify`, `checkXml` |
| `ViewRender` | Tô màu cú pháp pane "Văn bản", dựng cây `<details>` pane "Cây dữ liệu" | `highlight(code, kind)`, `tree(model, kind)`, `esc` |
| UI wiring (cuối file) | Mở file / kéo-thả, detect định dạng, gutter số dòng, báo lỗi, nhảy dòng, copy/tải về, demo | `detect`, `check`, `run(mode)`, `load`, `jump` |

## 10. Luồng xử lý

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
- Sơ đồ mermaid: [`docs/diagrams/`](../diagrams/README.md).

## 11. Giới hạn hiệu năng (hằng số trong code)

| Giới hạn | Giá trị | Hành vi |
|----------|---------|---------|
| Tô màu output | > 1.500.000 ký tự | Chỉ escape, không tô màu |
| Cây dữ liệu | 4.000 nút | Cắt, hiện "… còn nữa"; tự mở 60 nút JSON / 80 nút markup đầu |
| Gutter số dòng | 200.000 dòng | Không đánh số quá mức này |
| Auto-check khi gõ | < 3.000.000 ký tự | Lớn hơn thì chỉ cập nhật gutter |
