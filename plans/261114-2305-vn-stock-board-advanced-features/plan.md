# Plan: Bảng giá chứng khoán — tính năng nâng cao (học từ Simplize · Koyfin · TIKR · ValueInvesting.io · Simply Wall St)

> Trạng thái: **Đợt 1 (F1–F9) XONG 2026-11-14** — user chốt làm Đợt 1, dùng phương án đề xuất: Snowflake tự tính, tab "Định giá" mới, DCF WACC 12 % / g = CAGR LNST 3 năm (0–20 %) / tg 3 %. Đợt 2 (F10–F13) + Đợt 3 (F14–F17) XONG cùng ngày: tải ratio toàn thị trường chạy nền + cache theo ngày (~28 s lần đầu), tab "Thị trường" + "Bộ lọc" + ô "Ngành…" trên thanh tab. Research: [`../reports/research-261114-2305-investing-sites-feature-review.md`](../reports/research-261114-2305-investing-sites-feature-review.md)
> Tool: `tools/vn-stock-price-board.html` (nguồn `src/vn-stock-price-board/`). Mọi tính năng: song ngữ, có mẫu/`?demo`, vào link chia sẻ, đạt ma trận Desktop + Mobile, test node cho phần tính toán.

## Danh sách tính năng đề xuất

Effort: S ≈ ½ ngày · M ≈ 1 ngày · L ≈ 2+ ngày. Dữ liệu: ✅ đã dò được nguồn CORS · ⚠️ cần chốt · ❌ chưa có nguồn.

### Đợt 1 — Pane chi tiết mã (dữ liệu sẵn, giá trị cao)

| ID | Tính năng | Học từ | Làm gì | Dữ liệu | Effort |
|----|-----------|--------|--------|---------|--------|
| F1 | **Định giá lịch sử** | Simplize, TIKR | Biểu đồ P/E, P/B 1–5 năm + đường trung bình ±1σ; giá hiện tại đang ở vùng rẻ/đắt so với chính nó | ✅ ratios theo ngày | M |
| F2 | **Định giá nhanh** | ValueInvesting.io, TIKR | Graham number, P/E mục tiêu × EPS, P/B mục tiêu × BVPS, DCF đơn giản (FCF từ LCTT, chỉnh tăng trưởng / WACC / g cuối kỳ) → giá hợp lý + % chênh lệch; ghi rõ "tham khảo" | ✅ BCTC + ratios | M |
| F3 | **Snowflake 5 chiều** | Simply Wall St, Simplize | Radar Định giá · Tăng trưởng · Quá khứ · Sức khoẻ · Cổ tức + danh sách tiêu chí đạt/không đạt | ⚠️ chọn nguồn (Q1) | M |
| F4 | **Biểu đồ tài chính** | Koyfin, TIKR | Tab Tài chính thêm chế độ "Biểu đồ": cột doanh thu / LNST theo quý-năm + đường biên lãi gộp / biên ròng, tăng trưởng YoY | ✅ BCTC đang có | S |
| F5 | **Dự phóng vs thực hiện** | TIKR, ValueInvesting.io | Doanh thu, LNST dự phóng năm nay của VNDirect vs luỹ kế thực hiện (% hoàn thành) | ✅ modelType 33 | S |
| F6 | **Khối ngoại** | Simplize | Biểu đồ mua/bán ròng 20/60/120 phiên + luỹ kế, room còn lại | ✅ foreigns | S |
| F7 | **Cổ tức** | Simply Wall St, TIKR | Lịch sử cổ tức tiền/cổ phiếu theo năm, tỷ suất, chuỗi năm trả liên tục | ✅ events | S |
| F8 | **Điểm sức khoẻ** | Simply Wall St | Piotroski F-score (0–9), Altman Z (doanh nghiệp thường; ẩn với ngân hàng/CK/bảo hiểm) kèm giải thích từng tiêu chí | ✅ BCTC 2 năm | M |
| F9 | **Hiệu suất giá** | Simplize, Koyfin | %Δ 1T · 1Th · 3Th · YTD · 1N · 3N · 5N, so với VNINDEX | ✅ nến ngày đang có | S |

### Đợt 2 — Toàn thị trường (tab cấp ứng dụng mới)

