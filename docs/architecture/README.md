# Architecture — web_tool

## 1. Mô hình

- **Static single-file tool (công cụ 1 file tĩnh)**: mỗi tool = 1 file `.html` trong `tools/`, CSS + JS inline.
- `index.html` ở root = trang chủ tĩnh, chỉ chứa link tới từng tool.
- Không backend, không build, không dependency, không network request. Mở bằng `file://` hay host tĩnh đều chạy.
- Trạng thái chỉ sống trong DOM/biến JS của tab — không `localStorage`, không cookie.

```text
index.html                 # trang chủ: danh sách tool
tools/<ten-tool>.html      # 1 tool = 1 file tự chứa
docs/tools/<ten-tool>.md   # kiến thức riêng của tool (luật, contract, data model, module, giới hạn)
```

## 2. Module & luồng từng tool

Xem `docs/tools/<tool>.md` — danh sách ở [`docs/tools/`](../tools/README.md).

## 3. Nguyên tắc kiến trúc

- Thêm tool mới = thêm 1 file `tools/<ten-kebab>.html`, cùng khuôn: header toolbar (có dropdown dữ liệu mẫu + nút `🔗 Chia sẻ link`) · nút `VI | EN` · 2 pane · footer trạng thái · khối tác giả.
  Tool chưa song ngữ, chưa có dữ liệu mẫu hoặc chưa có link chia sẻ = **chưa xong** (xem 3 checklist bên dưới).
- **Dữ liệu mẫu để test nhanh (bắt buộc mọi tool):** người dùng phải thử được tool trong 1 cú bấm, không cần chuẩn bị input.
  1. Toolbar có `<select>` mẫu, option đầu rỗng `Thử mẫu…` (tên mẫu ngắn, mô tả tình huống: "JSON lỗi", "CSV có lỗi"…).
     Chọn xong là **nạp + chạy luôn** rồi trả dropdown về option rỗng. Tool nhiều tab ⇒ mỗi tab 1 dropdown mẫu riêng.
  2. URL `?demo=<key>` nạp mẫu `<key>` rồi chạy ngay (dùng để chia sẻ link thử + test tự động); xoá `demo` khỏi URL sau khi nạp
     để F5 không đè bài đang sửa.
  3. Bộ mẫu phủ được tính năng chính: ≥ 1 mẫu **hợp lệ/điển hình** + ≥ 1 mẫu **có lỗi/ca khó** nếu tool có kiểm tra, tự sửa
     hay báo lỗi (để người dùng thấy ngay danh sách lỗi/sửa). Tool có nhiều chế độ/loại input ⇒ mỗi chế độ chính 1 mẫu.
  4. Mẫu nhỏ (vài chục dòng), thực tế, **dữ liệu giả** — không dữ liệu khách hàng thật, token, mật khẩu, URL nội bộ.
     Gom vào 1 hằng (`DEMOS` / `SAMPLES`), không rải trong code UI.
  5. Tên mẫu trong dropdown dịch theo VI/EN; **nội dung mẫu viết bằng English** (tên, ghi chú, nhãn sơ đồ…), cố định, không đổi theo ngôn ngữ UI.
  6. Tool có nháp/lịch sử: nạp mẫu không được âm thầm làm mất bài đang sửa (lưu vào lịch sử trước, như Mermaid `setState`).
  7. Ghi danh sách key `?demo=` vào mục Contract của `docs/tools/<tool>.md`.
