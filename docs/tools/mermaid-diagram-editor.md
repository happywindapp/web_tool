# Tool: Soạn & xem trước sơ đồ Mermaid

> File: [`tools/mermaid-diagram-editor.html`](../../tools/mermaid-diagram-editor.html) + thư viện
> [`tools/vendor/mermaid-12.2.0.min.js`](../../tools/vendor/) (MIT, `mermaid-LICENSE.txt` đi kèm).
> Luật chung mọi tool: `docs/architecture/`, `docs/security/`, `docs/decisions/`.

## 1. Người dùng & mục đích

Dev/BA cần vẽ nhanh flowchart, sequence, ER… bằng mã Mermaid để dán vào README/Confluence/slide,
**không muốn dán nội dung nội bộ lên web công cộng**. Tool giống mermaid.live nhưng chạy offline, không request nào.

## 2. Review công cụ tham khảo (2026-10)

| Công cụ | Điểm mạnh | Hạn chế với nhu cầu nội bộ |
|---------|-----------|----------------------------|
| **mermaid.live** (official, OSS) | Monaco editor, live preview, tab Config JSON, sample, history, pan-zoom, xuất PNG/SVG, link `#pako:` | Online; link PNG/SVG qua `mermaid.ink`, link Kroki → **gửi sơ đồ ra server ngoài**; có thể bật analytics |
| **Mermaid Chart** (SaaS thương mại của team Mermaid) | Visual editor kéo-thả, AI sinh sơ đồ, cộng tác, plugin VS Code/Confluence | Cần tài khoản, dữ liệu lưu cloud, tính phí bản team |
| **mermaid-cli (`mmdc`)** | Render CLI/CI ra PNG/SVG/PDF | Không có live preview, cần Node + Puppeteer |
| **Kroki / mermaid.ink** | Render qua URL/API, nhúng ảnh vào docs | Server render → sơ đồ rời máy (trừ khi tự host) |
| **draw.io, Excalidraw** | Nhập Mermaid rồi sửa tay thành hình tự do | Chuyển sang định dạng riêng, mất mã nguồn Mermaid |
| **VS Code / GitHub / GitLab / Obsidian** | Render Mermaid trong Markdown sẵn | Không có công cụ xuất ảnh, theme, chia sẻ nhanh |

**Tool này lấy**: trải nghiệm editor + preview + config + history + share link của mermaid.live.
**Cố ý bỏ**: render qua server (mermaid.ink/Kroki), AI, cộng tác realtime, Monaco (nặng; thay bằng textarea + overlay tô màu), Gist loader.

## 3. Contract (đổi là breaking)

