# sed `\L` / `\U` làm hỏng chữ tiếng Việt có dấu

- **Triệu chứng:** sau `sed -E 's/"(Nhàn) thần"/"\L\1\E thần"/'` trên Git Bash (Windows), chuỗi thành `"nh�n thần"`; file vẫn chạy nhưng key i18n / so sánh chuỗi sai âm thầm.
- **Nguyên nhân:** sed đổi hoa/thường theo từng byte, cắt đôi ký tự UTF-8 nhiều byte (`à` = 2 byte).
- **Cách xử lý đúng:** đổi hoa/thường hay thay chuỗi có dấu bằng editor/Edit tool hoặc `node -e` (`toLowerCase` hiểu Unicode). Sửa hàng loạt xong thì grep ký tự `�` để chắc không còn byte rác.
- Gặp khi làm tab SIM phong thủy của Lịch vạn niên (2026-11-15).
