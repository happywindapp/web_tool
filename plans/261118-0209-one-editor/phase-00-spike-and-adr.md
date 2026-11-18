# Phase 0 — Spike + ADR + đăng ký OAuth

## Context Links
- [plan.md](plan.md) · `docs/decisions/README.md` (ADR #2, #5, #6, #7, #12) · `scripts/vendor-diagram-renderers.ps1` (khuôn script vendor)

## Overview
- Priority: P0 · Status: 🟡 xong phần kỹ thuật, chờ user đăng ký OAuth · Cỡ: S
- Gỡ các ẩn số kỹ thuật trước khi viết UI; chốt ADR cho ngoại lệ mạng + IndexedDB.

## Key Insights
- CodeMirror 6 chỉ phát hành ES module ⇒ phải bundle 1 lần (esbuild) thành IIFE gán `window.CM`.
- `file://` chạy CM6 được (không cần Worker), nhưng OAuth bắt buộc origin http(s).
- ADR #6 mới cho phép `localStorage`; IndexedDB (dung lượng lớn, lưu được `FileSystemHandle`) cần ghi ADR.

## Requirements
- Bundle CM6: `@codemirror/{state,view,commands,search,language,autocomplete,lint,merge}`, `@codemirror/language-data` (nạp lười), theme sáng/tối.
- Đo: kích thước bundle; mở file 1/10/50 MB (thời gian, RAM, cuộn) trên desktop + điện thoại thật/headless; gõ, chọn, multi-cursor trên touch.
- Ngưỡng "chế độ file lớn" rút từ số đo.
- Thử iframe `sandbox="allow-scripts"` (không `allow-same-origin`) nạp `tools/vendor/*` + chạy Mermaid/D2 trên GitHub Pages và `file://` (phase 3 phụ thuộc kết quả).

## Architecture
- `scripts/vendor-one-editor-libraries.ps1`: thư mục tạm → `npm i` phiên bản ghim (bản phát hành ≥ 2 tuần) → esbuild IIFE: `codemirror-core.js` (`globalThis.CM`) + `codemirror-languages.js` (`@codemirror/language-data`, import core qua shim để dùng chung instance `@codemirror/*` + `@lezer/*`); chép Prettier 3.9.10 (`standalone.js` + `plugins/*.js`) và `sql-formatter` 15.9.0; kèm LICENSE.
- ADR #19 **Cloud opt-in cho One Editor**: Google (GIS + Picker, tải script từ Google — ngoại lệ ADR #5), Microsoft Graph + MSAL (vendor); CSP `script-src`/`connect-src`/`frame-src` liệt kê đủ; token chỉ trong bộ nhớ.
- ADR #20 **IndexedDB cho One Editor**: note/tab/handle; mọi truy cập bọc try/catch, có nút xoá dữ liệu, UI ghi rõ nơi lưu.

## Related Code Files
- Tạo: `scripts/vendor-codemirror-bundle.ps1`, `tools/vendor/codemirror-*.min.js`, spike HTML trong scratchpad (không commit).
- Sửa: `docs/decisions/README.md` (ADR #19, #20).

## Implementation Steps
1. Viết script vendor, ghim phiên bản CM6, chạy, kiểm bundle chạy trên `file://`.
2. Spike page: editor + nạp file lớn sinh sẵn; đo bằng headless (puppeteer, xem memory `headless-verify-diagram-editor`) desktop + mobile.
3. Chốt ngưỡng file lớn + có tách bundle ngôn ngữ hay không (> ~300 KB ⇒ tách).
4. Viết ADR #19, #20.
5. User đăng ký (hướng dẫn ở dưới); dán client ID/API key công khai vào config của tool.

## Hướng dẫn đăng ký (user tự làm — tài khoản cá nhân, user chốt 2026-11-18)
- Google Cloud Console (Gmail cá nhân): bật Drive API + Picker API; OAuth consent screen External, scope `drive.file`, chuyển "In production" để không giới hạn test user (kiểm lại `drive.file` không cần verify); OAuth Client "Web application", Authorized JS origins `https://happywindapp.github.io`, `http://localhost:<port>`; API key giới hạn HTTP referrer + chỉ Picker API; ghi project number (Picker `appId`).
- Microsoft Entra (tài khoản Microsoft cá nhân): nếu chưa có tenant thì tạo bằng Azure free account; App Registration chọn "Accounts in any organizational directory and personal Microsoft accounts" (để sau mở M365 không phải đăng ký lại), platform SPA, redirect URI = URL tool trên GitHub Pages + localhost; delegated `Files.ReadWrite`, `User.Read`. Code v1 dùng authority `consumers`.

## Todo List
- [x] Script vendor `scripts/vendor-one-editor-libraries.ps1` + bundle (CM6 core 479 KB, ngôn ngữ 1,2 MB; Prettier; sql-formatter 312 KB)
- [x] Spike đo hiệu năng + mobile (headless Chrome, 2026-11-18)
- [x] Ngưỡng file lớn: sửa trực tiếp ≤ 50 MB
- [x] ADR #19 (cloud opt-in), #20 (IndexedDB), #21 (vendor + preview sandbox)
- [ ] Client ID Google + Microsoft (user)

## Kết quả spike (2026-11-18)
| Hạng mục | Kết quả |
|---|---|
| Core + 143 ngôn ngữ trên `file://` | ✅ tô màu đúng, re-indent Go đúng ⇒ shim dùng chung instance hoạt động |
| Prettier TS/Markdown, sql-formatter T-SQL trên `file://` | ✅ |
| File 1 / 10 / 50 MB | mở 14 / 33 / 165 ms; cuộn cuối + gõ ~1 frame; tìm toàn văn 0,1 / 0,8 / 4,1 s |
| Mobile 390px (tap + gõ) | ✅ `innerWidth` 390, nhận ký tự |
| iframe `srcdoc` | ❌ kế thừa CSP cha ⇒ eval bị chặn |
| iframe file riêng + `sandbox="allow-scripts"` (http) | ✅ origin `null`, không đọc trang cha, Mermaid + D2 render |
| iframe sandbox trên `file://` | ❌ `Not allowed to load local resource` ⇒ `file://` bỏ sandbox (không có token) |

## Success Criteria
- Bundle chạy trên `file://`, Chrome/Edge/Firefox/Safari iOS; số đo ghi vào ADR/plan.

## Risk Assessment
- Bundle quá lớn ⇒ tách ngôn ngữ, nạp lười.
- esbuild cần Node ⇒ dùng Node có sẵn ở `C:\_devtools`, không cài global.

## Security Considerations
- Client ID + API key công khai được; API key bắt buộc giới hạn referrer. Không có client secret.

## Next Steps
- Phase 1.
