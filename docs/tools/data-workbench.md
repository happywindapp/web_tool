# Tool: Data Workbench (Format · Chuyển đổi · Bảng CSV · So sánh · Format CSS·JS)

> File chạy: [`tools/data-workbench.html`](../../tools/data-workbench.html) — **FILE SINH RA** từ
> [`src/data-workbench/`](../../src/data-workbench/) bằng `pwsh scripts/build-data-workbench-single-file.ps1` (ADR #7).
> Thay tool cũ `tools/format-json-xml-html.html` (đã xoá 2026-10-28 — link cũ trả 404, dùng `data-workbench.html?tab=format`).
> Luật chung mọi tool: `docs/architecture/`, `docs/security/`, `docs/decisions/`.

## 1. Người dùng & mục đích

Dev/QA/BA cần đọc nhanh payload JSON, file cấu hình XML (`.csproj`, `.config`, `.wsdl`, `.pdm`…) hoặc HTML
bị lỗi cú pháp/1 dòng dài: kiểm tra → biết lỗi ở dòng/cột nào → tự sửa → format → copy/tải về; chuyển dữ liệu
giữa JSON/CSV/XML/YAML/SQL; xem-sửa CSV dạng bảng; so 2 phiên bản; format CSS/JS.
**Dữ liệu không rời máy** — tool có thể dùng với payload nhạy cảm (UAT log, điện tử…).

## 2. Contract (đổi là breaking)

| Giao diện | Hợp đồng |
|-----------|----------|
| URL `?tab=format\|convert\|csv\|diff\|code` | Mở thẳng tab; không có thì mở tab dùng lần trước (localStorage) |
| URL `?demo=json\|xml\|html\|nested` | Tab Format: nạp mẫu lỗi rồi chạy "Format & sửa lỗi" ngay. Không kèm `tab` ⇒ tab Format |
| Input | Dán text · `<input type=file>` · kéo-thả file vào trang (vào tab đang mở); UTF-8, bỏ BOM. Tab CSV chọn được bảng mã |
| Tên file tải về | Format/CSS·JS: `<base>.formatted.<ext>` · Chuyển đổi: `<base>.<ext đích>` · Bảng CSV: `<base>.edited.csv\|tsv`; dán tay ⇒ base `ket-qua` |
| CSV tải về | Có BOM (Excel đọc đúng tiếng Việt) — tab CSV cho tắt; xuống dòng CRLF/LF tuỳ chọn |
| Clipboard | `navigator.clipboard` khi secure context, ngược lại fallback `execCommand("copy")`; thất bại thì báo |
| localStorage | Khoá `web_tool.data-workbench.*`: tab cuối + nháp từng ô nhập (≤ 1 MB/ô). Bảng CSV **không** lưu nháp |
| Mạng | **Không có request nào** — thư viện nhúng sẵn trong file (js-beautify, js-yaml) |

## 3. Nhận diện định dạng (`Detect`)

Tab Format dùng `Detect.markup` (giữ nguyên luật cũ dưới đây). Tab Chuyển đổi dùng `Detect.data`: đuôi `csv`/`tsv tab`/`yaml yml`
→ theo đuôi; nội dung `{ [` → JSON, `<` → XML, dòng đầu có Tab → TSV, bắt đầu `---`, gạch đầu dòng, `#` hoặc `khoá:` → YAML, còn lại CSV.
Tab CSS·JS dùng `Detect.code`: đuôi `css scss less` / `js mjs cjs jsx ts tsx`, hoặc có từ khoá JS (`function const => …`) → JS.

Luật `Detect.markup`:

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
| `&` chưa thoát · `<` đứng riêng | `&amp;` · `&lt;` + báo | `&` **giữ nguyên** (HTML cho phép, trình duyệt hiển thị như cũ); `<` → `&lt;` + báo |
| Comment / CDATA / `<?…` chưa đóng | Đóng ở cuối file | Như XML |
| Giá trị thuộc tính thiếu nháy đóng | Tự đóng | Tự đóng |
| Thuộc tính không nháy `id=1` · không giá trị `con-hang` | Thêm nháy · `con-hang="con-hang"` | Chấp nhận (hợp lệ HTML) |
| Thuộc tính trùng | Bỏ bản sau | Bỏ bản sau |
| `<div/>` (non-void tự đóng) | Hợp lệ | → `<div></div>` + báo |
| Mở khối khi `<p>`/`<li>`/`<td>` đang mở | — | Tự đóng thẻ trước (luật HTML) |
| Không có / nhiều phần tử gốc | Bọc trong `<root>` | — |

HTML: tên thẻ/thuộc tính hạ chữ thường; `script style textarea title` giữ nguyên nội dung thô.

## 7. Đầu ra

- Format: thụt 2 / 3 / 4 / 8 dấu cách / Tab. Minify: 1 dòng, markup bỏ comment.
- **Sắp xếp khóa A→Z** (JSON, đệ quy, sort ổn định nên khoá trùng giữ thứ tự).
- **Giải chuỗi JSON lồng**: chuỗi mà bản thân đã là JSON **hợp lệ strict** (`"{\"a\":1}"`) → object/mảng, đệ quy;
  không đoán trong chuỗi lỗi. Ghi 1 dòng thông tin vào danh sách (không tính là lỗi).
- **Thành chuỗi JSON**: kết quả thu gọn bọc `JSON.stringify` — để nhúng payload vào JSON/code khác.
- Thống kê: số nút + độ sâu (JSON) / số thẻ + độ sâu (XML/HTML), dung lượng kết quả so với gốc.
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

Value model của converter (`Val`): giá trị JS thường, riêng **số giữ dạng chuỗi gốc** (`Val.Num {raw}`) để id 19 chữ số /
số tiền không mất chính xác; khoá gán bằng `Object.defineProperty` nên khoá `__proto__` chỉ là dữ liệu.

## 9. Tab Chuyển đổi (`Convert.run(text, from, to, opts)`)

```text
nguồn ──read──► value model ──write──► đích
 JSON  : JsonTool.parse (chịu lỗi, có fixes)        JSON / JS object (khoá hợp lệ không nháy, chuỗi nháy đơn)
 YAML  : js-yaml loadAll, CORE_SCHEMA (không Date)   YAML : js-yaml dump; số không khứ hồi được qua Number → chuỗi + ghi chú
 XML   : MarkupTool.build (chịu lỗi) → XmlMap        XML  : thuộc tính "@x", "#text", mảng → lặp thẻ, tên sai → "_" + ghi chú
 CSV/TSV: CsvTool.parse → TableShape.fromTable       CSV/TSV/SQL/Markdown/HTML: TableShape.toTable → Writers
```

| Luật | Chi tiết |
|------|----------|
| Đoán kiểu (CSV/XML) | `^-?(0\|[1-9]\d*)(\.\d+)?([eE]…)?$` → số; `true/false` → boolean. **Có 0 ở đầu (`007`, mã KH) giữ chuỗi**. Tắt được |
| Làm phẳng | Object lồng → cột `a.b`; mảng/object rỗng → JSON text. CSV → JSON thì cột `a.b` → object lồng |
| Chọn hàng | Bóc các wrapper 1 khoá (`{"data": …}`), hoặc lấy mảng object duy nhất trong object → ghi chú "Dùng mảng tại …" |
| Tiêu đề | Rỗng → `colN`; trùng → `ten_2` + ghi chú. Không có tiêu đề → mảng các mảng |
| SQL INSERT | Chọn hệ quản trị (mặc định **PostgreSQL**). Định danh không hợp lệ được đặt nháy: PostgreSQL/SQLite `"x"`, MySQL `` `x` ``, SQL Server `[x]`; `schema.bang` đặt nháy từng phần. Chuỗi nhân đôi `'` (MySQL thêm nhân đôi `\`, SQL Server dùng `N'…'` để giữ Unicode). Boolean: `TRUE/FALSE` (PostgreSQL, MySQL), `1/0` (SQL Server, SQLite). `NULL`, số giữ nguyên; **1000 hàng / câu INSERT** (giới hạn SQL Server) |
| XML → giá trị | Chú thích, `<?…?>`, DOCTYPE bị bỏ (JSON không có chỗ chứa) → 1 dòng note đếm số lượng |
| Trùng tên | Khóa JSON trùng → giữ giá trị sau + note. Cột `a` cạnh `a.b` → giữ `a.b` phẳng + note. Khóa `"a.b"` cạnh `a:{b}` khi làm phẳng → `a.b_2` + note. **Không bao giờ đè dữ liệu âm thầm** |
| Markdown | Dấu gạch đứng trong ô được thoát bằng gạch chéo ngược, xuống dòng → thẻ br, cột toàn số căn phải |
| Lỗi YAML | Báo dòng/cột từ `e.mark` |

## 10. Tab Bảng CSV

- `CsvTool.parse(text, delim)`: RFC 4180 chịu lỗi. Dấu phân cách tự nhận (`,` `;` Tab `|` — chọn cái có số lần xuất hiện đều nhất trên 30 dòng đầu).
  Ghi `fixes`: ô mở nháy không đóng (tự đóng cuối file), ký tự sau nháy đóng (nối vào ô), bỏ dòng trống, hàng lệch số cột (thiếu → để trống, thừa → thêm cột).
- Bảng mã: UTF-8, UTF-16 LE, Windows-1258, Windows-1252 (`FileReader.readAsText`) — đổi bảng mã/dấu phân cách là đọc lại (mất chỗ đã sửa).
- Sắp xếp: số thập phân so theo số, còn lại `Intl.Collator("vi", {numeric})`; lọc = chứa chuỗi (không phân biệt hoa thường).
- Sửa ô/tên cột: `contenteditable`, Enter xác nhận, Esc huỷ. Phân trang 500 hàng. Cột toàn số căn phải.
- Nhận dữ liệu không phải CSV từ tab khác ⇒ chạy `Convert.run(…, "csv")` trước.

## 11. Tab So sánh

| Kiểu | Cách làm |
|------|----------|
| Theo dòng | Myers O(ND) (`SeqDiff`), cắt phần đầu/cuối giống nhau trước; tuỳ chọn bỏ khoảng trắng / hoa-thường |
| JSON theo cấu trúc | Parse chịu lỗi 2 bên → sort khoá → pretty → diff dòng; kèm danh sách đường dẫn `+ − ~ $.a.b[0]` (`JsonDiff`, mảng so theo chỉ số) |
| XML/HTML | `MarkupTool` format 2 bên rồi diff dòng |
| Tự nhận diện | Cả 2 bắt đầu `{`/`[` → JSON; cả 2 bắt đầu `<` → XML/HTML; còn lại theo dòng |

Hiển thị song song; cặp dòng xoá/thêm ghép thành "sửa" có tô ký tự khác (diff ký tự khi tổng ≤ 4.000 ký tự).
Vùng giống nhau > ±3 dòng thu gọn, bấm để mở. Giới hạn: > 3.000 chỗ khác ⇒ dừng, báo so từng phần.

## 12. Tab Format CSS · JS

- `js_beautify` / `css_beautify` (js-beautify 1.15.1, MIT, nhúng trong file). Tuỳ chọn: thụt, vị trí `{`, số dòng trống giữ lại
  (`max_preserve_newlines` = N lần xuống dòng ⇒ N−1 dòng trống), ngắt dòng 80/120, `.method()` mỗi dòng, giải `\xNN \uNNNN`, JSX.
- Sau format JS: kiểm tra cú pháp bằng `new Function(code)` — **chỉ biên dịch, không chạy**; bỏ qua với JSX, TypeScript, ES module.
- Thu gọn CSS (`CssMin`): bỏ chú thích, gộp khoảng trắng ngoài chuỗi; **giữ** khoảng trắng có nghĩa (`calc(a - b)`, `a :hover`, `and (`).
  Thu gọn JS chưa hỗ trợ (cần bộ nén chuyên dụng).

## 13. Module & build

```text
src/data-workbench/
  data-workbench.template.html  # khung trang + marker @include (thứ tự include = thứ tự chạy)
  styles/*.css  partials/*.html  third-party/ (js-beautify, js-yaml + LICENSE)
  js/core/        TextUtil · Dom/Store · LineEditor (gutter + nháp) · ReportPanel · Workbench (router tab)
  js/parsers/     Detect · JsonTool · JsonAst · MarkupTool · CsvTool · CssMin
  js/render/      ViewRender
  js/converters/  Val · TableShape · XmlMap · Writers · Convert
  js/diff/        SeqDiff · JsonDiff
  js/tabs/        DEMOS · format · convert · csv-grid · diff-render · diff · code-format (mỗi tab tự Workbench.register)
  tests/pure-modules.test.js    # node --test, nạp module thuần qua vm
```

- `Workbench.register(id, {label, init, primary, receive, onFile, demo})`: tab khởi tạo lười khi mở lần đầu; Ctrl+Enter gọi `primary`;
  "Gửi kết quả sang…" gọi `receive(text, {kind})` của tab đích; kéo-thả file gọi `onFile` của tab đang mở.
- Build: thay mỗi dòng `@include <file>` bằng nội dung file; JS có `</script` được đổi thành `<\/script`, có `<script` thì build dừng.

## 14. Luồng tab Format

```text
load(name, text) | input (debounce 300ms) ──► check()
   ├─ JSON : JsonTool.check  → JSON.parse native, lấy line/col từ message lỗi
   ├─ XML  : MarkupTool.checkXml → DOMParser("application/xml") → <parsererror>
   └─ HTML : MarkupTool.build(html=true) → số fixes (cảnh báo, không phải lỗi cứng)

nút "Format & sửa lỗi" → run("pretty") · "Thu gọn 1 dòng" → run("min") · "Thành chuỗi JSON" → run("escape")
   ├─ JSON : parse → AST + fixes → [decodeNested] → [sortKeys] → stringify(indent | "")
   └─ XML/HTML : build → tree + fixes → serialize(indent) | minify
   └─► highlight → #fmt-out · tree → #fmt-tree · ReportPanel.show(fixes + notes) → #fmt-msgs
```

- `ReportPanel` đánh dấu đỏ các dòng có lỗi ở gutter của `LineEditor`; bấm 1 dòng trong danh sách → `jump(line)`.
- "← Dùng kết quả" đưa output sang input để sửa tiếp (vòng lặp sửa nhiều lượt).
- Sơ đồ mermaid: [`docs/diagrams/`](../diagrams/README.md).

## 15. Giới hạn hiệu năng (hằng số trong code)

| Giới hạn | Giá trị | Hành vi |
|----------|---------|---------|
| Tô màu output | > 1.500.000 ký tự | Chỉ escape, không tô màu |
| Cây dữ liệu | 4.000 nút | Cắt, hiện "… còn nữa"; tự mở 60 nút JSON / 80 nút markup đầu |
| Gutter số dòng | 200.000 dòng | Không đánh số quá mức này; chỉ vẽ lại khi số dòng hoặc tập dòng lỗi đổi |
| Auto-check khi gõ (Format) | < 3.000.000 ký tự | Lớn hơn thì chỉ cập nhật gutter |
| Tự chuyển khi gõ (Chuyển đổi) | < 500 KB | Lớn hơn bấm "Chuyển đổi" |
| Tự so khi gõ (So sánh) | tổng < 200 KB | Lớn hơn bấm "So sánh" |
| Diff | 3.000 chỗ khác (dòng) · 200 (ký tự) | Dừng / tô cả dòng |
| Bảng CSV | 500 hàng/trang | Phân trang; lọc để thu hẹp |
| Danh sách lỗi | 500 mục hiển thị · CSV ghi tối đa 1.000 fix | "… và N mục nữa" |
| Nháp localStorage | ≤ 1 MB/ô | Lớn hơn thì xoá nháp, không lưu |
