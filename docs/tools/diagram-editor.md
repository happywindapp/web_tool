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
| URL `?demo=<key>` | Mermaid: `flowchart sequence class state er gantt pie journey git mindmap timeline quadrant xychart sankey block architecture kanban requirement c4 packet radar treemap` · PlantUML: `sequence class usecase activity state component c4 mindmap gantt theme broken` · draw.io: `flow architecture broken` · DBML: `shop groups broken` · D2: `architecture sequence table class grid broken` · Structurizr: `banking auto broken` |
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

### draw.io

- Tab mở ra là cổng đồng ý, **chưa có request nào**. Bấm "Kết nối draw.io" mới tạo iframe, mỗi lần mở trang phải bấm lại. Mở link chia sẻ hay chọn mẫu không tự kết nối.
- Giao thức `postMessage` JSON (`proto=json`): `init` → gửi `load` kèm `autosave: 1`; nhận `autosave`/`save` ghi XML vào `#src` + nháp; `export` để tải SVG/PNG. Chỉ nhận message từ đúng `contentWindow` + origin `https://embed.diagrams.net`.
- `#src` giữ XML nên lịch sử, bản lưu, link chia sẻ dùng chung logic. Không nạp lại XML trùng để giữ undo của editor. XML hỏng bị chặn tại máy, không gửi vào iframe.
- Sau 30 giây không có `init` thì huỷ iframe, báo lỗi, sơ đồ vẫn còn.
- iframe có `sandbox` (`allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals`), không cho điều hướng trang cha.

### DBML → ERD

`Compiler.interpretFile` ra schema JSON, `DbmlToDot` dựng bảng HTML-like label với port từng cột, cạnh đi từ phía `*` (FK) sang cột được tham chiếu. `TableGroup` thành cluster, enum thành node riêng + cạnh nét đứt. Dropdown: hướng bố trí, chỉ hiện cột khoá.

### Structurizr DSL (tập con)

- **Có**: `workspace` · `model` · `person` · `softwareSystem` · `container` · `component` · `group` · quan hệ `->` kể cả ngầm định và `this` · `tags`, `description`, `technology` · định danh phẳng lẫn `!identifiers hierarchical` · view `systemLandscape`, `systemContext`, `container`, `component` · `include`, `exclude` (`*`, id, `element.tag==X`) · `autoLayout` · `title` · `styles` theo tag (`background`, `color`, `shape`, `dashed`).
- **Không**: `!include`, `!docs`, script, plugin, `workspace extends`, deployment, dynamic/filtered view, theme ngoài. Gặp thì cảnh báo + bỏ qua, không dừng vẽ.
- Không khai báo `views` ⇒ tự sinh landscape, context, container. Quan hệ được nâng lên tổ tiên đang hiển thị. Nhiều view ⇒ dropdown chọn view, lựa chọn nằm trong `config.view`.

## 4. Module (`src/diagram-editor/js/`)

`core/`: `VendorScripts` + `DiagramError` · `EngineStore` · `SvgSanitizer` · `Exporter` · `Highlight` · `PanZoom` · `VersionHistory`.
`engines/`: 1 file mỗi engine + `graphviz-renderer` · `dbml-schema-to-dot` · `structurizr-dsl-parser` · `structurizr-view-to-dot`.
`samples/`: mẫu từng tab (nội dung English). `i18n/`: từ điển EN.
`ui/`: `editor-surface` · `engine-session` · `render-pipeline` · `drawio-tab` · `share-links` · `history-dialog` · `action-wiring` · `boot`.
Module chung `@include` từ `src/data-workbench/`: `I18n`, `ShareCodec`, `ThemePicker`, `SavedSessions`, CSS nền + hai tầng màu.

## 5. Giới hạn đã biết

- draw.io là ngoại lệ của cam kết "không gọi mạng"; không dùng cho sơ đồ nội bộ. Chrome headless bị server trả 403.
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
