# Plan — One Editor (`tools/one-editor.html`)

Trình soạn code + text chạy trên trình duyệt, gộp VS Code · Sublime Text · Notepad++ · online notepad, preview sơ đồ/chart cạnh code, mở/lưu file Google Drive + OneDrive.
Tham chiếu: [research Digital ToolPad](../reports/research-261118-0209-digital-toolpad-notepad-plus-plus-online.md) · [tool tham khảo khác (C1/C2/C3)](../reports/research-261118-0312-reference-tools-feature-survey.md).
Thứ tự đề xuất: **v1 = 0 → 1 → 2 → 3 → 6**, rồi 7 → 8 → 9; 4–5 khi có client ID.

## Quyết định đã chốt (user, 2026-11-18)
- Engine **CodeMirror 6** (mobile tốt, nhẹ, chạy `file://`) — không Monaco.
- Google Drive scope **`drive.file` + Google Picker**.
- OneDrive: **v1 chỉ tài khoản cá nhân**; M365 công ty để backlog (chờ IT HSC admin consent).
- Google Cloud project + Entra App Registration **đăng ký bằng tài khoản cá nhân**.
- Tên **One Editor**, file `tools/one-editor.html`, code `src/one-editor/`.
- Cloud **online tối thiểu, opt-in**: SDK chỉ tải khi bấm "Kết nối"; phần còn lại chạy offline.
- Chart dữ liệu **chỉ bằng Mermaid** (`pie`, `xychart-beta`, `sankey`, `gantt`…), không làm "CSV/JSON → chart".
- Format 3 tầng: (1) JSON/XML tolerant có sẵn + `sql-formatter` (T-SQL mặc định) + FIX message tự viết; (2) **Prettier** (vendor, plugin nạp lười) cho JS/TS/JSX/CSS/SCSS/LESS/HTML/Markdown/YAML/GraphQL — không dùng js-beautify trong One Editor; (3) ngôn ngữ còn lại chỉ re-indent (`indentRange` CM6) + trim cuối dòng.

