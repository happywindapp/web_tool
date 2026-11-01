# Tool: Soạn & xem trước sơ đồ (Diagram Editor)

> File: [`tools/diagram-editor.html`](../../tools/diagram-editor.html) — **file sinh ra** từ `src/diagram-editor/`, build
> `pwsh scripts/build-single-file-tool.ps1 -Tool diagram-editor`. Renderer ở [`tools/vendor/`](../../tools/vendor/).
> `tools/mermaid-diagram-editor.html` chỉ còn chuyển hướng, giữ nguyên `?…#…`. Quyết định: ADR #11.
> Luật chung mọi tool: `docs/architecture/`, `docs/security/`, `docs/decisions/`.

## 1. Người dùng & mục đích

Dev/BA/kỹ sư kiến trúc cần vẽ flowchart, UML, ERD, kiến trúc C4… bằng mã để dán vào README/Confluence/slide,
**không muốn dán nội dung nội bộ lên web công cộng**. Một tool, 6 tab, mỗi tab một ngôn ngữ sơ đồ.

| Tab | Renderer | Mạng | Dùng khi |
|-----|----------|------|----------|
| Mermaid | Mermaid 12.2.0 (MIT) | Offline | Sơ đồ trong README, GitHub render sẵn |
| PlantUML | `@plantuml/core` 1.2026.9 (MIT, TeaVM) + Viz.js 3.24 | Offline | UML đầy đủ, C4 qua `!include <C4/...>` |
| draw.io | iframe `embed.diagrams.net` | **Cần mạng** | Kéo thả tự do, trình bày cho người không chuyên |
| DBML | `@dbml/parse` 11.0.0 (Apache-2.0) + Graphviz | Offline | ERD, schema database |
| D2 | `@terrastruct/d2` 0.1.33 (MPL-2.0, WASM) | Offline | Sơ đồ kiến trúc lớn, bố cục đẹp |
| Structurizr | Parser tập con tự viết + Graphviz | Offline | C4: 1 model sinh nhiều view |

## 2. Contract (đổi là breaking)

| Giao diện | Hợp đồng |
|-----------|----------|
| URL `?tab=<id>` | `mermaid plantuml drawio dbml d2 structurizr`. Không có thì mở tab lần trước; có `demo`/`data` mà thiếu `tab` thì là Mermaid (giữ link cũ) |
| URL `?demo=<key>` | Mermaid: `flowchart sequence class state er gantt pie journey git mindmap timeline quadrant xychart sankey block architecture kanban requirement c4 packet radar treemap` · PlantUML: `sequence class usecase activity state component c4 mindmap gantt theme broken` · draw.io: `flow architecture broken` · DBML: `shop groups broken` · D2: `architecture sequence table class grid broken` · Structurizr: `banking auto broken`. Mẫu C4 ở mục 3: Mermaid, PlantUML, draw.io, D2 thêm `c4-<hệ thống>-<cấp>` (`bank securities shop crypto game logistics` × `context container component code`) · DBML thêm `c4-<hệ thống>-code` · Structurizr thêm `c4-<hệ thống>`. Mẫu DDD ở mục 3: Mermaid, PlantUML, draw.io, D2 thêm `ddd-<hệ thống>-<sơ đồ>` (`subdomains context-map aggregates event-flow hexagonal`) · DBML thêm `ddd-<hệ thống>-aggregates` · Structurizr thêm `ddd-<hệ thống>` |
| URL hash `#pako:<b64url>` | `base64url(zlib(JSON))`. Mermaid: `{code, mermaid, autoSync, updateDiagram}`, **cùng định dạng mermaid.live**. Tab khác: `{tab, code, config}`. Payload không có `tab` hợp lệ ⇒ Mermaid. Nhận thêm `#base64:`. Mở xong xoá hash khỏi URL |
| URL `?data=<mã>` | Mã thô (URL-encode) → nạp + vẽ ở tab của `?tab=`; giá trị `pako:`/`base64:` giải như hash. Đi qua query ⇒ có gửi lên server, chỉ cho sơ đồ ngắn, không nhạy cảm. Ưu tiên hash khi có cả hai |
| Input | Gõ/dán · `<input type=file>` · kéo-thả (UTF-8); file có khối mã rào bằng tên ngôn ngữ của tab thì lấy khối đầu |
| Output | `<ten>.mmd/.puml/.drawio/.dbml/.d2/.dsl` · `<ten>.svg` · `<ten>@<N>x.png`; chép PNG / khối Markdown (trừ draw.io) |
| localStorage | Mermaid + cài đặt chung giữ tiền tố cũ `mermaid-editor:` (`draft`, `history`, `saved`, `auto`, `theme`, `tab`) để không mất bài. Tab khác: `diagram-editor:<id>:draft/history/saved`. `web_tool.lang` dùng chung mọi tool |
| Mạng | CSP `default-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; frame-src https://embed.diagrams.net`. Chỉ iframe draw.io ra được ngoài |
| Phím tắt | `Ctrl+Enter` vẽ · `Ctrl+S` tải mã nguồn · `Tab` chèn 4 dấu cách |

