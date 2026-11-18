# Phase 1 — Workbench: editor, split view, explorer, kéo-thả, nhận diện ngôn ngữ

## Context Links
- [plan.md](plan.md) · `docs/architecture/README.md` mục 3 (checklist song ngữ, mẫu, link chia sẻ, hai tầng màu, Desktop+Mobile, tác giả, GoatCounter)
- Khuôn tool build: `src/diagram-editor/`, `src/crypto-market-board/` · nhận diện định dạng có sẵn: `src/data-workbench/js/parsers/format-detect.js`

## Overview
- Priority: P0 · Status: ⬜ · Cỡ: L
- Khung workbench + editor dùng hằng ngày.

## Key Insights
- Command Palette, phím tắt, menu chạm, macro dùng chung `CommandRegistry` (id, nhãn VI/EN, phím, hàm).
- Split view = cây layout (`row`/`col` chứa các "editor group"); mỗi group có tab riêng, cùng 1 tài liệu mở ở 2 group dùng chung `Text` CM6 ⇒ sửa bên này thấy ngay bên kia.
- Nhận diện ngôn ngữ theo thứ tự tin cậy: đuôi file → shebang/modeline (`#!/usr/bin/env python`, `-*- mode -*-`) → nội dung (tái dùng `format-detect` cho JSON/XML/HTML/CSV/YAML, thêm heuristic điểm cho SQL, Go, Python, Java, C#, Shell, Mermaid, PlantUML, D2, DBML, Markdown) — luôn cho user đổi tay.
- Mobile không có phím tắt ⇒ mọi lệnh tới được qua Command Palette (nút `⌘`).

## Requirements
**Layout & header/toolbar**
- Header teal: Trang chủ, tên tool, `🔗 Chia sẻ link`, Giao diện, `VI | EN`, `⋯`. Toolbar tint: Mở file · Mở folder · Mới · Lưu · `Thử mẫu…` · Tìm · Lệnh `⌘` · Layout · ngôn ngữ · wrap.
- Activity bar (Explorer · Search · Cloud) + sidebar ẩn/hiện (`Ctrl+B`); status bar (Ln/Col, số vùng chọn, dòng/từ/ký tự, ngôn ngữ, encoding, EOL, indent, nguồn file).

**Split view (Sublime `Alt+Shift+1/2/3/5/8`)**
- **Mặc định khi mở: Explorer | View 1 | View 2** (như Notepad++ 2 view); `OutputLink` (nguồn tab ⇒ tab output ở view kia, xem plan.md "Mô hình UI") dựng ở phase này để phase 2/3/7 cắm vào.
- Layout 1 · 2 cột · 3 cột · 2 hàng · lưới 2×2; kéo vạch chia đổi tỉ lệ; kéo tab sang group khác; `Ctrl+1..4` nhảy group; mở cùng file ở 2 group (clone view).

**Explorer**
- Cây folder local (File System Access), mục "Ghi chú" (IndexedDB), "Đang mở", "Gần đây"; tạo/đổi tên/xoá file & folder; lọc theo tên; icon theo loại file; menu thao tác có nút `⋯` (không chỉ chuột phải).

**Kéo-thả**
- Thả vào View 1 hay View 2 ⇒ mở tab ở đúng view đó. Thả file (nhiều) ⇒ mở tab + Explorer hiện file + nút "📂 Mở folder chứa file" (`showDirectoryPicker({ startIn: fileHandle })`); thả folder ⇒ mở cây (Chrome/Edge `getAsFileSystemHandle`, nơi khác đọc `webkitGetAsEntry` chỉ đọc); thả text ⇒ chèn; overlay báo vùng thả; file nhị phân ⇒ hỏi trước, mở hex/xem chỉ đọc.

**Editor (VS Code / Sublime)**
- Tab: đổi tên double-click, ● chưa lưu, nhớ cursor/scroll/fold, ghim tab, đóng khác/bên phải, mở lại tab vừa đóng `Ctrl+Shift+T`.
- Multi-cursor `Ctrl+D`/`Ctrl+Shift+L`/`Alt+click`, highlight mọi chỗ trùng từ, bracket match + auto-close, fold/unfold, indent guide, minimap (bật/tắt), zoom chữ `Ctrl+=/-`, chế độ Zen.
- Go to line `Ctrl+G`, go to symbol `Ctrl+R` (từ syntax tree CM6), Quick Open `Ctrl+P` (fuzzy tên tab/file/note), Command Palette `Ctrl+Shift+P`, bookmark Notepad++ (`Ctrl+F2`, `F2`).
- Find/replace regex, case, whole word, trong vùng chọn, replace all.

**Lưu & phiên**
- Notes autosave IndexedDB (debounce); "hot exit" kiểu Notepad++: đóng tab/trình duyệt không mất bản chưa lưu, mở lại khôi phục layout + tab.
- File local: lưu đè (FS Access) hoặc tải xuống (fallback).

**Bắt buộc repo**
- Demo `?demo=`: `js`, `json-broken`, `multi-tab`, `split-2x2`, `markdown`, `large` (sinh 50k dòng). Link chia sẻ: tab đang mở (tên, ngôn ngữ, nội dung, tuỳ chọn) — không mang file ID/token. VI/EN. Desktop + Mobile 4 dải (phone: 2 pane Sidebar | Editor; split view tự gộp về 1 group, chọn group bằng `.pane-switch`).

## Architecture
```
src/one-editor/
  one-editor.template.html
  styles/ workbench-layout.css, split-view.css, editor-theme.css
  js/core/      command-registry.js, keymap-sublime-vscode.js, demo-samples.js, share-link-state.js, app-boot.js
  js/workbench/ activity-bar.js, explorer-tree.js, file-drop-zone.js, tab-strip.js, split-layout-tree.js,
                status-bar.js, command-palette.js, quick-open.js, bookmarks.js
  js/editor/    codemirror-setup.js, language-detect.js, language-loader.js, editor-session-state.js
  js/providers/ storage-provider-contract.js, notes-indexeddb-provider.js, local-file-system-access-provider.js
  tests/        pure-modules.test.js
```

## Related Code Files
- Tạo: `src/one-editor/` (trên), `tools/one-editor.html` (sinh ra).
- Dùng lại (không sửa): data-workbench core + `format-detect.js`.

## Implementation Steps
1. Template + CSS hai tầng màu, `@include` core.
2. `CommandRegistry` + keymap; CM6 setup + nạp ngôn ngữ lười.
3. `language-detect` (thuần, test bảng mẫu nhiều ngôn ngữ).
4. Tab strip + split layout tree + clone view.
5. Notes provider + local FS provider + explorer + kéo-thả.
6. Palette, Quick Open, Go to line/symbol, bookmark, find/replace.
7. Hot exit, status bar, demo, share link, I18n, phone layout.
8. Test node module thuần (registry, fuzzy, language-detect, layout tree, share state).

## Todo List
- [ ] Template + màu + core include
- [ ] CommandRegistry + keymap + CM6
- [ ] language-detect + test
- [ ] Tab + split view + clone
- [ ] Notes IndexedDB + local FS + explorer + kéo-thả
- [ ] Palette, Quick Open, Go to, bookmark, find/replace
- [ ] Hot exit + status bar
- [ ] Demo + share link + VI/EN + mobile
- [ ] Test node

## Success Criteria
- Nhận diện đúng ≥ 90% bộ mẫu test (có đuôi file 100%); split 2×2 kéo tab qua lại được; F5 khôi phục đúng layout + tab chưa lưu.
- Đạt checklist mục 3.

## Risk Assessment
- IndexedDB bị chặn ⇒ chạy không lưu, báo trên status bar.
- `FileSystemHandle` mất quyền sau reload ⇒ `requestPermission` khi user bấm.
- Heuristic nhầm ngôn ngữ ngắn ⇒ chỉ đổi khi điểm vượt ngưỡng, còn lại giữ Plain Text.

## Security Considerations
- Payload link chia sẻ là dữ liệu không tin cậy: chỉ gán field đã biết, kiểm kiểu.

## Next Steps
- Phase 2–5 song song (dựa `CommandRegistry` + `StorageProvider`).
