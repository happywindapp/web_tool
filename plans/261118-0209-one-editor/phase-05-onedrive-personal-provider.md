# Phase 5 — OneDrive provider (tài khoản cá nhân)

## Context Links
- [plan.md](plan.md) · ADR #19 · MSAL.js (`@azure/msal-browser`), OneDrive File Picker v8, Microsoft Graph `/drives`
- Tra tài liệu bằng skill `microsoft-docs` (scope + URL picker cho tài khoản cá nhân) trước khi code.

## Overview
- Priority: P1 · Status: ⬜ · Cỡ: M
- v1: mở/sửa/lưu file OneDrive **tài khoản Microsoft cá nhân** (user chốt 2026-11-18). M365 công ty = backlog, chờ IT HSC admin consent.

## Key Insights
- App Registration đã chọn "any org + personal" ⇒ mở M365 sau chỉ đổi authority `consumers` → `common` + thêm nhánh picker SharePoint, không đăng ký lại.
- Picker v8 tài khoản cá nhân: `https://onedrive.live.com/picker` (cần verify ở bước tra docs), giao tiếp `postMessage` channel.
- MSAL vendor được (ADR #5), nạp lười khi bấm "Kết nối OneDrive".

## Requirements
- Đăng nhập popup (fallback redirect trên mobile), đăng xuất; token xin im lặng `acquireTokenSilent`.
- Mở: picker → `driveId/itemId` → `GET /drives/{d}/items/{i}` (eTag, size) + `/content`.
- Lưu: `PUT /drives/{d}/items/{i}/content` kèm `If-Match: <eTag>`; `412` ⇒ conflict dialog (dùng chung phase 4); > 4 MB ⇒ upload session.
- Tạo mới / Lưu thành: `PUT /drives/{d}/items/{folderId}:/{name}:/content` với `@microsoft.graph.conflictBehavior=fail`.
- Recent files như Google Drive; đăng nhập bằng tài khoản công ty ⇒ báo "v1 chỉ hỗ trợ tài khoản Microsoft cá nhân".

## Architecture
- `js/providers/onedrive-provider.js`, `js/providers/msal-auth-loader.js`, `js/providers/onedrive-picker-v8.js`; vendor `tools/vendor/msal-browser-<ver>.min.js`.
- Request builder thuần, test node.

## Related Code Files
- Tạo: các file trên; script vendor (thêm MSAL), template CSP, docs.

## Implementation Steps
1. Tra docs Picker v8 + scope tài khoản cá nhân; ghi kết luận vào ADR #19.
2. Vendor MSAL; auth loader nạp lười.
3. Picker v8 cá nhân.
4. Open/save/eTag/upload session/create.
5. Thông báo lỗi song ngữ (huỷ đăng nhập, popup bị chặn, tài khoản công ty).
6. Kiểm tay bằng 1 tài khoản Outlook/Hotmail cá nhân.

## Todo List
- [ ] Tra docs + chốt scope/URL picker
- [ ] Vendor MSAL + auth
- [ ] Picker v8 cá nhân
- [ ] Open/save/eTag/upload session/create
- [ ] Thông báo lỗi
- [ ] Kiểm tay

## Success Criteria
- Mở → sửa → lưu → conflict đúng với tài khoản cá nhân.

## Risk Assessment
- Link tải `/content` redirect sang domain lưu trữ ⇒ đo domain thật bằng DevTools rồi mới khoá CSP.

## Security Considerations
- MSAL `cacheLocation: "memoryStorage"` (không `localStorage`).
- CSP: `connect-src https://graph.microsoft.com https://login.microsoftonline.com` (+ domain tải file đo được); `frame-src https://onedrive.live.com https://login.live.com https://login.microsoftonline.com`.

## Backlog — M365 công ty
- Xin IT HSC admin consent; authority `common`; picker `<tenant>-my.sharepoint.com/_layouts/15/FilePicker.aspx` + token SharePoint; xử lý `AADSTS65001`/`90094`; hỏi chính sách dữ liệu công ty.

## Next Steps
- Phase 6.