## 3. Luật xử lý

- **Engine** (`js/engines/engine-registry.js`): mỗi tab là 1 object `{id, ext, fence, controls, samples, ready(), render(code, cfg, seq)}`. `render` trả `{svg, type, bg, warnings?, pick?}`, lỗi ném `DiagramError {line, syntax, what}`. Thêm tab = thêm 1 engine + mẫu + nút `data-engine`.
- **Nạp thư viện**: `VendorScripts.load` chèn script khi mở tab đầu tiên, nạp hỏng thì khoá editor của tab đó và báo tên file. Mọi bundle là classic script vì `file://` chặn ES module và module worker.
- **Trạng thái**: `#src` + `#cfg` luôn giữ nội dung tab đang mở. Chuyển tab lưu nháp tab cũ rồi nạp nháp tab mới. `config` luôn là chuỗi JSON; dropdown ở toolbar ghi vào đó, riêng Mermaid mới hiện tab "Cấu hình".
- **Bảo mật**: mọi SVG đi qua `SvgSanitizer` (parse trơ, bỏ `script`/`iframe`/`object`…, bỏ `on*`, bỏ URL không phải `#` hoặc `data:image/…`) trước khi vào DOM. Mermaid vẫn ép `securityLevel: "strict"`. DOT sinh từ DBML/Structurizr dùng id tự sinh, escape mọi nhãn, màu qua whitelist.
- **Vẽ**: tự vẽ sau 500 ms ngừng gõ. Kết quả cũ hơn lượt vẽ mới nhất bị bỏ (`renderSeq`). D2 xếp hàng vì worker chỉ giữ 1 promise.
- **Lỗi**: giữ bản vẽ hợp lệ gần nhất (mờ), báo dòng, bấm khung lỗi nhảy tới dòng.
  - Mermaid: map dòng parser về dòng editor (`editorLine`).
  - PlantUML: không gọi `onError` mà trả SVG chữ xanh `#33FF02`, nên đọc lại từ text (`errorOf`).
  - D2: lỗi là mảng JSON `index:<dòng>:<cột>: msg`.
  - DBML: vị trí từ `nodeOrToken.startPos` tính từ 0.
- **Nền**: mỗi engine trả `bg`, chốt theo lần vẽ thành công gần nhất cho preview, SVG, PNG. Khung xem trước luôn sáng, kể cả khi UI tối.
- **PNG**: SVG → `data:` URL (không dùng `blob:`) → canvas, để nhãn `foreignObject` không làm taint canvas.
- **Lịch sử**: tự lưu khi vẽ thành công, tối đa 1 bản/phút, bỏ bản trùng, riêng từng tab; mọi lần thay nội dung đều lưu bản đang sửa trước.

### Mẫu C4 (3 hệ thống microservice)

- 6 hệ thống: Ngân hàng, Chứng khoán, Mua sắm online, Sàn tiền ảo, Game online, Logistics, mỗi hệ thống 4 cấp: L1 Context · L2 Container · L3 Component · L4 Code. Dropdown `Thử mẫu…` gom theo `optgroup`: mẫu là `[nhãn, mã, nhóm]`, phần tử thứ 3 không bắt buộc.
- **Một nguồn dữ liệu:** `samples/c4/c4-model-*.js` là model trung lập, `C4Views` dựng view từng cấp, `c4-to-*.js` sinh mã từng ngôn ngữ, `c4-sample-registry.js` gộp vào mẫu của tab. Sửa nội dung thì sửa model. Thêm hệ thống = thêm 1 model + khai báo ở registry.
- L4 dùng class diagram (Mermaid, PlantUML, D2, draw.io).
- **Structurizr:** 1 workspace, 4 view, chọn ở dropdown view. Structurizr không có cấp Code nên class là `component` trong một container phụ, chỉ hiện ở view `L4-code`.
- **DBML:** chỉ vẽ được ERD nên chỉ có L4, viết tay trong `dbml-c4-erd-samples.js`, không sinh từ model.
- **draw.io:** XML không tự bố trí khi nạp nên `C4ToDrawio` tự xếp tầng: tầng theo độ sâu BFS, mỗi ô đặt gần các ô liên quan, cạnh giữa hai ô không kề nhau cùng hàng võng xuống dưới hàng. Đã đo: longest-path làm số lượt cạnh xuyên ô tăng từ 40 lên 56 trên 54 mẫu nên không dùng. Cạnh dài qua nhiều tầng vẫn có thể đi qua ô khác, kéo tay trong editor nếu cần.
- **Mermaid:** C4 ngắt hàng theo `screen.availWidth`, cạnh không tránh vật cản; sơ đồ L2 sẽ có đường cắt ngang ô. Test headless phải giả lập màn hình đủ rộng, nếu không chỉ ra 2 cột.