- **Link chia sẻ dữ liệu (bắt buộc mọi tool) — ADR #9:** người dùng gửi được đúng dữ liệu + kết quả cho người khác bằng 1 link.
  1. Header có nút `🔗 Chia sẻ link` (tooltip: "dữ liệu nằm sau dấu #, không gửi lên máy chủ"). Bấm ⇒ chép link, báo số ký tự;
     mở bằng `file://` ⇒ báo thêm "link chỉ dùng được trên máy này"; trình duyệt chặn clipboard ⇒ `prompt()` hiện link để tự chép.
  2. Định dạng: `<tool>.html[?tab=<id>]#pako:<base64url(zlib(JSON payload))>`, cùng định dạng mermaid.live; đọc thêm `#base64:` (không nén).
     Dùng codec `src/data-workbench/js/core/share-link-codec.js` (`ShareCodec.encode/decode`) — tool 1 file thì **chép nguyên văn**.
     Dữ liệu **luôn ở hash**, không bao giờ tạo link đưa dữ liệu vào query (query đi lên server/log, lỗi 414 khi dài).
  3. Payload = dữ liệu người dùng + mọi tuỳ chọn ảnh hưởng kết quả (+ tab nếu nhiều tab) ⇒ người nhận thấy **đúng kết quả** như người gửi.
  4. Mở link ⇒ nạp + chạy ngay, rồi xoá hash/`data` khỏi URL (`history.replaceState`) để F5 không đè bài; nghe `hashchange` để dán link mới vào thanh địa chỉ cũng nạp.
  5. Đọc thêm `?data=<text>` (dữ liệu thô tự soạn; giá trị `pako:`/`base64:` giải như hash). Doc tool ghi rõ dạng này đi lên server, chỉ cho dữ liệu ngắn.
  6. Nạp link không âm thầm làm mất bài đang sửa: giữ bản cũ + nút `↶ Khôi phục bản trước` (Data Workbench) hoặc lưu vào lịch sử (Mermaid).
  7. Payload là dữ liệu không tin cậy: chỉ gán vào field đã biết của tool, kiểm kiểu (`text` là string…), kết quả vẫn escape như input thường;
     link hỏng ⇒ báo lỗi rõ, không đụng nháp.
  8. Ghi contract link (định dạng, payload, `?data=`) vào `docs/tools/<tool>.md`.
  9. Kiểm: tạo link → mở ở trang mới → ra cùng dữ liệu, tuỳ chọn, kết quả; thử link hỏng và `?data=` thô.
- **Khối tác giả (bắt buộc mọi tool):** đặt ngay sau `</footer>` trạng thái, chép nguyên văn markup + CSS dưới đây:

  ```html
  <div class="author">
    <span>Tác giả:</span><b>Phan Ngọc Minh Quân</b>
    <span>GitHub Source:</span><a href="https://github.com/happywindapp/web_tool/">github.com/happywindapp/web_tool</a>
  </div>
  ```

  ```css
  .author { display:flex; flex-wrap:wrap; gap:2px 6px; padding:4px 16px 6px; background:var(--panel); font-size:12px; color:var(--muted); } .author a { color:var(--acc); } .author span:not(:first-child) { margin-left:10px; }
  ```