| ID | Tính năng | Học từ | Làm gì | Dữ liệu | Effort |
|----|-----------|--------|--------|---------|--------|
| F10 | **Tab ngành + so sánh cùng ngành** | Simplize, ValueInvesting.io | Nav thêm "Ngành ▾" (ICB cấp 2/3) → bảng giá theo ngành; pane chi tiết thêm bảng peer: P/E, P/B, ROE, vốn hoá, %Δ, trung vị ngành | ✅ industry_classification + ratios nhiều mã | M |
| F11 | **Heatmap thị trường** | Koyfin, Simplize | Treemap theo ngành, ô = vốn hoá, màu = %Δ hôm nay; bấm ô → mở mã | ✅ quote VPS + MARKETCAP + ngành | L |
| F12 | **Dashboard thị trường** | Simplize, Koyfin | Độ rộng (tăng/giảm/trần/sàn), top tăng · giảm · KL · GTGD, khối ngoại ròng mạnh nhất, ngành mạnh/yếu nhất | ✅ quote VPS + foreigns | M |
| F13 | **Bộ lọc cổ phiếu (screener)** | cả 5 trang | Lọc theo sàn, ngành, vốn hoá, P/E, P/B, ROE, tỷ suất cổ tức, %Δ, KL TB; bộ lọc mẫu ("Giá trị", "Tăng trưởng", "Cổ tức cao", "Giảm sâu"); kết quả → ★ danh mục / CSV | ⚠️ tải ratio toàn sàn chậm (Q2) | L |

### Đợt 3 — Tiện ích cá nhân (không cần dữ liệu mới, lưu trong trình duyệt)

| ID | Tính năng | Học từ | Làm gì | Effort |
|----|-----------|--------|--------|--------|
| F14 | **Cảnh báo giá** | Simply Wall St, Koyfin | Đặt ngưỡng giá / %Δ / KL đột biến cho mã; báo trong trang + Notification khi tab đang mở (không có push khi đóng tab) | M |
| F15 | **Ghi chú & giá hợp lý tự đặt** | Simply Wall St (Narratives) | Ghi chú luận điểm + giá mục tiêu riêng cho từng mã; cột "Chênh lệch vs giá mục tiêu" trong bảng danh mục | S |
| F16 | **So sánh nhiều mã trên chart** | Koyfin | Full chart so sánh tới 5 mã bất kỳ (hiện chỉ VNINDEX), thang % | S |
| F17 | **Lịch sự kiện danh mục** | Koyfin, Simply Wall St | Cổ tức / ĐHCĐ / GDKHQ sắp tới của các mã trong ★ danh mục | S |

### Không làm (lý do)

Giao dịch nội bộ, theo dõi quỹ, vĩ mô, transcript (❌ chưa có nguồn CORS); đồng bộ danh mục, liên kết broker, AI chat, push khi đóng tab (cần server/tài khoản).

## Câu hỏi cần anh chốt

1. **Snowflake (F3):** (a) **tự tính** từ BCTC + ratios với công thức ghi rõ trong docs (minh bạch, không thêm host) — *đề xuất*; hay (b) lấy điểm 0–5 có sẵn của Simplize (thêm host `api.simplize.vn`, không biết công thức)?
2. **Screener / heatmap (F11, F13):** chấp nhận lần đầu mỗi ngày tải ratio toàn sàn ~20–40 s (chạy nền, có thanh tiến trình, cache localStorage theo ngày)? Hay giới hạn screener trong VN100 + danh mục (nhanh, ~3 s)?
3. **Bố cục:** thêm tab "Định giá" (F1 F2 F3 F8) vào pane chi tiết (thành 9 tab) — hay gộp vào tab "Tổng quan"? Đợt 2 thêm 2 tab cấp ứng dụng "Thị trường" (F11 F12) và "Bộ lọc" (F13) cạnh nav sàn/rổ?
4. **Phạm vi:** làm cả 3 đợt, hay chọn ID cụ thể? Đề xuất bắt đầu Đợt 1 (≈ 5–6 ngày công).
5. **DCF (F2):** giả định mặc định WACC 12 %, tăng trưởng 5 năm = CAGR LNST 3 năm (giới hạn 0–20 %), g cuối kỳ 3 % — đồng ý hay muốn khác?

## Bước tiếp theo

Sau khi anh chốt → tách phase file theo đợt (`phase-01-detail-valuation-and-health.md` …), mỗi phase: module mới, test node, kiểm headless ma trận, cập nhật docs + ADR (nếu thêm host).
