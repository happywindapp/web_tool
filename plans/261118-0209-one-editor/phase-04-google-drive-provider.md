# Phase 4 — Google Drive provider

## Context Links
- [plan.md](plan.md) · ADR #19 (phase 0) · Google Identity Services (token model), Google Picker API, Drive API v3

## Overview
- Priority: P1 · Status: ⬜ · Cỡ: M
- Mở/sửa/lưu/tạo file Drive bằng scope `drive.file` + Picker, không cần Google verify restricted scope.

## Key Insights
- `drive.file`: app chỉ thấy file user chọn qua Picker hoặc file app tạo ⇒ không có cây toàn Drive; sidebar Cloud hiện "file gần đây" (id lưu IndexedDB, mở lại vẫn có quyền).
- GIS + Picker phải tải từ `accounts.google.com` / `apis.google.com` (không vendor được) ⇒ chỉ chèn `<script>` khi user bấm "Kết nối Google Drive".
- Google Docs/Sheets gốc không có nội dung nhị phân ⇒ `files.export` sang text/csv, mở chỉ đọc.

## Requirements
- Kết nối/ngắt; token trong bộ nhớ, hết hạn ⇒ xin lại im lặng (`prompt: ''`), thất bại ⇒ nút đăng nhập lại.
- Picker: chọn file (nhiều), chọn folder đích khi "Lưu thành…".
- Mở: `GET files/{id}?fields=name,mimeType,version,modifiedTime,size` + `?alt=media` (bytes → encoding module phase 2).
- Lưu: kiểm `version` trước; khớp ⇒ `PATCH upload/drive/v3/files/{id}?uploadType=media`; lệch ⇒ conflict dialog (diff · ghi đè · lưu bản mới).
- Tạo mới: multipart `POST upload/drive/v3/files` với `parents`.
- Status bar hiện nguồn "Google Drive · <tên>"; trên `file://` nút Kết nối báo "mở bản GitHub Pages để dùng Drive".

## Architecture
- `js/providers/google-drive-provider.js` (cài `StorageProvider`), `js/providers/google-auth-picker-loader.js`, `js/workbench/cloud-panel.js`, `js/workbench/save-conflict-dialog.js`.
- Phần dựng request (URL, header, multipart body) là hàm thuần ⇒ test node không gọi mạng.

## Related Code Files
- Tạo: các file trên; sửa template (CSP), `docs/tools/one-editor.md`.

## Implementation Steps
1. Loader GIS + Picker theo yêu cầu, xử lý lỗi tải script (bị chặn mạng/extension).
2. Token client + vòng đời token.
3. Picker → open → editor; recent files.
4. Save có kiểm version + conflict dialog (dùng chung với OneDrive).
5. Create/Save as; export Google Docs chỉ đọc.
6. Test request builder; kiểm tay trên GitHub Pages + localhost.

## Todo List
- [ ] Loader + token
- [ ] Picker + open + recent
- [ ] Save + conflict dialog
- [ ] Create / Save as / export Docs
- [ ] Test + kiểm tay

## Success Criteria
- Mở → sửa → lưu file `.txt/.json` trên Drive; sửa song song từ tab khác ⇒ hiện conflict, không mất dữ liệu.

## Risk Assessment
- Third-party cookie bị chặn ⇒ GIS token model vẫn chạy (popup); ghi lưu ý nếu trình duyệt chặn popup.
- File lớn ⇒ > 5 MB dùng resumable upload.

## Security Considerations
- CSP: `script-src https://accounts.google.com https://apis.google.com`; `frame-src https://docs.google.com https://accounts.google.com`; `connect-src https://www.googleapis.com`.
- Token không vào `localStorage`, link chia sẻ, log; ngắt kết nối ⇒ `google.accounts.oauth2.revoke`.

## Next Steps
- Phase 6.
