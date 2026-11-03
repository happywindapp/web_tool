# PL-CK-TTCK — Thi thử "Pháp luật về chứng khoán và thị trường chứng khoán"

File: [`study/PL-CK-TTCK.html`](../../study/PL-CK-TTCK.html) · card trong [`study.html`](../../study.html) · playbook chung: [README.md](README.md).

## Cấu hình

`COUNT = 30` câu/đề · `MINUTES = 60` · `PASS = 5` (giữ quy ước của đề mẫu CBTTCK) ·
`KEY = "study.pl-ck-ttck.exam"` · `HKEY = "study.pl-ck-ttck.history"`.

## Nguồn (`Documents/Pháp luật về chứng khoán và thị trường chứng khoán/Phần Luật.docx`)

File `.docx` duy nhất (không có ảnh nhúng), trích text bằng `python-docx` theo thứ tự đoạn + bảng.

| Chủ đề (`topic`) | Phần trong tài liệu | Số câu |
|---|---|---|
| Khái niệm & hành vi bị cấm | Luật CK 2019 Chương I — định nghĩa, Điều 12 | 14 |
| Công bố thông tin | Luật CK + TT 96/2020 | 22 |
| Công ty đại chúng & chào mua công khai | CTĐC, chào mua công khai, cổ phiếu quỹ, hủy tư cách CTĐC | 16 |
| Chào bán chứng khoán | Chào bán ra công chúng / riêng lẻ, thời hạn chào bán | 24 |
| Trái phiếu, room ngoại, niêm yết | NĐ 155/2020 sửa đổi bởi NĐ 245/2025: trái phiếu, room ngoại, niêm yết vs UPCoM | 22 |
| Công ty chứng khoán | Chương III, TT 121/2020, TT 91/2020, Điều 88/89/91 | 23 |
| Chứng khoán phái sinh | NĐ 158/2020 (+ NĐ 306/2025) | 12 |
| Chứng chỉ hành nghề | Điều 97, 98 Luật CK | 11 |
| Sở GDCK & VSDC | Chương IV — Điều 42–67 | 16 |
| Xử phạt VPHC | NĐ 156/2020 (+ NĐ 128/2021, NĐ 306/2025) | 15 |
| Luật Doanh nghiệp | Luật DN 2020 — loại hình DN, CTCP, quản trị, công ty mẹ-con | 25 |

Tổng 200 câu, 1 câu `fixed`. Câu tính toán (trần nợ 5 lần VCSH, 1 lần VCSH/đợt, hạn BCTC năm) đã tự tính lại.

## Điểm tài liệu không dùng (mâu thuẫn/không chắc)

- Thẩm quyền CTĐC mua lại cổ phiếu quỹ: tài liệu ghi "bắt buộc ĐHĐCĐ" nhưng phần Luật DN cùng tài liệu ghi HĐQT được quyết ≤ 10%/12 tháng ⇒ không ra câu thẩm quyền, chỉ hỏi đối tượng bị cấm mua lại.
- Thẩm quyền phạt của Chánh Thanh tra UBCKNN, room cá nhân nước ngoài tại CTCK "dưới 49%", giá chào bán dưới mệnh giá "trung bình 60 phiên", mốc 220% vốn khả dụng (NĐ 306 đã bãi bỏ) ⇒ không ra câu.
