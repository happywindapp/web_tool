# Tool: FIX Parser

> File: [`tools/fix-message-parser.html`](../../tools/fix-message-parser.html) — **file sinh ra** từ
> [`src/fix-message-parser/`](../../src/fix-message-parser/) bằng `pwsh scripts/build-single-file-tool.ps1 -Tool fix-message-parser` (ADR #7).
> Luật chung mọi tool: `docs/architecture/`, `docs/security/`, `docs/decisions/`.

## 1. Người dùng & mục đích

Dev/QA/BA làm hệ thống giao dịch (HSC Bond/Carbon ↔ Server Sàn, broker ↔ sàn) cần **đọc nhanh message/log FIX**: tag nào nghĩa gì,
lệnh đi qua những message nào, message nào sai checksum/thiếu tag — **mà không dán log UAT/prod lên web công cộng**.
Tool giống fixparser.targetcompid.com nhưng chạy offline, có từ điển **Server Sàn FIX 4.4** (BCGD `35=s/t/u`, ĐTTTT `S/AI/AJ/Z`).

## 2. Review công cụ tham khảo (2026-10)

| Công cụ | Điểm mạnh | Hạn chế với nhu cầu nội bộ |
|---------|-----------|----------------------------|
| **fixparser.targetcompid.com** (free + Pro) | Timeline message (Time, Sender, Target, MsgType, ClOrdID, OrigClOrdID, OrderID, Text), lọc theo cột, ẩn session message, chọn múi giờ, theo chuỗi cancel/replace + parent/child, chi tiết tag (theo message / số tag / tên / nhóm), hover tooltip, nhận nhiều delimiter (SOH, `\|`, `^A`, space…). Pro: cột tuỳ chọn, từ điển riêng (CSV), annotation, ẩn danh hoá, xuất Excel, lưu phiên | Google Analytics + gọi ipinfo.io; Pro tính phí; không biết dialect Server Sàn (tag 2/449/640/6363/6464 bị đọc sai nghĩa) |
| **OnixS FIX Analyser** (desktop) | Query builder, regex, sort nhiều cấp, kiểm required/conditional/group/enum, theo dõi file realtime | Cài đặt, bản quyền thương mại |
| **B2BITS FIXEye / FIXGrep** | Tìm theo ngữ nghĩa (`35=D` = NewOrderSingle), file nén/mạng, cảnh báo | Windows GUI / CLI, thương mại |
| **Parser trình duyệt khác** (vd tiện ích Raycast FIX Helper, parser client-side) | Kiểm BodyLength/CheckSum, repeating group, giờ UTC→local, lọc theo ClOrdID, xuất JSON | Từ điển chuẩn, không có Server Sàn; không gom chuỗi lệnh / không che dữ liệu |

**Tool này lấy**: timeline + lọc + ẩn session + múi giờ + chuỗi lệnh + chi tiết tag (2 thứ tự) + cột thêm + che dữ liệu + xuất CSV của
targetcompid; kiểm BodyLength/CheckSum/required/kiểu/enum/group của OnixS. **Thêm**: dialect Server Sàn tự nhận, mẫu BCGD/ĐTTTT, link chia sẻ `#pako:`,
"Chép bản sửa 9/10". **Tính năng bản Pro của targetcompid** (trang `/pricing/`) đã làm: annotation, ẩn danh theo nhóm, xuất Excel giữ nguyên giá trị, cột tuỳ chọn + kéo-thả thứ tự,
lọc theo cột + khoảng giờ, từ điển riêng (CSV), chuỗi lệnh + cha–con, lưu phân tích, tra tag khi giữ Alt trên ô nhập + tô màu ô nhập, theme sáng/tối — xem mục 4 "Tính năng nâng cao".
**Cố ý bỏ**: tài khoản/đồng bộ cloud, nhiều phân tích mở song song (chỉ chuyển qua lại), streaming file rất lớn, theo dõi file realtime, TCP capture.

## 3. Contract (đổi là breaking)

| Giao diện | Hợp đồng |
|-----------|----------|
| URL `?demo=<key>` | `bcgd` (vòng đời BCGD trong log theo quy trình CBTS 3.3.10–3.3.17: cùng công ty `s→8`, khác công ty `s→s echo→8`, đối ứng chấp nhận `s 549=3`, sửa `t 549=2`, huỷ `u→8 150=4`, Reject, h/f) · `bcgd-day` (14 báo cáo giao dịch trong ngày: cùng/khác công ty, chờ đối ứng, sửa, huỷ, reject `-31003`) · `ttdt` (ĐTTTT: S → AI → match, huỷ Z `298=4`, chấp nhận AJ) · `order` (FIX 4.4 cổ phiếu, SOH, nhóm Parties, 9/j) · `algo` (FIX 4.4: lệnh algo cha từ khách → 3 lệnh con có `583`, 1 con bị sửa, 1 con bị huỷ, 1 con có lệnh cha ngoài log) · `broken` (mỗi dòng phạm 1 luật, `^A`). Nạp xong xoá `demo` khỏi URL. Mở tool không tham số ⇒ nạp sẵn mẫu `bcgd` |
| URL hash `#pako:<b64url>` | `base64url(zlib(JSON {text, opts, sel, chain, notes, filters, layout}))` — `opts` = giá trị các control `[data-opt]` (`dialect tz cols q type hideAdmin hideBc onlyBad onlyNotes order hideHdr`), `sel` = index message đang chọn, `chain` = số gốc chuỗi đang lọc, `"f:<gốc>"` / `"f:v:<id>"` khi lọc lệnh cha + con, hoặc `null`, `notes` = `{"<hash>.<n>": text}` (khoá theo nội dung message; link cũ dạng `{index: text}` vẫn đọc được), `filters` = `[{col, op: has|eq|neq|range, v, v2}]`, `layout` = thứ tự id cột. Đọc thêm `#base64:`. Mở xong xoá hash; nghe `hashchange` |
| URL `?data=<text>` | Message/log thô (URL-encode); `pako:`/`base64:` giải như hash. **Đi qua query ⇒ lên server** — chỉ cho dữ liệu ngắn, không nhạy cảm |
| Input | Dán / `Mở file…` / kéo-thả (UTF-8). Mỗi dòng 0..n message; tiền tố log (giờ, IN/OUT…) giữ lại hiển thị; dòng không có FIX bị bỏ qua (đếm ở status) |
| Output | `fix-messages.csv` (UTF-8 BOM, các cột đang hiển thị theo thứ tự + Ghi chú + Lỗi/cảnh báo + Raw, **chỉ message đang lọc**; số có 0 đầu / >15 chữ số / số lẻ có 0 cuối / giờ ghi dạng `="…"` để Excel giữ nguyên) · `fix-messages.json` · clipboard: message dạng `\|` / SOH / JSON / bản sửa 9/10 |
| localStorage | Tiền tố `web_tool.fix-message-parser.`: `opts` `{dialect, tz, cols, hideAdmin, hideBc, order, hideHdr}` · `layout` (thứ tự cột) · `theme` · `customDict` (CSV) · `maskCats` / `maskExtra` · `analyses` (≤ 30 phân tích đã lưu `{id, name, t, payload}` — **chỉ khi người dùng bấm 💾 Lưu phân tích mới lưu dữ liệu FIX**) · `web_tool.lang` |
| Ngôn ngữ UI | `VI \| EN` (ADR #8). Tên/ý nghĩa tag lấy từ spec (English) — là dữ liệu, không dịch; nội dung mẫu English |
| Mạng | Không request nào; CSP `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:` |
| Phím tắt | `Ctrl+↑/↓` (hoặc `↑/↓` khi focus bảng/chi tiết) chọn message |

## 4. Luật xử lý

### Tách message (`FixLog.extract`)
- Mỗi dòng tìm mọi `8=FIX.x.y` / `8=FIXT.1.1` / `…SP2`; nhiều message trên 1 dòng (log SOH dính liền) được tách.
- **Delimiter** = chuỗi nằm giữa BeginString và `9=` (SOH, `|`, `^A`, `<SOH>`, `\x01`…). Dòng không có `8=` nhưng có `35=` ⇒ "mẩu" (fragment),
  delimiter = ứng viên xuất hiện nhiều nhất. Không xác định được ⇒ lỗi.
- Cắt sau `10=ddd` (bỏ đuôi log). Phần trước `8=` của message đầu dòng = tiền tố log.

### Từ điển (`FixDict`)
- **FIX 4.4 chuẩn** (QuickFIX `FIX44.xml`) + **lớp phủ Server Sàn** (chỉ các mục khác chuẩn, rút từ QuickFIX fork của sàn) + **tên tag FIX 5.0SP2** làm dự phòng (hiện nghiêng).
- Dialect `Tự nhận`: Server Sàn (`venue`) khi có message chứa `369=`, `4488=`, `6363=` hoặc `6464=`; ngược lại FIX 4.4.
- **Tên sàn lấy động từ dữ liệu**: `49` của message sàn gửi (`8 9 h f j AI`), không có thì `56` của lệnh gửi sàn (`D F G s t u S Z AJ R`), không có nữa thì "Server Sàn" (EN "Exchange server"). Tên này hiện ở nhãn từ điển (`<tên> FIX 4.4`), tooltip `Spec <tên> v1.15` và thay placeholder `{venue}` trong ghi chú spec (`FixKnow.setVenue`). Source không chứa tên sàn cố định nào.
- Khác biệt Server Sàn quan trọng: `2`=CoAccount (chuẩn AdvId), `449`=CoPartyID, `109`=TotalListingQtty, `334`=Parvalue, `117`↔`171` (QuoteID ở 171),
  `640` Price2, `6363` SettlMethod, `6464` SettlValue, `4488` OrderPartyID; header bắt buộc thêm `369`; `40=R` = BCGD outright.
- Chỉnh tay so với spec (ghi trong generator): `449` kiểu STRING (spec giữ kiểu UTCDATEONLY của tag chuẩn); ER `35=8` Server Sàn **không** bắt buộc `6` AvgPx (wire thật không gửi).
- Mã lỗi Server Sàn (`373`) tra theo **Phụ lục 01** của spec CBTS v1.15 (180 mã, vd `-32001` Thị trường chưa nhận lệnh, `-32024` Phiên giao dịch đã kết thúc nhận lệnh,
  `-34000` Trạng thái lệnh không hợp lệ hoặc SHL không tồn tại, `-34056` Thông tin lệnh không đúng hoặc lệnh đã bị sửa).

### Giải thích tag — cột "Ý nghĩa" + tooltip (`FixKnow`, `TagInfo`)
- Nguồn: **FIX Orchestra FIX44** (mô tả field / message / giá trị enum, English) + **spec của sàn "CBTS.FIX Message & Protocol for Gate v1.15" (tên sàn trong text → `{venue}`)**
  (ghi chú từng tag **theo từng message**, mục đích message, bảng mã lỗi — tiếng Việt nguyên văn, kể cả khi UI ở EN).
- ExecutionReport được spec Server Sàn mô tả riêng theo ExecType ⇒ khoá ghi chú `8/<150>` (`8/0` xác nhận đặt, `8/3` khớp, `8/4` huỷ, `8/5` sửa, `8/8` từ chối).
  Tag không có trong bảng của message đang xem ⇒ lấy ghi chú ở message khác, tooltip ghi "theo bảng của …".
- Cột **Ý nghĩa** (ưu tiên): mã lỗi Server Sàn (373) → **nghĩa giá trị theo spec Server Sàn** (danh sách `1 = …`, `R: …`, `‘0’ = …` trong ghi chú) kèm `FIX: <enum chuẩn>` mờ
  nếu khác → enum FIX → giờ quy đổi / số có phân cách → nếu không có giá trị để giải thích thì hiện **mô tả ngắn** của tag (in nghiêng: dòng đầu ghi chú spec sàn, hoặc câu đầu mô tả FIX).
- **Tooltip** (rê chuột vào dòng tag): tên + kiểu + bắt buộc/tuỳ chọn trong message (theo spec Server Sàn nếu có, không thì theo từ điển) · giá trị → nghĩa ·
  "Mô tả FIX 4.4" (synopsis + nghĩa chuẩn của giá trị) · `Spec <tên sàn> v1.15 — <message>` (ghi chú nguyên văn). Ô "Loại" ở bảng message có tooltip mục đích message;
  đầu pane chi tiết hiện mục đích message (Server Sàn + FIX).
- Validator coi giá trị/mã lỗi có trong spec Server Sàn là "đã biết" (không báo info "không có trong từ điển").

### Kiểm tra (`FixCheck.analyse`) — mức `error` / `warn` / `info`

| Mức | Luật |
|-----|------|
| error | không xác định delimiter · mẩu không phải `tag=value` · `8` không đứng đầu · `9` không thứ 2 · `35` không thứ 3 · thiếu `10` cuối · BodyLength sai · CheckSum sai · thiếu tag header bắt buộc · mẩu message không có header (chỉ báo 1 lỗi, không kiểm 9/10) |
| warn | MsgType lạ · thiếu tag bắt buộc của message (top-level, kể cả qua component bắt buộc) · tag lặp ngoài repeating group · tag header nằm sau thân · sai kiểu (INT/QTY/PRICE/AMT/FLOAT, UTCTimestamp, ngày `YYYYMMDD`, BOOLEAN) · số phần tử nhóm ≠ NumInGroup |
| info | tag không có trong từ điển · giá trị rỗng · giá trị enum không có trong từ điển |

- BodyLength/CheckSum tính trên dạng SOH (đổi delimiter khác về SOH), đếm **byte UTF-8**.
- Repeating group: tag `NoXXX` mở scope gồm các member (gộp từ mọi message trong spec), member đầu = bắt đầu phần tử; hiển thị thụt lề + `#n`.

### Chuỗi lệnh và lệnh cha–con (`FixChain.link`, `ChainPick`)
- **Chuỗi lệnh** (huỷ/sửa): union-find các message chia sẻ **giá trị** ở tag `11 41 37 526 548 551 117 131 171 693` (Server Sàn: 41 = 526 = 37 = số hiệu lệnh của sàn nên ER nối được với lệnh gốc) — tìm được cả khi ClOrdID đổi mỗi lần sửa/huỷ.
- `35=3`/`35=j` nối với message mà `45` (RefSeqNum) trỏ tới: cùng `49` = `56` của reject, `34` = `45`, lấy message gần nhất phía trước (seq của sàn reset mỗi ngày).
- **Lệnh cha–con**: tag liên kết `583` ClOrdLinkID + các tag `link` của từ điển riêng **không gộp** chuỗi; giá trị của tag chỉ ra lệnh cha = chuỗi sở hữu ID đó. Lệnh cha không có trong log ⇒ **lệnh cha ảo** `v:<id>`. Cây nhiều tầng (con của con) được gom theo `family(key)`.
- Dropdown `⛓ Chuỗi lệnh`: `🌳 lệnh cha — k lệnh con, n message` (chọn ⇒ cả nhà) · `· chỉ lệnh cha` · `└ lệnh con` (chọn ⇒ chỉ chuỗi huỷ/sửa của con đó) · rồi các chuỗi độc lập. Pane chi tiết có thêm nút `🌳 Theo lệnh cha + con (n)`, menu chuột phải có `Theo lệnh cha + con`; chip ghi `🌳 <cha> + k lệnh con: n message`.
- Giới hạn: QuoteID ĐTTTT và OrderID BCGD cùng format nên có thể trùng giá trị ⇒ gộp nhầm (hiếm).
- Mẫu `algo`: `PARENT-7001` + 3 lệnh con (15 message), `CH-7001-2` → `CH-7001-2R` vẫn 1 chuỗi; `CH-6999-4` dưới lệnh cha ảo `PARENT-6999`.

### Che dữ liệu (`FixMask.apply`)
- Hộp thoại `🕶 Che dữ liệu…` chọn nhóm (nhớ lựa chọn): tài khoản `1 79 440` (+ `2` khi dialect Server Sàn) · đăng nhập `553 554 925` · thành viên `448 449 4488` ·
  CompID `49 56 50 57 115 128` · số hiệu lệnh `11 41 37 17 526 548 551 117 131 171 693` · Text `58` + tag tự nhập + tag `sensitive` của từ điển riêng. Mặc định: tài khoản + đăng nhập.
- Đăng nhập và Text ⇒ `*`; nhóm còn lại ⇒ **bí danh cùng độ dài, nhất quán** (giữ ≤ 4 ký tự đầu + `X…` + số thứ tự: `001C000101` → `001CXXXXX1`) nên cùng giá trị ở mọi tag
  ⇒ cùng bí danh, chuỗi lệnh vẫn nối như trước. Bí danh áp cả lên dòng log thường (vd "Created session …").
- Message đang hợp lệ ⇒ tính lại `9/10`; message vốn lỗi giữ nguyên lỗi. Có `↶ Khôi phục bản trước` (trừ khi đang là dữ liệu mẫu).

### Tính năng nâng cao (tương đương bản Pro của targetcompid)

| Tính năng | Cách dùng / luật | Module |
|-----------|------------------|--------|
| Lọc theo cột | Bấm tiêu đề cột ⇒ popover `chứa / bằng / khác`; cột **Giờ** ⇒ khoảng `Từ – Đến` tới mili-giây, theo múi giờ đã chọn; **có thể kèm ngày** `YYYY-MM-DD HH:MM:SS.fff` (so ngày + giờ đầy đủ — log nhiều ngày), bên không ghi ngày mượn ngày của bên kia (`2026-10-28 09:00` – `09:30`); không ghi ngày ⇒ chỉ so giờ như cũ. Chuột phải vào ô ⇒ `Chỉ hiện` / `Loại trừ` giá trị đó, `Theo chuỗi lệnh`. Mỗi bộ lọc là 1 chip có ✕, cộng dồn với bộ lọc thường; lọc được cả cột thêm | `ColView` |
| Cột tuỳ chọn + thứ tự | `Cột thêm` (≤ 8 tag) như cũ; **kéo-thả tiêu đề** để đổi thứ tự cả cột có sẵn lẫn cột thêm (lưu `layout`); `↺ Cột` về mặc định | `ColView`, `Timeline.columns` |
| Ghi chú (annotation) | Ô `📝` trong pane chi tiết; **gắn theo nội dung message** (hash các cặp `tag=value`, không phụ thuộc dấu phân cách, + thứ tự nếu trùng) nên chèn/xoá dòng phía trên vẫn đúng message; che dữ liệu (đổi nội dung) chuyển ghi chú theo vị trí; dòng có ghi chú hiện 📝 ở cột `#` (tooltip = nội dung); lọc `Có ghi chú`; đi theo link chia sẻ, phân tích đã lưu, CSV (cột Ghi chú) và JSON (`note`) | `Notes` |
| Lưu phân tích | `💾 Lưu phân tích` (đặt tên) lưu `{text, opts, sel, chain, notes, filters, layout}`; chọn ở `📂 Phân tích đã lưu` để mở lại; `🗑` xoá phân tích đang mở. Tối đa 30, báo lỗi khi storage đầy/bị chặn | `Saved` |
| Chuỗi lệnh + cha–con | Dropdown dạng cây `🌳 lệnh cha → └ lệnh con` + các chuỗi độc lập; chọn lệnh cha ⇒ cả nhà, chọn lệnh con ⇒ chỉ chuỗi huỷ/sửa của nó (xem mục Chuỗi lệnh) | `ChainPick`, `FixChain` |
| Từ điển riêng | `📖 Từ điển riêng…`: CSV `tag,name,type,value,meaning,flags` (dòng có `value` = thêm ý nghĩa giá trị; flags `sensitive` / `link`), dán hoặc mở file, `Chèn ví dụ`. Áp **trên** mọi dialect (đặt tên tag, enum, không còn báo "không có trong từ điển"); tooltip ghi "từ điển riêng" | `FixCustom`, `FixDict.setCustom`, `Settings` |
| Ô nhập tô màu + tra tag | `<pre>` nằm dưới `<textarea>` chữ trong suốt: tag xanh, value lục, dòng không phải FIX mờ; **giữ Alt + rê chuột** lên cặp `tag=value` ⇒ tooltip đầy đủ như pane chi tiết. Tắt tô màu khi input > 300 KB | `InputView` |
| Theme | `Giao diện`: Tự động (theo hệ điều hành) / Sáng / Tối | `Settings` |
| Xuất Excel đúng giá trị | Xem Output ở mục 3 | `Timeline.csv` |

## 5. Data model

```text
item  { line, prefix, raw, delim }                         ← FixLog.extract
msg   { …item, type, level, fields[], issues[], get(tag), all(tag) }   ← FixCheck.analyse
field { tag|null, value, i, section: header|body|trailer|bad, depth, entry, first, level }
issue { level: error|warn|info, key: "<chuỗi VI cho T()>", params, tag }
dict  { dialect, fields Map<tag,{name,type,enums,fix50?}>, msgs Map<type,{name,cat,req[]}>, groups Map<countTag,member[]>, header Set, trailer Set, headerReq[] }
```

## 6. Module & luồng

`src/fix-message-parser/`: `js/dictionary/*-data.js` (sinh ra) → `fix-dictionary.js` + `tag-explanation-lookup.js` (`FixKnow`) · `js/parser/` (`fix-wire-codec`, `fix-log-extractor`, `fix-message-validator`) ·
`js/model/` (`order-chain-linker`, `fix-timestamp-time-zone-format`, `sensitive-data-mask`) · `js/samples/` (mẫu Server Sàn, mẫu FIX 4.4/lỗi, registry) ·
`js/ui/` (`message-timeline-table`, `tag-meaning-and-tooltip` (`TagInfo`), `message-detail-pane`, `share-link-demo-and-backup`, `fix-parser-app`) · `js/i18n/`. Module `I18n` + `ShareCodec` và
`styles/base.css` + `styles/app-bar-tabs-toolbar-surfaces.css` được `@include` thẳng từ `src/data-workbench/` (nguồn chung, không chép).

Luồng: input (debounce 250 ms) → `FixLog.extract` → chọn dialect → `FixCheck.analyse` từng message → `FixChain.link` → `Timeline.visible/render` + `Detail.render`.

**Sinh lại dictionary** (khi đổi spec):

```powershell
node scripts/generate-fix-dictionary-from-quickfix-xml.js <quickfixgo>/spec <venue-quickfix-fork>/spec/FIX44.xml src/fix-message-parser/js/dictionary <venue-name>
```

```powershell
# mô tả tag/message/giá trị + ghi chú spec sàn + mã lỗi (cbts.txt = text của PDF, lệnh pypdf ghi ở đầu script)
node scripts/generate-fix-tag-notes-from-orchestra-and-cbts.js <OrchestraFIX44.xml> <cbts.txt> src/fix-message-parser/js/dictionary <venue-name>
```

Nguồn: QuickFIX spec (quickfixgo v0.7.0, QuickFIX License 1.0 — `js/dictionary/quickfix-LICENSE.txt`; *This product includes software developed by quickfixengine.org*),
QuickFIX fork của sàn `spec/FIX44.xml` (HSC), FIX Orchestra `FIX Standard/OrchestraFIX44.xml` ([FIXTradingCommunity/orchestrations](https://github.com/FIXTradingCommunity/orchestrations),
Apache-2.0 — `js/dictionary/fix-orchestra-LICENSE.txt`; nội dung FIX © FIX Protocol Ltd), spec CBTS v1.15 của sàn (PDF nội bộ `C:\_project_git\docs\`).
Build: bỏ trống `-Tool` ⇒ build/kiểm **mọi** tool (tool dùng chung module `src/data-workbench/`). Test: `node --test src/fix-message-parser/tests/*.test.js`.

## 7. Giới hạn hiệu năng

- File ~440 KB (dictionary ~100 KB + mô tả Orchestra ~140 KB + ghi chú spec sàn ~110 KB); dữ liệu giải thích chỉ parse khi cần lần đầu.
- Ghi chú Server Sàn rút tự động từ text PDF: vài chữ còn dính/tách ("trạngthái"), ghi chú tag dài có thể gộp ngắt dòng không đẹp; quy trình (sơ đồ ảnh) không trích được — mẫu dữ liệu dựng tay theo sơ đồ.
- Bảng hiện tối đa **3.000** dòng (lọc để thu hẹp); phân tích toàn bộ input mỗi lần sửa — log vài chục nghìn message vẫn ổn, file hàng trăm MB thì không (không streaming).
- Delimiter là dấu cách ⇒ giá trị có dấu cách (vd `58=Text`) bị tách sai.
- Không kiểm conditional required, không kiểm thứ tự field trong group, không kiểm tag thuộc message nào.