### Mẫu DDD (3 hệ thống microservice)

- Cùng 6 hệ thống với mẫu C4, mỗi hệ thống 5 sơ đồ: Subdomain map · Context map · Aggregates · Event storming · Hexagonal. Strategic design là 2 sơ đồ đầu, tactical design là 3 sơ đồ sau. DDD không có bộ sơ đồ chuẩn cố định, 5 loại này do repo chốt.
- `samples/ddd/ddd-model-*.js` là model trung lập, `DddViews` dựng 2 dạng view: box graph (nhóm + ô + cạnh) và nhóm class của aggregate. `ddd-to-*.js` sinh mã từng ngôn ngữ, `ddd-sample-registry.js` gộp vào mẫu của tab. Bố cục draw.io dùng lại `C4ToDrawio.parts`.
- Context map vẽ mũi tên từ upstream sang downstream, pattern (OHS, ACL, Conformist, Customer/Supplier, Published Language) nằm trong nhãn cạnh. Partnership và Shared Kernel đối xứng nên vẽ không mũi tên (`DddViews.isSymmetric`); Structurizr bắt buộc có hướng, chỉ phân biệt qua nhãn.
- Aggregate tham chiếu aggregate khác chỉ qua id; test `an aggregate references another aggregate root only` giữ luật này. Event trong event flow do aggregate root sinh ra phải có trên sơ đồ Aggregates.
- Hexagonal: mọi phụ thuộc hướng vào domain. Mermaid không có mũi tên một chiều ngược nên cạnh `implements` là nét đứt không đầu mũi tên, để adapter nằm dưới port.
- **Structurizr:** chỉ có khái niệm C4, nên mỗi sơ đồ là 1 `softwareSystem` phụ, các ô là `container`, nhãn hiện `[Container: …]`. Nội dung vẫn đúng DDD nhưng từ khoá là C4. Tên container trùng trong event flow được đánh số vì Structurizr không cho trùng.
- **DBML:** chỉ có Aggregates, viết tay trong `dbml-ddd-erd-samples.js`: mỗi aggregate 1 `TableGroup`, không có FK giữa hai aggregate.
- Tên trùng từ khoá ngôn ngữ làm hỏng sinh mã: D2 không nhận `fill` làm tên class kể cả viết hoa; PlantUML không nhận mã hex sau `text:` nên dùng tên màu.

### draw.io

- Tab mở ra là cổng đồng ý, **chưa có request nào**. Bấm "Kết nối draw.io" mới tạo iframe, mỗi lần mở trang phải bấm lại. Mở link chia sẻ hay chọn mẫu không tự kết nối.
- Giao thức `postMessage` JSON (`proto=json`): `init` → gửi `load` kèm `autosave: 1`; nhận `autosave`/`save` ghi XML vào `#src` + nháp; `export` để tải SVG/PNG. Chỉ nhận message từ đúng `contentWindow` + origin `https://embed.diagrams.net`.
- `#src` giữ XML nên lịch sử, bản lưu, link chia sẻ dùng chung logic. Không nạp lại XML trùng để giữ undo của editor. XML hỏng bị chặn tại máy, không gửi vào iframe.
- Sau 30 giây không có `init` thì huỷ iframe, báo lỗi, sơ đồ vẫn còn.
- iframe có `sandbox` (`allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals`), không cho điều hướng trang cha.

### DBML → ERD

`Compiler.interpretFile` ra schema JSON, `DbmlToDot` dựng bảng HTML-like label với port từng cột, cạnh đi từ phía `*` (FK) sang cột được tham chiếu. `TableGroup` thành cluster, enum thành node riêng + cạnh nét đứt. Dropdown: hướng bố trí, chỉ hiện cột khoá.

### Mẫu Database đầy đủ (DBML, 6 hệ thống)

- Nhóm `Database đầy đủ`: `?tab=dbml&demo=db-<system>` với `banking`, `securities`, `shopping`, `crypto`, `game`, `logistics`. Mỗi hệ thống 1 database hơn 30 bảng, viết tay trong `samples/dbml/dbml-schema-*.js`, mỗi miền nghiệp vụ 1 `TableGroup` cùng màu `headercolor`.
- Dropdown xếp theo thứ tự đăng ký vào `DBML_SAMPLES`: nhóm này phải nằm trên C4/DDD, nên ERD C4/DDD để ở `dbml-c4-erd-samples.js`, `dbml-ddd-erd-samples.js` và được `@include` sau `samples/dbml/`, test giữ luật này.
- Khác mẫu C4/DDD: chỉ có ở tab DBML, không sinh từ model. Các file này dài hơn 200 dòng vì là dữ liệu mẫu, không có logic.
- `dbml-full-schema-samples.test.js` compile bằng `@dbml/parse` thật, kiểm mọi bảng thuộc đúng 1 nhóm, FK cùng kiểu với cột đích, không có enum thừa, không có bảng mồ côi (trừ `audit_logs`, `outbox_events`).
- Sơ đồ rất lớn nên `Fit` chỉ còn khoảng 10%, phải zoom/pan hoặc xuất SVG. Cỡ sơ đồ `db-crypto`: `LR` khoảng 1600×6000 · `TB` 7000×1600 · `TB` + chỉ cột khoá 6800×1050. "Chỉ cột khoá" gần như không giảm kích thước ở `LR`.