## Mô hình UI (user chốt 2026-11-18)
- Mặc định 3 phần như Notepad++ 2 view: **Explorer | View 1 (tab) | View 2 (tab)**; phone = 3 trang carousel.
- **Chạy ở view nào ⇒ kết quả ở view kia** (cả 2 chiều), qua **tab output liên kết** (vd `app.json ⇢ YAML`): chạy lại cập nhật đúng tab đó, preview tự cập nhật khi gõ, không bao giờ đè tab file của user. Áp cho Preview · Format · Chuyển đổi · Dịch; nút ⇆ đảo hướng.
- Kéo **folder** vào ⇒ Explorer hiện cây ngay; kéo **file** ⇒ mở tab + nút "📂 Mở folder chứa file" (`showDirectoryPicker({ startIn: fileHandle })`, Chrome/Edge) — trình duyệt không lộ đường dẫn folder của file kéo vào.
- Chuyển đổi = dữ liệu (JSON⇄YAML⇄XML⇄CSV, HTML⇄Markdown — HTML→MD bằng `turndown` + `turndown-plugin-gfm` inline) + sinh kiểu từ JSON (Go struct, Java class, C# class, TypeScript interface, C++ struct). Không đổi code giữa ngôn ngữ (cần AI).
- Dịch: Translator API on-device của Chrome/Edge trước; không có thì hỏi rồi mới gửi MyMemory; từ điển + IPA tiếng Anh từ dictionaryapi.dev; đọc to bằng `speechSynthesis` (offline).
- draw.io preview: nhúng `embed.diagrams.net` opt-in mỗi lần mở trang (như Diagram Editor, ADR #11).

## Tính năng bắt buộc (user nhấn mạnh)
| Tính năng | Phase |
|---|---|
| Split view kiểu Sublime (1/2/3 cột, 2 hàng, lưới 2×2) | 1 |
| Explorer (cây folder, note, file gần đây, cloud) | 1 |
| Kéo-thả file/folder vào | 1 |
| Tự nhận diện ngôn ngữ (đuôi file → shebang/modeline → nội dung) | 1 |
| Compare 2 file ở 2 view | 2 |
| Format text/code tự động (1 click, tuỳ chọn format khi lưu/dán) | 2 |
| Code trái — sơ đồ/chart phải, giống `diagram-editor.html` | 3 |
| Tiện ích khác của Notepad++ / VS Code / Sublime (xem từng phase) | 1–3 |
| Log + FIX, cây/JSONPath/XPath/lint/Rainbow CSV, JWT/UUID/epoch/lịch sử cục bộ, Outline/Goto Anything/Vim/sessions/Emmet/link mật khẩu | 8 |
| Không làm: Terminal, Git, debugger, marketplace, LSP đầy đủ, chạy Python/Java, clipboard hệ thống, so sánh folder | — |

## Kiến trúc
- `src/one-editor/` → `pwsh scripts/build-single-file-tool.ps1 -Tool one-editor` (ADR #7).
- `@include` data-workbench: I18n, ShareCodec, ThemePicker, PhoneLayout, CSS chung, `format-detect`, parser JSON/XML tolerant, js-beautify, js-yaml, Myers diff.
- `@include` diagram-editor: `engine-registry` + engines, `vendor-script-loader`, `preview-pan-zoom`, `svg-output-sanitizer`, `svg-png-exporter`; renderer dùng lại `tools/vendor/` có sẵn.
- CodeMirror 6 bundle bằng `esbuild` → `tools/vendor/codemirror-<ver>.min.js` (ADR #5); ngôn ngữ nạp lười.
- `CommandRegistry` chung cho Palette, phím tắt, menu chạm, macro.
- `StorageProvider` (`list/open/save/stat` + `version`/`eTag`): notes IndexedDB · local FS · Google Drive · OneDrive. Lưu cloud kiểm phiên bản (Optimistic concurrency) ⇒ lệch thì mở diff.

## Phase
| # | Việc | Cỡ | Trạng thái |
|---|------|----|-----------|
| 0 | [Spike + ADR + đăng ký OAuth](phase-00-spike-and-adr.md) | S | ✅ (đăng ký OAuth hoãn cùng phase 4–5) |
| 1 | [Workbench: editor, split, explorer, kéo-thả, nhận diện ngôn ngữ](phase-01-core-editor-workbench.md) | L | 🟡 1a ✅ (2026-11-18), 1b ⬜ |
| 2 | [Bộ Notepad++ + compare 2 view + format tự động](phase-02-notepadpp-text-tools.md) | M–L | ⬜ |
| 3 | [Live preview: sơ đồ/chart, Markdown, HTML](phase-03-live-preview-diagram-chart.md) | M | ⬜ |
| 4 | [Google Drive provider](phase-04-google-drive-provider.md) | M | ⏸ hoãn (user 2026-11-18) |
| 5 | [OneDrive cá nhân](phase-05-onedrive-personal-provider.md) | M | ⏸ hoãn (user 2026-11-18) |
| 6 | [Hoàn thiện, docs, phát hành](phase-06-polish-docs-and-release.md) | M | ⬜ |
| 7 | [Dịch + đọc to + từ điển](phase-07-translate-speech-dictionary.md) | M | ⬜ |
| 8 | [Mở rộng: Log + FIX · Dữ liệu · Công cụ dev · Thao tác editor](phase-08-power-features-log-data-devtools.md) | L | ⬜ |
| 9 | [Từ tool tham khảo: recipe CyberChef, regex tester, chạy HTML/JS, cron, SQL từ dữ liệu, batch replace, Unicode, bảng MD, code → ảnh](phase-09-reference-tool-extras.md) | M–L | ⬜ làm toàn bộ C1 |

Phụ thuộc: 0 → 1 → (2 ∥ 3 ∥ 7 ∥ 8) → 6 = **v1** (offline mặc định; dịch MyMemory + draw.io chỉ khi user bấm). Phase 4–5 hoãn tới khi user đăng ký Google Cloud + Entra; v1 không hiện mục Cloud, `StorageProvider` vẫn giữ (notes + local FS) để cắm cloud sau không phải sửa editor.

## Hiệu năng
- Nạp lười mọi thứ ngoài lõi; ngân sách cụ thể ở [phase 6](phase-06-polish-docs-and-release.md#ngân-sách-hiệu-năng-performance-budget--kiểm-headless-trước-khi-báo-xong). Tách gói ngôn ngữ thành "phổ biến" (JS/TS/JSON/HTML/CSS/MD/SQL/YAML/XML) + "còn lại" nếu đo thấy chậm ở phase 1.

## Trùng với Data Workbench đợt 2
- Sprint còn mục "Data Workbench đợt 2" (JWT/hash, format SQL, JSON → Go/TS/C#, JSONPath/XPath) trùng phase 2/8 ⇒ viết các module thuần đó ở `src/data-workbench/js/` (hoặc thư mục dùng chung) để cả 2 tool `@include`, không viết 2 lần (DRY).

## Rủi ro chính
- OAuth không chạy trên `file://` ⇒ cloud chỉ trên GitHub Pages/localhost, UI báo rõ.
- D2 cần `'unsafe-eval'` (ADR #11) — không được để chung trang với token ⇒ preview chạy trong file riêng `tools/one-editor-preview-sandbox.html` qua iframe sandbox (ADR #21; `srcdoc` không dùng được vì kế thừa CSP cha).
- Token trong trang ⇒ CSP chặt, token chỉ trong bộ nhớ, preview Markdown/HTML không chạm DOM trang chính.
- Tài khoản Microsoft cá nhân có thể phải có tenant (Azure free) mới tạo được App Registration — kiểm ở phase 0.

## Câu hỏi chưa giải
- (không còn — mọi quyết định đã chốt 2026-11-18; **vẫn đang plan, chưa code tool**)
