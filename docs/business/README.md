# Business — Luật nghiệp vụ của tool Format JSON · XML · HTML

> Rút từ `_tools/format-json-xml-html.html`. "Nghiệp vụ" = luật nhận diện định dạng + catalog lỗi được tự sửa.

## 1. Người dùng & mục đích

Dev/QA/BA cần đọc nhanh payload JSON, file cấu hình XML (`.csproj`, `.config`, `.wsdl`, `.pdm`…) hoặc HTML
bị lỗi cú pháp/1 dòng dài: kiểm tra → biết lỗi ở dòng/cột nào → tự sửa → format → copy/tải về.
**Dữ liệu không rời máy** — tool có thể dùng với payload nhạy cảm (UAT log, điện tử…).

## 2. Nhận diện định dạng (`detect`)

1. Chọn tay ở dropdown → dùng luôn.
2. Theo đuôi file (khi mở/kéo-thả): `json` ← `json jsonc json5 geojson har ipynb webmanifest map babelrc eslintrc`;
   `xml` ← `xml cdm pdm ldm oom bpm svg xsd xsl xslt wsdl config csproj vbproj props targets plist kml gpx rss atom xaml resx pom nuspec dtsx`;
   `html` ← `html htm xhtml shtml`.
3. Theo ký tự đầu (bỏ BOM, khoảng trắng): `{`/`[` → JSON; `<` → HTML nếu mở bằng doctype/`html`/`head`/`body`
   hoặc chứa `div p span table script a`, ngược lại XML; `"`/số/`-`/`true|false|null` → JSON; còn lại → XML.

## 3. Kiểm tra (nút "Kiểm tra", tự chạy khi gõ)

| Định dạng | Cách kiểm | Kết quả |
|-----------|-----------|---------|
| JSON | `JSON.parse` (strict) | ✔ hợp lệ / ✖ lỗi kèm dòng-cột (lấy từ message trình duyệt) |
| XML | `DOMParser` `application/xml` | ✔ well-formed / ✖ lỗi đầu tiên |
| HTML | chạy tree builder, đếm fixes | ✔ / ⚠ N lỗi cấu trúc (trình duyệt vẫn hiển thị được) |

## 4. Catalog tự sửa JSON (`JsonTool.parse`)

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

## 5. Catalog tự sửa XML / HTML (`MarkupTool.build`)

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

## 6. Đầu ra

- Format: thụt 2 / 4 dấu cách / Tab. Minify: 1 dòng, markup bỏ comment.
- Tải về: `<tên-gốc>.formatted.<đuôi-gốc>`; dán tay thì `ket-qua.formatted.<json|xml|html>`.
- **Tự sửa là đoán ý định** — UI nhắc người dùng luôn đọc lại danh sách thay đổi.