- **Song ngữ VI/EN (bắt buộc mọi tool + `index.html`):** nút `VI | EN` ở góc trên-phải header
  (`<span class="lang-switch"><button data-lang="vi">VI</button><button data-lang="en">EN</button></span>`, `position:absolute` góc phải). Màu riêng, khác nút thường: chọn = cam đậm `#c2410c`/chữ trắng; không chọn = vàng nhạt
  `#fef3c7`, chữ `#92400e`, viền `#fcd34d`, hover `#fde68a` (dark mode: `#422006`/`#fcd34d`, chọn `#ea580c`).
  Module `I18n` (nguồn: `src/data-workbench/js/core/i18n-ui-language-vi-en.js`, **chép nguyên văn** vào tool 1 file):
  - Markup/code giữ chuỗi **tiếng Việt làm khoá**; từ điển English `I18n.add({"chuỗi VI": "English"})`; chuỗi động dùng `T("Đã nạp {n} hàng", { n })`, số dùng `I18n.num(n)`.
  - `I18n.init()` dịch text node + `title`/`placeholder` của markup tĩnh; bỏ qua vùng dữ liệu người dùng
    `textarea, pre, code, svg, table, [contenteditable], [data-i18n-skip]` (thuộc tính của chính `textarea`/`pre` vẫn dịch).
  - Ngôn ngữ: `localStorage["web_tool.lang"]` (dùng chung mọi tool) → không có thì theo `navigator.language` (`vi*` → VI, khác → EN).
  - Đổi ngôn ngữ **không reload**: `I18n.onChange(fn)` để tool dựng lại nội dung động (status, danh sách lỗi, dropdown sinh bằng JS).
  - Nội dung dữ liệu mẫu (demo/sample) viết bằng **English**, không đổi theo ngôn ngữ UI; tên tác giả không dịch.
  - **Checklist song ngữ khi thêm/sửa tool** (áp dụng cả khi chỉ thêm 1 nút/1 thông báo):
    1. Header có nút `VI | EN` + CSS màu chuẩn ở trên; `<html lang="vi">`; script gọi `I18n.init()` trước khi dựng UI động.
    2. Chép module `I18n` + `const T = I18n.t` nguyên văn từ file nguồn ở trên (sửa module ⇒ chép lại sang **mọi** tool + `index.html`).
    3. Mọi chuỗi hiển thị (text, `title`, `placeholder`, status, lỗi, `prompt`/`confirm`, option sinh bằng JS, tên file tải mặc định)
       có bản English trong từ điển; chuỗi động đi qua `T("… {x} …", { x })` — **không** ghép tiếng Việt trong template literal.
    4. Nội dung dựng bằng JS phải dựng lại trong `I18n.onChange` (chạy lại hành động cuối, không làm mất dữ liệu người dùng đang sửa).
    5. Vùng chứa dữ liệu người dùng nằm trong `SKIP`, hoặc gắn `data-i18n-skip`.
    6. Card mới trong `index.html` ⇒ thêm bản English của tên + mô tả card vào `I18n.add` của `index.html`.
    7. Kiểm: bấm EN, chạy thử mọi chức năng, rồi dán vào DevTools Console — kết quả phải rỗng:

       ```js
       [...document.querySelectorAll("body *")].filter(e => !e.closest("script,style,textarea,pre,code,svg,table,[contenteditable],[data-i18n-skip]"))
         .flatMap(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.data).concat(e.title || [], e.placeholder || []))
         .filter(s => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(s) && !s.includes("Phan Ngọc Minh Quân"))
       ```

       Data Workbench có thêm test tự động `src/data-workbench/tests/i18n-dictionary-coverage.test.js`.
- Code dùng chung giữa các tool được **chép** vào từng file (chấp nhận trùng lặp để giữ tự chứa — ADR #1).
  Tool có build (Data Workbench, FIX Parser) `@include ../data-workbench/js/core/…` thay vì chép. Module dùng chung hiện có: `I18n`, `ShareCodec`, `TextUtil`, `ThemePicker` (giao diện Tự động/Sáng/Tối, `:root[data-theme]`), `SavedSessions` (💾 lưu / 📂 mở / 🗑 xoá bản lưu đặt tên trong localStorage, ≤ 30), `ColFilter` (lọc cột: popover, menu chuột phải, chip) + css `styles/theme-filter-popover-chips.css` + EN `js/i18n/en-shared-theme-sessions-filters.js`. Mermaid (tool 1 file) chép nguyên văn `ThemePicker` + `SavedSessions`. Sửa module chung ⇒ `pwsh scripts/build-single-file-tool.ps1` (build mọi tool) và chép lại sang tool 1 file.
  Ngoại lệ: Data Workbench viết module ở `src/data-workbench/` rồi build ghép thành 1 file (ADR #7).
- Không đưa thư viện ngoài vào; nếu bắt buộc → hỏi user và ghi ADR (đổi cam kết offline/riêng tư).
- Parser trả `fixes` thay vì throw — chỉ throw khi không thể xử lý (vd nội dung trống).