| Giao diện | Hợp đồng |
|-----------|----------|
| URL query `?demo=<key>` | Nạp sơ đồ mẫu (`flowchart sequence class state er gantt pie journey git mindmap timeline quadrant xychart sankey block architecture kanban requirement c4 packet radar treemap`) rồi vẽ |
| URL hash `#pako:<b64url>` | `base64url(zlib(JSON {code, mermaid, autoSync, updateDiagram}))`, `mermaid` = chuỗi JSON cấu hình. **Cùng định dạng mermaid.live** → link 2 chiều dùng được. Nhận thêm `#base64:` (định dạng cũ). Mở xong thì xoá hash khỏi URL |
| Input | Gõ/dán · `<input type=file>` · kéo-thả (`.mmd .mermaid .md .txt`, UTF-8); file có khối ` ```mermaid ` → lấy khối đầu |
| Output | `<ten>.mmd` · `<ten>.svg` · `<ten>@<N>x.png`; chép PNG / khối Markdown vào clipboard |
| localStorage | Khoá `mermaid-editor:draft` `{code, config}` · `mermaid-editor:history` `[{t, code, config}]` (≤ 30) · `mermaid-editor:auto` |
| Mạng | **Không request nào, cưỡng chế bằng CSP** `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:` — chặn cả beacon trong link độc hại (`<img src=http…>` trong nhãn, `img:` của shape, `url()` trong `themeCSS`) mà `securityLevel: strict` không chặn. Đã kiểm: server cục bộ nhận 0 request |
| Phím tắt | `Ctrl+Enter` vẽ · `Ctrl+S` tải `.mmd` · `Tab` chèn 4 dấu cách |

## 4. Luật xử lý

- **Cấu hình**: tab "Cấu hình" (JSON) là nguồn duy nhất; dropdown Theme/Kiểu nét chỉ ghi `theme`/`look` vào JSON.
  Theme: `default neutral dark forest base neo neo-dark redux redux-dark redux-color redux-dark-color`; look: `classic handDrawn neo`.
- **Bảo mật**: luôn ép `securityLevel: "strict"` sau khi merge config người dùng → link chia sẻ không bật được click/script trong nhãn.
- **Vẽ**: `mermaid.render` (trả cả `diagramType`). Tự vẽ sau 500 ms ngừng gõ (tắt được). Kết quả cũ hơn lượt vẽ mới nhất bị bỏ (`renderSeq`).
- **Lỗi**: giữ bản vẽ hợp lệ gần nhất (mờ). Chỉ gọi "Lỗi cú pháp" khi message là lỗi parser, còn lại "Lỗi khi vẽ".
  Dòng `N` của parser được map về dòng editor (`editorLine`): Mermaid cắt front-matter, dòng `%% …`, dòng trống/directive đầu trước khi parse;
  lỗi EOF rơi vào dòng trống cuối → lùi về dòng có nội dung. Bấm khung lỗi → nhảy dòng.
- **Nền**: `themeVariables.background` nếu có, theme có `dark` → `#333333`, còn lại trắng; chốt theo lần vẽ thành công gần nhất (`lastBg`) cho preview, SVG, PNG.
- **PNG**: SVG → `data:` URL (không dùng `blob:`) → canvas → `toBlob`; nhãn HTML (`foreignObject`) xuất được, canvas không bị taint (Chrome).
- **Lịch sử**: tự lưu khi vẽ thành công, tối đa 1 bản/phút, bỏ bản trùng; mọi lần thay nội dung (mẫu, file, link, khôi phục) đều lưu bản đang sửa trước.
  Khoá phiên bản là timestamp `t` (không dùng index). Đầy quota → cắt dần còn 15, 7… bản; nháp lưu thất bại thì báo lên UI. `?demo` bị xoá khỏi URL sau khi nạp để F5 không đè nháp.
- **Thiếu `vendor/`**: vẫn hiện nháp nhưng khoá editor (read-only) để không ghi đè nháp cũ.

## 5. Module (IIFE trong 1 `<script>`)

`Store` (localStorage có try/catch) · `ShareLink` (`CompressionStream("deflate")` = zlib như `pako.deflate`) ·
`Highlight` (tô màu xấp xỉ bằng regex: comment, chuỗi, mũi tên, từ khoá) · `PanZoom` (transform chỉ trên `#stage`) ·
`Exporter` (SVG/PNG) · `History` · UI wiring + `SAMPLES`.

## 6. Giới hạn đã biết

- Parser **sankey** của Mermaid 12.2 không nhận chữ có dấu (kể cả trong nháy kép) → mẫu viết không dấu.
- Các loại mới của v12 (venn, ishikawa, wardley, swimlanes, usecase, railroad, ebnf/abnf/peg, cynefin) vẫn render được nhưng chưa có mẫu.
- Icon `fa:fa-*` (Font Awesome), icon pack ngoài của architecture, ảnh `http(s)` trong nhãn/shape `img:` và `url()` trong CSS
  **bị CSP chặn có chủ đích** (ADR #2). Ảnh `data:` vẫn dùng được.
- Tô màu là xấp xỉ, không phải grammar; > 200 KB thì tắt tô màu.
- Link chia sẻ mở bằng `file://` chỉ dùng trên cùng máy; dùng bản GitHub Pages để gửi người khác.
- Clipboard cần secure context (`file://`, `https://`, `localhost`) — lỗi được báo ra UI, không im lặng.

## 7. Nâng cấp Mermaid

`npm pack mermaid@<ver>` → lấy `package/dist/mermaid.min.js` → `tools/vendor/mermaid-<ver>.min.js`, đổi `<script src>`
và thông báo lỗi nạp thư viện trong tool, xoá file bản cũ, chạy lại toàn bộ `?demo=` (đặc biệt sankey, architecture, theme mới).
