# Ô `<input type="date">` gõ tay theo locale trình duyệt — dùng ô chữ dd/mm/yyyy

**Bài học (2026-11-16, Lịch vạn niên → “👤 Của tôi”):** user gõ `11/01/1986` vào `<input type="date">` trên trình duyệt en-US ⇒ trình duyệt hiểu **mm/dd** = 01/11/1986 ⇒ tool tính ra tuổi Bính Dần thay vì Ất Sửu. Code tính đúng, lỗi nằm ở ô nhập.

**Cách làm đúng cho người dùng Việt:**
- Ô gõ tay là `<input type="text">` cố định **dd/mm/yyyy**, parse bằng `DateText.parse` (báo lỗi ngày không tồn tại).
- `type=date` chỉ dùng làm nút 📅 trong suốt (`.pick-wrap`) để **chọn** trên lịch, rồi ghi lại vào ô chữ dạng dd/mm/yyyy.
- Với dữ liệu quan trọng (ngày sinh), hiện **dòng xem trước** kết quả (vd “= Âm 02/12/1985 · tuổi Ất Sửu”) trước khi lưu để user tự phát hiện nhầm.
- `type=time` cũng đổi hiển thị theo locale (AM/PM) ⇒ dùng ô chữ + `datalist` như tab Tử vi.