### Structurizr DSL (tập con)

- **Có**: `workspace` · `model` · `person` · `softwareSystem` · `container` · `component` · `group` · quan hệ `->` kể cả ngầm định và `this` · `tags`, `description`, `technology` · định danh phẳng lẫn `!identifiers hierarchical` · view `systemLandscape`, `systemContext`, `container`, `component` · `include`, `exclude` (`*`, id, `element.tag==X`) · `autoLayout` · `title` · `styles` theo tag (`background`, `color`, `shape`, `dashed`).
- **Không**: `!include`, `!docs`, script, plugin, `workspace extends`, deployment, dynamic/filtered view, theme ngoài. Gặp thì cảnh báo + bỏ qua, không dừng vẽ.
- Không khai báo `views` ⇒ tự sinh landscape, context, container. Quan hệ được nâng lên tổ tiên đang hiển thị. Nhiều view ⇒ dropdown chọn view, lựa chọn nằm trong `config.view`.

## 4. Module (`src/diagram-editor/js/`)

`core/`: `VendorScripts` + `DiagramError` · `EngineStore` · `SvgSanitizer` · `Exporter` · `Highlight` · `PanZoom` · `VersionHistory`.
`engines/`: 1 file mỗi engine + `graphviz-renderer` · `dbml-schema-to-dot` · `structurizr-dsl-parser` · `structurizr-view-to-dot`.
`samples/`: mẫu từng tab (nội dung English), `samples/c4/`, `samples/ddd/`: model + builder mẫu C4, DDD, `samples/dbml/`: database đầy đủ. `i18n/`: từ điển EN.
`ui/`: `editor-surface` · `engine-session` · `render-pipeline` · `drawio-tab` · `share-links` · `history-dialog` · `action-wiring` · `boot`.
Module chung `@include` từ `src/data-workbench/`: `I18n`, `ShareCodec`, `ThemePicker`, `SavedSessions`, CSS nền + hai tầng màu.

## 5. Giới hạn đã biết

- draw.io là ngoại lệ của cam kết "không gọi mạng"; không dùng cho sơ đồ nội bộ. Chrome headless với User-Agent mặc định bị server trả 403, đặt User-Agent Chrome thường thì kết nối được.
- PlantUML: `!include` file/URL bị từ chối, stdlib chỉ có `<C4/…>`; muốn thêm thì chép `<lib>.min.js` vào `tools/vendor/plantuml-<ver>/`.
- D2: không có layout TALA (bản quyền riêng). Không có timeout nếu worker treo.
- DBML: chỉ ERD, không sinh SQL (`@dbml/core` nặng 36 MB).
- Mermaid: parser **sankey** 12.2 không nhận chữ có dấu. Icon `fa:fa-*`, ảnh `http(s)` trong mọi tab bị CSP/sanitizer chặn có chủ đích.
- Tô màu là xấp xỉ, không phải grammar; > 200 KB thì tắt tô màu.
- Link mở bằng `file://` chỉ dùng trên cùng máy; dùng bản GitHub Pages để gửi người khác.
- Clipboard cần secure context; lỗi được báo ra UI.

## 6. Nâng cấp renderer

Sửa version ở đầu `scripts/vendor-diagram-renderers.ps1`, chạy script, cập nhật đường dẫn trong `src/diagram-editor/js/core/vendor-script-loader.js`, xoá bản cũ, build, chạy lại mọi `?demo=`.
Script dừng ngay nếu bản mới đổi đoạn code cần vá. Mermaid vẫn tải tay: `npm pack mermaid@<ver>` → `package/dist/mermaid.min.js` → `tools/vendor/mermaid-<ver>.min.js`.

## Điện thoại

Dưới 640px: 2 pane `Mã | Xem trước` (ADR #12); chọn mẫu, mở link, mở file hoặc bấm Vẽ thì sang Xem trước, bấm dòng lỗi thì về Mã. Xem trước: một ngón kéo, hai ngón pinch-zoom (`PanZoom`). Nút toàn màn hình tự ẩn nếu trình duyệt không hỗ trợ (iPhone).
