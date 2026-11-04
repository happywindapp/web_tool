# PT-DT-CK — Thi thử "Phân tích và đầu tư chứng khoán"

File: [`study/PT-DT-CK.html`](../../study/PT-DT-CK.html) · card trong [`study.html`](../../study.html) · playbook chung: [README.md](README.md).

## Cấu hình

`COUNT = 50` câu/đề · `MINUTES = 60` · `PASS = 5` ·
`KEY = "study.pt-dt-ck.exam"` · `HKEY = "study.pt-dt-ck.history"`.

## Nguồn (`Documents/Phân tích và đầu tư chứng khoán/`)

`.ppt`/`.doc` cũ chuyển sang `.pptx`/`.docx` bằng COM PowerPoint/Word (Office có sẵn trên máy), rồi trích bằng `python-pptx`/`python-docx`; PDF bằng `pdftotext`.

| Chủ đề (`topic`) | Nguồn | Số câu |
|---|---|---|
| Tổng quan phân tích & đầu tư CK | `CĐ 1+2…Tổng quan về PTĐTCK.pptx`, `ÔN TẬP & BT_2026.ppt` | 18 |
| Giá trị tiền tệ, mức sinh lời & rủi ro | `CĐ 1+2…pptx`, `CĐ 3. Mức sinh lời yeu cau.pptx`, `Bảng công thức…pdf`, `Vi du on tap - update.docx` | 32 |
| Thị trường hiệu quả & tài chính hành vi | `CĐ 3. Gia thuyet thi truong hieu qua & TCHV.pptx` | 35 |
| Phân tích kinh tế | `CĐ 4. Chuyên đề phân tích kinh tế (Gv Đức).pdf` | 40 |
| Phân tích & định giá cổ phiếu | `CĐ 5.Phân tích định giá Cổ phiếu.ppt`, ôn tập phần III | 50 |
| Trái phiếu: đặc điểm, rủi ro & lợi suất | `CĐ 6. (1)…ppt`, `C.Hương/…phần 1 update T10 2025.pptx`, `Tong loi tuc ky dau tu…doc` | 45 |
| Trái phiếu: định giá, duration & lãi suất | `CĐ 8 (1)+(2) Chuong 6 dinh gia TP.pdf`, `CĐ 6. (2)…pdf`, `Cánh tính Macaulay D.doc` | 35 |
| Phân tích kỹ thuật | `CĐ 7.(1)(2)(3) Phân tích kỹ thuật.ppt` | 45 |

Tổng 300 câu, 0 câu `fixed`, ~110 câu tính toán (đổi số so với ví dụ tài liệu; đã tính lại độc lập bằng node, khớp 109/109).
Không dùng: `C.Hương/VBMA_BAO CAO THUONG NIEN 2023.pdf` (số liệu thị trường theo thời điểm); `C.Hương/` còn lại trùng nội dung bản ở thư mục gốc.

## Điểm tài liệu không dùng (mâu thuẫn/không chắc)

- CĐ4: "thâm hụt ngân sách ⇒ tài khóa thắt chặt" (ngược cách hiểu chuẩn); "suy thoái: lạm phát đạt cực đỉnh" ⇒ không ra câu.
- CĐ4 xếp **công nghệ thông tin** vào ngành phòng thủ (khác quan niệm phổ biến) ⇒ câu duy nhất dùng ý này ghi "theo chuyên đề", phương án nhiễu đều là ngành chu kỳ.
- CĐ6 ví dụ YTC (TP 5 năm, C 8%, YTM 10% nhưng P = 650$) và ví dụ lãi tích gộp (2 bản slide ra số khác nhau) không nhất quán ⇒ không dùng.
- CĐ5 slide 35 "Vòng quay vốn lưu động = Doanh thu/Tổng tài sản" (lỗi đánh máy) ⇒ không ra câu.
- CĐ7: slide 46 "giá giảm & KLGD giảm ⇒ giá tiếp tục giảm" mâu thuẫn slide 45/47; "~70% giá nằm trong dải Bollinger" ⇒ không ra câu. Phân nhóm chỉ báo (RSI/Stochastic = động lượng; chữ nhật/cái nêm = lưỡng tính) hỏi kèm "theo tài liệu".
- Phần kiến thức tài liệu chỉ nêu tên (lý thuyết cấu trúc kỳ hạn, DuPont, PVGO, thiên kiến xác nhận/hồi tưởng, quy trình đầu tư) soạn theo kiến thức chuẩn, không mâu thuẫn tài liệu.
