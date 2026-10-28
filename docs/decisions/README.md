# Decisions (ADR) — web_tool

Architecture Decision Records — quyết định đã chốt + **TẠI SAO**.

## Quy ước

- Mỗi quyết định = 1 file `NNNN-tieu-de-kebab.md` (số tăng dần) khi cần thảo luận chi tiết.
- Cấu trúc: **Context → Decision → Consequences** (+ Status: proposed/accepted/superseded).

## Quyết định đã chốt (rút từ code hiện tại — chưa tách file riêng)

| # | Quyết định | Lý do (Context) | Hệ quả |
|---|-----------|-----------------|--------|
| 1 | **1 tool = 1 file HTML tự chứa**, không build, không dependency | Mở trực tiếp bằng `file://`, gửi qua chat/email là dùng được, không cần Node/npm | File dài (`format-json-xml-html.html` 618 dòng) — **ngoại lệ có chủ đích** với luật "< 200 dòng"; tách module bằng IIFE trong file |
| 2 | **100% client-side, không gọi mạng** | Người dùng dán payload nhạy cảm (log UAT, dữ liệu khách hàng) | Không CDN/analytics; thêm request bất kỳ = đổi cam kết ghi trên UI → phải hỏi user |
| 3 | **Tự sửa có audit trail** (`fixes`) thay vì từ chối input lỗi | Tự sửa là đoán; người dùng phải thấy đã đổi gì | Mọi nhánh sửa trong parser phải gọi `fix(msg, at)` |
| 4 | **Workspace root = git repo** (khác các workspace có repo con) | Repo nhỏ, 1 người, không cần tách hub và code | Scaffold AI (`ai-context/`, `docs/`…) commit chung repo tool; junction skills gitignored |
| 5 | **Thư viện lớn → vendor file cạnh tool** (`tools/vendor/<lib>-<ver>.min.js`, `<script src>` tương đối), không CDN, không inline. Áp dụng đầu tiên: Mermaid 12.2.0 (~5.5 MB) — chốt 2026-10-28 | Tự viết renderer Mermaid là không thực tế; inline 5.5 MB làm file khó đọc/sửa; CDN phá #2 | Ngoại lệ của #1: tool + `vendor/` phải đi cùng nhau (GitHub Pages ok; gửi riêng file HTML thì hỏng — tool báo lỗi rõ). `.gitignore` có `!tools/vendor/` |
| 6 | **Cho phép `localStorage`** cho nháp/lịch sử, khoá có tiền tố theo tool — chốt 2026-10-28 | Mất bài khi đóng tab là trải nghiệm tệ; dữ liệu vẫn chỉ nằm trên máy người dùng | Mọi truy cập bọc try/catch (trình duyệt chặn storage → chỉ "không lưu"); có nút xoá; UI ghi rõ nơi lưu |
