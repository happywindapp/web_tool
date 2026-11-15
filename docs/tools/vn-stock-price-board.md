# Tool: Bảng giá chứng khoán

> File: [`tools/vn-stock-price-board.html`](../../tools/vn-stock-price-board.html) — **file sinh ra** từ
> [`src/vn-stock-price-board/`](../../src/vn-stock-price-board/) bằng `pwsh scripts/build-single-file-tool.ps1 -Tool vn-stock-price-board` (ADR #7).
> Ngoại lệ gọi mạng: ADR #13 (giá VPS) + ADR #14 (nến lịch sử VNDirect, thư viện Lightweight Charts) + ADR #15 (tab chi tiết: VNDirect finfo). Luật chung mọi tool: `docs/architecture/`, `docs/decisions/`.

## 1. Mục đích

Xem bảng giá cổ phiếu Việt Nam (HOSE · HNX · UPCOM) theo kiểu bảng giá của các công ty chứng khoán, trong 1 file HTML:
không đăng nhập, không quảng cáo, có danh mục ★ riêng, chia sẻ được bằng link. Dữ liệu **thật** từ API công khai của VPS
(user chốt không làm chế độ mô phỏng). Chỉ để tham khảo, không đặt lệnh.

## 2. Review công cụ tham khảo (2026-11)

| Bảng giá | Điểm lấy | Ghi chú |
|----------|----------|---------|
| **SSI iBoard** | Thanh chỉ số có sparkline + số mã tăng/giảm, tab sàn/rổ/ngành/CW/ETF, danh mục yêu thích, popup chi tiết mã | API `iboard-query.ssi.com.vn` chỉ cho origin SSI (CORS) |
| **VNDirect** (banggia.vndirect.com.vn) | Header nhóm Bên mua / Khớp lệnh / Bên bán, cột ĐTNN, đổi đơn vị KL | `finfo-api` không trả header CORS |
| **CafeF liveboard** | Bảng gọn, cột TC/Trần/Sàn đầu bảng, màu tím/xanh lơ/vàng | Không có API mở |
| **Vietstock** | Sort theo cột, tuỳ chọn ẩn/hiện nhóm cột | Không có API mở |
| **VPS SmartOne / banggia.vps.com.vn** | Datafeed `bgapidatafeed.vps.com.vn` trả `Access-Control-Allow-Origin: *` | Nguồn dữ liệu của tool này |

**Tool lấy**: màu chuẩn VN (trần tím · sàn xanh lơ · TC vàng · tăng xanh lá · giảm đỏ), header 2 tầng, 3 bước giá, flash ô đổi giá,
thanh chỉ số, tab sàn/rổ, danh mục ★, pane chi tiết (sổ lệnh, chart trong ngày, lịch sử khớp, mua/bán chủ động). **Chưa làm**: tab ngành
(API không có phân ngành — dùng mẫu danh mục theo ngành thay thế), lô lẻ (VPS có `getliststockdataoddlot` nhưng ngoài phiên trả rỗng, chưa xác minh định dạng — hoãn 2026-11-16), thoả thuận. Phái sinh VN30F: đã có (tab Phái sinh).

## 3. Contract (đổi là breaking)

- **Nguồn dữ liệu** (`Feed`, chỉ GET, CSP `connect-src https://bgapidatafeed.vps.com.vn`):
  `getlistckindex/<VN30|VN100|HNX30|hose|hnx|upcom|VNMID|VNSML|VNDIAMOND|VNFINLEAD|VNX50>` · `getliststockdata/<mã,…>` (tối đa 300 mã/request) ·
  `getlistindexdetail/10,11,02,03` · `getliststocktrade/<mã>` · `getlistallstock` (cache localStorage theo ngày VN — tên công ty, sàn, loại `S/E/W/D`) ·
  `getpsalldatalsnapshot/<mã,…>` cho hợp đồng tương lai VN30 (mã KRX bắt đầu bằng số, vd `41I1GB000`; `Feed.quotes` tự tách theo `isFuture`).
- **Nến lịch sử** (`History`, CSP `connect-src https://dchart-api.vndirect.com.vn`): `dchart/history?resolution=<1|5|15|30|60|D>&symbol=&from=&to=` → `{t,o,h,l,c,v,s}`, cache 60s trong bộ nhớ.
- **Tab** (`?tab=`): `watch` (★ Danh mục) · `VN30` · `VN100` · `hose` · `hnx` · `HNX30` · `upcom` · `ETF` · `CW` · `PS` (Phái sinh) · `market` · `screener` · `flows` (Dòng tiền) + rổ khác `VNMID VNSML VNDIAMOND VNFINLEAD VNX50`.
- **Ngoại lệ có chủ đích với checklist "Dữ liệu mẫu"**: tool **không** có dropdown `Thử mẫu…` trên toolbar (user yêu cầu bỏ 2026-11-14, toolbar dành cho danh mục / lọc); dữ liệu mẫu chỉ còn qua `?demo=<key>` — đừng thêm lại dropdown.
- **`?demo=`**: `banks` · `brokers` · `realestate` · `materials` · `energy` · `consumer` · `broken` (có token sai `12`, `VN-30` + mã không tồn tại `XYZ`, `NOTREAL1` ⇒ footer báo lỗi). Mẫu thay danh mục, giữ bản cũ cho `↶ Khôi phục danh mục trước`.
- **Link chia sẻ** `#pako:` payload `{ tab, watch: [mã], opts: { rate, unit, hl, fr, compact }, sort: { key, dir }, sym, chart: { range, interval, type, scale, volume, compare, ind: [{ id, p }], layout: 1|2|4, cells: [{ sym, interval }] ×3 }, dtab, fin: { kind, period } }`; `?data=VNM,FPT` = danh mục thô (đi lên server, chỉ dùng cho dữ liệu ngắn).
  Payload không tin cậy: mã phải khớp `^[A-Z0-9]{3,10}$` (tối đa 300), tab/sort/option chỉ nhận giá trị đã biết. Link hỏng ⇒ báo lỗi, giữ danh mục.
- **localStorage** (`web_tool.vn-stock-price-board.*`): `watch`, `watchBackup`, `lists`, `opts`, `tab`, `theme`, `universe`, `chart`, `dtab`, `fin`, `scr`, `alerts`, `notes`, `market.*`, `flowDays`, `flowFloor`, `corrPeriod`.- **CSV**: `bang-gia-<tab>-<yyyymmdd>.csv` (EN `price-board-…`), UTF-8 BOM, cột = cột đang hiện.

## 4. Luật xử lý

- Giá đơn vị **nghìn đồng**; KL của feed là **lô 10 cổ phiếu** (cả HOSE/HNX/UPCOM, cả `fBVol`/`fSVolume`) — tuỳ chọn `KL: Cổ phiếu` nhân 10. `fRoom` hiển thị dạng rút gọn như feed.
- `ot`/`changePc` của mã và `ot` của chỉ số là **không dấu** ⇒ tự tính `chg = last − ref` (so bằng cent, tránh lỗi float). Chỉ số: `oIndex` = đóng cửa hôm trước.
- Màu (`QuoteModel.tone`): ≥ trần tím · ≤ sàn xanh lơ · = TC vàng · > TC xanh · < TC đỏ; giá `ATO/ATC` trong sổ lệnh giữ nhãn.
- Phiên (`QuoteModel.phase`, theo giờ VN UTC+7, không biết ngày nghỉ lễ): `<9:00` chưa mở · ATO · liên tục · nghỉ trưa 11:30–13:00 · ATC 14:30–14:45 · PLO · đóng cửa ≥15:00.
- Poll: chu kỳ 3/5/10/30s hoặc tạm dừng; ngoài phiên giãn 60s; tab trình duyệt ẩn thì dừng, hiện lại thì poll ngay. Đổi tab bảng huỷ kết quả poll cũ (`gen`).
- Chứng quyền: `getlistallstock` còn mã đã hết hạn ⇒ lấy quote 1 lần, giữ mã có `CWLastTradingDate ≥ hôm nay`.
- Lịch sử khớp: tải khi chọn mã; tự tải lại khi Tổng KL đổi và lần tải trước ≥ 20s; nút ↻ tải ngay. `side` B = mua chủ động, S = bán chủ động.
- Danh mục: thêm từ ô "Lọc / thêm mã" (Enter / `★ Thêm`), sao ☆ trên từng hàng / pane chi tiết; mã không có dữ liệu ⇒ footer + nút "Bỏ các mã này khỏi danh mục".

### Biểu đồ kỹ thuật (`ChartCtl`, `TechChart`, `ChartDraw`, `Indicators`, `TA`)

- 2 chỗ, chung 1 trạng thái `chart`: chart gọn trong pane chi tiết (khoảng · khung nến · kiểu, chỉ báo overlay, không pane riêng) và cửa sổ lớn
  (nút 📈 ở tiêu đề mã, ⛶ trên chart gọn, hoặc nháy đúp 1 hàng bảng giá; Esc đóng).
- Khoảng `1W 1M 3M 6M 1Y 3Y 5Y 10Y ALL (Tất cả)` × khung nến `5m 15m 30m 1h 1D 1W 1M`; tổ hợp không hợp lệ bị khoá, đổi khoảng thì khung nến tự về mặc định (`ChartRange.DEFAULT`).
  5m ≤ 1 tháng · 15m ≤ 3 tháng · 30m ≤ 6 tháng · 1h ≤ 1 năm; 1W cần ≥ 1 tháng, 1M ≥ 3 tháng. Nến tuần (thứ Hai) / tháng gộp từ nến ngày; nến phút đổi sang giờ VN.
  Nến ngày tải thêm 300 ngày trước khoảng xem để MA dài có dữ liệu khởi đầu.
- Kiểu: Nến · Heikin-Ashi · OHLC · Đường · Vùng · Baseline; thang Giá / Log / % thay đổi; Khối lượng; So với VNINDEX (ép thang %).
- 18 chỉ báo, thêm nhiều lần với tham số riêng (tối đa 12): trên giá SMA · EMA · WMA · Bollinger · Donchian · Ichimoku · Parabolic SAR · VWAP (chỉ nến phút, reset mỗi phiên);
  khung riêng RSI · MACD · Stochastic · ADX (+DI/−DI) · ATR · CCI · Williams %R · MFI · OBV · ROC (có đường mức 30/70, 20/80…). Pane giá luôn ≥ 1/2 chiều cao.
- Vẽ (chart lớn, theo mã, trong bộ nhớ): đường ngang · xu hướng · Fibonacci thoái lui (0–100%) · thước đo (Δ giá, %, số nến) · xoá. Legend OHLC + %, KL, giá trị chỉ báo theo crosshair; ⤢ xem toàn bộ; 📷 PNG.
- Nến ngày cuối cập nhật theo quote mỗi lần poll (khung 1D; Heikin-Ashi không cập nhật trực tiếp).
- Tool tự bắt `click` gốc trên vùng chart (thư viện nuốt click thứ 2 nhanh ở điểm khác như double-click); kéo > 6px không tính là click.

### Các tab của pane chi tiết (`DetailTabs`, `TabHtml`, `FinView`, `FinTable`, `Finfo`)

| Tab | Nội dung | Nguồn |
|-----|----------|-------|
| Tổng quan | Trần/sàn/TC, sổ lệnh 3 bước, hiệu suất giá, khối ngoại + chỉ số cơ bản: vốn hoá, P/E, P/B, P/S, EPS, BVPS, ROE, ROA, ROIC, tỷ suất cổ tức, Beta, CP lưu hành, KL TB 10 phiên, cao/thấp 52 tuần | VPS + `ratios/latest` |
| Định giá | Snowflake 5 trục, giá hợp lý (Graham, P/E, P/B, DCF sửa được), P/E–P/B 5 năm, Piotroski, Altman Z | `ratios`, `ratios/latest`, BCTC năm, dự phóng, cổ tức |
| Kỹ thuật | Chart kỹ thuật gọn (chỉ tải khi tab mở hoặc cửa sổ lớn mở) | VNDirect dchart |
| Khớp lệnh | Diễn biến trong ngày, mua/bán chủ động, lịch sử khớp | VPS |
| Tin tức | 10 tin/lần + "Xem thêm", nguồn, giờ, tóm tắt; tiêu đề mở bài gốc ở tab mới (`noopener`) | `news` (chỉ tiếng Việt) |
| Tài chính | KQKD / Cân đối / Lưu chuyển tiền tệ × Quý (8 quý) / Năm (8 năm), đơn vị tỷ đồng, EPS giữ đồng, rê chuột xem % so với kỳ trước | `financial_models` + `financial_statements` |
| Sự kiện | Cổ tức, cổ phiếu thưởng, phát hành thêm, ĐHCĐ: ngày công bố, GDKHQ, ngày thực hiện | `events` (`VN` / `EN_GB`) |
| Hồ sơ | Tên, sàn, ngày thành lập, MST, địa chỉ, điện thoại, website, email, số nhân viên, giới thiệu + 15 cổ đông lớn | `company_profiles` + `shareholders` |
| Khuyến nghị | **Khuyến nghị của tool** (`TradePlan` pure + `TradePlanView`): thời điểm mua/bán (8 hành động từ xu hướng tuần × ngày + RSI, điều kiện mua/bán cụ thể, giao cắt `ChartCrosses` 10 phiên gần nhất) · bảng giá mua/chốt lời/dừng lỗ/R:R cho Hôm nay (pivot + ATR ngày, kẹp sàn–trần, làm tròn bước giá HOSE/HNX/UPCOM), Trung hạn (pivot + ATR tuần), Dài hạn (biên an toàn 15% dưới giá hợp lý hoặc MA250, mục tiêu = TB giá hợp lý + đồng thuận CTCK 12 tháng) · lưu ý khác (tỷ trọng theo rủi ro 1% vốn, thanh khoản 20 phiên, biến động năm, định giá / P/E percentile, Altman, Piotroski, sát đỉnh/đáy 52 tuần, lệch khung, đồng thuận CTCK, sàn–trần + T+2). Dùng lại dữ liệu tab Kỹ thuật / Định giá nếu đã tải. **Kiểm chứng quá khứ** (nút, `PlanBacktest` + `PlanBacktestView`, test `trade-plan-backtest-replay.test.js`): phát lại `TradePlan` trên nến ngày đã hoàn tất (cửa sổ 600 phiên tại mỗi bước, không nhìn trước), hôm nay / trung hạn mỗi phiên ~500 phiên gần nhất, dài hạn mỗi 5 phiên trên toàn lịch sử (chỉ mốc MA250 — không có giá hợp lý / mục tiêu CTCK theo thời gian; không áp trần / sàn). Lệnh mua: chờ chạm vùng mua 3 / 15 / 60 phiên, vào ở min(giá mở cửa, đỉnh vùng); bán được từ T+2; thoát ở dừng lỗ / mục tiêu 1 (cùng phiên ⇒ dừng lỗ, gap ⇒ giá mở cửa) hoặc sau 5 / 40 / 250 phiên; phí mua 0,15 %, bán 0,25 % (gồm thuế); lệnh không chồng nhau. Khuyến nghị bán: % lần giá thấp hơn sau 5 / 20 / 250 phiên. Bảng: mô phỏng / tổng, vào lệnh, tỷ lệ thắng, lãi TB, lệnh tệ nhất, lãi gộp vs mua & giữ, sụt giảm tối đa, giữ TB, kiểu thoát + lệnh gần nhất. Cache 30 phút / mã, ~1,3 s với 11 năm dữ liệu. Phần mô phỏng lệnh `PlanSim` (`plan-backtest-trade-simulator.js`) dùng chung với Bảng giá Crypto. **Kiểm chứng tín hiệu** (`SignalBacktest` pure + `SignalBacktestView`): 5 năm nến ngày đã hoàn tất (bỏ nến hôm nay), bộ chỉ báo cố định SMA 20/50 · RSI 14 · MACD 12-26-9 · Stoch 14 · ADX 14 · SAR qua `ChartCrosses.detect`; mỗi loại giao cắt: số lần, lãi/lỗ TB + tỷ lệ đúng hướng sau 5/20/60 phiên (giao cắt cảnh báo không có hướng ⇒ chỉ TB), dòng tham chiếu = mọi phiên, câu tóm tắt tín hiệu đáng tin nhất (≥ 55 % sau 20 phiên, ≥ 5 lần). Phía dưới: giá mục tiêu TB, bảng đơn vị / đánh giá / giá mục tiêu | `recommendations` + dchart + finfo định giá |

- Mẫu BCTC tự chọn theo mã: trong các mẫu cùng loại lấy mẫu có `note` thông tư (doanh nghiệp 1/2/3, ngân hàng 101/102/103, chứng khoán 89/90/91, bảo hiểm 411/412/413).
- Đổi mã ⇒ bỏ kết quả của mã cũ (`seq`); đổi ngôn ngữ ⇒ vẽ lại từ bộ nhớ, riêng Sự kiện tải lại theo locale. Tab đang mở + tuỳ chọn BCTC nằm trong link chia sẻ (`dtab`, `fin`) và localStorage (`dtab`, `fin`).
- `ownershipPct` của cổ đông đã là %, còn ROE/ROA/tỷ suất cổ tức của `ratios` là tỷ lệ (× 100 khi hiện).

### Tab Định giá + bổ sung Đợt 1 (`ValTab`, `ValHtml`, `Valuation`, `Health`, `VSvg`, `OverviewExtra`)

Plan: [`plans/261114-2305-vn-stock-board-advanced-features/plan.md`](../../plans/261114-2305-vn-stock-board-advanced-features/plan.md) (F1–F9). Mọi số liệu do tool tự tính, chỉ để tham khảo.

| Khối | Tab | Công thức / nguồn |
|------|-----|-------------------|
| Hiệu suất giá (F9) | Tổng quan | %Δ giá đóng cửa phiên cuối so với phiên ≤ ngày bắt đầu kỳ (1T 7 ngày · 1Th 30 · 3Th 91 · YTD = phiên cuối năm trước · 1N · 3N · 5N), nến ngày VNDirect đã điều chỉnh; cột Chênh lệch = mã − VNINDEX |
| Khối ngoại (F6) | Tổng quan | `foreigns` 120 phiên: cột mua/bán ròng (tỷ) + đường luỹ kế, chọn 20 / 60 / 120 phiên; room còn = `currentRoom / totalRoom` |
| Snowflake (F3) | Định giá | 5 trục, mỗi trục = round(số tiêu chí đạt / số tiêu chí có dữ liệu × 6); tiêu chí thiếu dữ liệu không tính. **Định giá**: P/E < trung vị 5 năm · P/B < trung vị 5 năm · giá < giá hợp lý TB · P/E < 15 · PEG (P/E ÷ CAGR LNST 3 năm) < 1. **Tương lai**: dự phóng VNDirect năm sau BCTC năm gần nhất: doanh thu > +10 % · LNST > +10 % · LNST > +20 %. **Quá khứ**: ROE > 15 % · ROA > 7 % (tài chính > 1 %) · LNST năm gần nhất tăng · CAGR LNST 3 năm > 10 % · LNST tăng sau 5 năm. **Sức khoẻ**: doanh nghiệp thường — thanh toán hiện hành > 1 · (vay ngắn + dài hạn) / VCSH < 1 · EBIT / lãi vay > 3 · CFO > 0 · Altman Z an toàn · Piotroski ≥ 6; ngân hàng/CK/bảo hiểm — VCSH / tổng tài sản > 7 % · có lãi. **Cổ tức**: tỷ suất > 2 % · > 4 % · trả tiền 3 năm liền · năm gần nhất không giảm · cổ tức đã trả / LNST trong 0–80 % |
| Giá hợp lý (F2) | Định giá | Graham = √(22,5 × EPS × BVPS) · P/E trung vị 5 năm × EPS · P/B trung vị 5 năm × BVPS · DCF 2 giai đoạn: FCF₀ = TB 3 năm (CFO + mua sắm TSCĐ), tăng g % trong 5 năm (mặc định CAGR LNST 3 năm, kẹp 0–20 %), sau đó tg = 3 %, chiết khấu WACC = 12 %, trừ nợ vay ròng (vay ngắn + dài − tiền), chia số CP lưu hành. g / WACC / tg sửa được trên giao diện (không lưu). DCF bỏ qua với tài chính hoặc FCF ≤ 0 |
| Định giá lịch sử (F1) | Định giá | `ratios` P/E, P/B theo ngày 5 năm: TB, ±1σ, thấp/cao nhất, phân vị của hôm nay (thấp = rẻ so với chính nó) |
| Piotroski / Altman (F8) | Định giá | Piotroski 9 tiêu chí trên 2 BCTC năm gần nhất (ROA > 0, CFO > 0, ΔROA > 0, CFO > LNST, Δ nợ dài hạn/TS ≤ 0, Δ thanh toán hiện hành > 0, số CP (≈ LNST/EPS) không tăng quá 2 %, Δ biên gộp > 0, Δ vòng quay TS > 0). Altman Z = 1,2·(TSNH − NNH)/TS + 1,4·LNCPP/TS + 3,3·EBIT/TS + 0,6·vốn hoá/nợ phải trả + doanh thu/TS (> 2,99 an toàn · 1,81–2,99 xám · < 1,81 nguy cơ). Cả hai chỉ cho doanh nghiệp thường |
| Biểu đồ tài chính (F4) | Tài chính | Nút Bảng / Biểu đồ: KQKD = doanh thu (ngân hàng: tổng thu nhập hoạt động) + LNST công ty mẹ + đường biên LNST; Cân đối = tổng TS, nợ phải trả, VCSH; LCTT = dòng tiền KD / đầu tư / tài chính |
| Dự phóng vs thực hiện (F5) | Tài chính | Dự phóng năm nay (`reportType:ESTIMATION`, của VNDirect, không phải consensus) vs tổng các quý đã báo cáo trong năm |
| Cổ tức (F7) | Sự kiện | Cổ tức tiền theo năm (`events type:DIVIDEND`, cộng các đợt), tỷ suất trên giá hiện tại, số năm trả liên tục |

Mã khoản mục dùng chung (`Health.C`): 11000 TSNH · 11100 tiền · 13100 nợ ngắn hạn · 13110 vay ngắn hạn · 13340 vay dài hạn · 13000 nợ phải trả · 14000 VCSH · 14200 LNST chưa phân phối · 14400 tổng TS · 21001 doanh thu thuần (ngân hàng 421701) · 23100 LN gộp · 23800 LNTT · 23000 LNST công ty mẹ · 23001 EPS · 22509 chi phí lãi vay · 32000 CFO · 32100 mua sắm TSCĐ (âm) · 33600 cổ tức đã trả (âm).

### Đợt 2 — toàn thị trường (`Market`, `Mkt`, `MarketView`, `ScreenView`, `MarketTabs`)

- **Dữ liệu chung** (`Market`): danh sách mã 3 sàn (VPS `getlistckindex`), ICB 3 cấp (`industry_classification`, cache localStorage theo ngày VN),
  chỉ số `MARKETCAP, P/E, P/B, ROE, DIVIDEND_YIELD` của ~1.500 mã qua `ratios/latest?where=code:…` (cụm 100 mã, 6 song song, ~15–30 s lần đầu mỗi ngày,
  có tiến trình; cụm lỗi bị bỏ qua, chỉ cache khi đủ). Tab toàn thị trường poll ~1.500 quote (≈ 1,5 MB) tối thiểu 30 s.
- **Tab Thị trường**: độ rộng 3 sàn (trần/tăng/đứng/giảm/sàn + GTGD), heatmap treemap squarified theo ICB cấp 1 (ô = vốn hoá, chưa có vốn hoá thì GTGD;
  màu −7 %…+7 %, trần tím, sàn xanh lơ; chọn sàn + Top 100/200/400; bấm ô mở mã), sức mạnh ngành ICB cấp 2 (%Δ theo vốn hoá, bấm mở bảng giá ngành),
  top tăng / giảm (GTGD > 1 tỷ), GTGD lớn nhất, NN mua / bán ròng (`(fBuy − fSell) × 10 × giá TB`).
- **Tab Bộ lọc**: sàn, ngành ICB cấp 2, vốn hoá ≥, P/E từ–đến, P/B ≤, ROE ≥, cổ tức ≥, %Δ hôm nay từ–đến, GTGD ≥; ô trống = không giới hạn, mã thiếu chỉ số trượt tiêu chí đó.
  Bộ lọc mẫu: Giá trị · Chất lượng · Cổ tức cao · Giảm mạnh nền tốt · Thanh khoản cao. Sắp xếp theo cột, ☆ từng mã, "★ Thêm tất cả" (hỏi xác nhận), CSV. Lưu `scr` trong localStorage.
- **Tab ngành**: ô "Ngành…" trên thanh tab (ICB cấp 2) → bảng giá các mã trong ngành; tab id `icb:<mã ngành>` (dùng được trong `?tab=` và link chia sẻ).
- **So sánh cùng ngành** (cuối tab Định giá): mã cùng ICB cấp 3 (cấp 2 nếu < 3 mã), top 10 theo vốn hoá + chính mã + dòng trung vị ngành.

### Đợt 3 — tiện ích cá nhân (`AlertRule`, `Alerts`, `Notes`, `PersonalUI`)

- **🔔 Cảnh báo** (nút header + 🔔 cạnh tên mã): Giá ≥ / Giá ≤ (nghìn đồng) / Tăng ≥ % / Giảm ≥ %; kiểm sau mỗi lần poll (mã ngoài tab được poll kèm), mỗi cảnh báo báo 1 lần / ngày VN,
  hiện ở footer + Notification của trình duyệt khi đã cho phép. Chỉ chạy khi trang mở; tối đa 100 cảnh báo; localStorage `alerts`.
- **Cảnh báo tín hiệu kỹ thuật** (cùng hộp 🔔, nhóm "Tín hiệu kỹ thuật"): giá cắt lên / xuống MA n (2–250) · RSI 14 vượt lên / xuống dưới ngưỡng (1–99) · MACD cắt lên / xuống đường tín hiệu · giá vào vùng mua hôm nay · giá thủng dừng lỗ trung hạn (vùng của `TradePlan`).
  So **giá đóng cửa hôm qua** với **giá khớp hiện tại** (`SignalState`: nến ngày đã hoàn tất + 1 nến live) ⇒ chỉ báo khi giao cắt xảy ra trong phiên hôm nay. Nến ngày của các mã có cảnh báo tín hiệu do `SignalBars` tải nền (2 năm, 1 lần mỗi ngày VN, lỗi thì thử lại sau 5 phút); chưa tải xong thì chưa báo. Kỳ MA phải là số nguyên.
- **Ghi chú & giá mục tiêu** (đầu tab Định giá): giá mục tiêu riêng + ghi chú ≤ 2.000 ký tự / mã, localStorage `notes`; ô "Mục tiêu" trên toolbar bật 2 cột "Mục tiêu · Còn %" trong bảng giá.
- **So sánh nhiều mã** (chart): ô "So sánh" nhận tối đa 5 mã/chỉ số (VNINDEX, VN30, mã bất kỳ), thang % chỉ áp cho pane giá; cấu hình cũ `compare: true` tự đổi thành `["VNINDEX"]`.
- **📅 Lịch sự kiện danh mục**: sự kiện có ngày GDKHQ / hiệu lực từ 3 ngày trước trở đi của tối đa 40 mã trong ★ Danh mục (6 request song song), bấm dòng mở mã.

### Gợi ý mua / bán (tab Thị trường — `PicksView`, `Picks`)

Bấm **🔍 Phân tích** (phạm vi VN30 · VN100 · VN100 + HNX30 · ★ Danh mục, tối đa 300 mã): tải 2 năm nến ngày từng mã (6 song song), chấm `TechOutlook` khung ngày + tuần,
MA200, %Δ 1 năm; P/E trung vị theo ICB cấp 3 từ chỉ số toàn thị trường. Kết quả cache localStorage `picks` theo ngày VN + phạm vi. Top 8 mỗi danh sách, GTGD hôm nay ≥ 1 tỷ.

| Danh sách | Điều kiện | Điểm xếp hạng |
|-----------|-----------|---------------|
| Mua ngắn hạn | điểm ngày ≥ 15 và RSI < 70, hoặc RSI ≤ 32 khi điểm tuần > 0 (hồi từ quá bán) | điểm ngày (hoặc 40 khi hồi) + 10 nếu tuần > 0 + 10 nếu rẻ |
| Mua trung hạn | điểm tuần ≥ 15 và điểm ngày > −15 | điểm tuần + 15 nếu trên MA200 + 10 nếu rẻ |
| Mua dài hạn | ROE ≥ 15 %, P/E > 0 và ≤ 1,1 × P/E ngành | ROE + (P/E ngành ÷ P/E − 1) × 40 (kẹp −20…40) + 3 × tỷ suất cổ tức + 5 nếu trên MA200 |
| Bán ngắn hạn | điểm ngày ≤ −15 hoặc RSI ≥ 75 | −điểm ngày + 20 nếu RSI ≥ 75 + 10 nếu tuần < 0 |
| Bán trung hạn | điểm tuần ≤ −15 và điểm ngày < 15 | −điểm tuần + 15 nếu dưới MA200 + 10 nếu đắt |
| Bán dài hạn | dưới MA200 và (đắt hoặc ROE < 8 %) | (P/E ÷ P/E ngành − 1) × 40 (kẹp 0…60; lỗ = 40) + 2 × (10 − ROE) + 10 nếu %Δ 1 năm < 0 |

"Rẻ" = P/E < 0,85 × P/E ngành; "đắt" = P/E ≤ 0 (lỗ) hoặc > 1,4 × P/E ngành. Một mã có thể nằm ở cả mua dài hạn và bán ngắn hạn. Không phải khuyến nghị đầu tư.

### Nhận định kỹ thuật tự động (tab Kỹ thuật — `TechOutlook`, `OutlookView`)

Dựa trên quy tắc + thống kê lịch sử của chính mã (không dùng AI / server); nến ngày VNDirect ~10 năm, gộp tuần / tháng như chart.
- **Điểm −100…+100** mỗi khung Ngày (MA 20/50/200) · Tuần (MA 10/20/40) · Tháng (MA 6/12/24) = bình quân có trọng số các phiếu −1…+1: giá vs MA ngắn (1) / vừa (1) / dài (2),
  thứ tự MA (1), độ dốc MA vừa 5 nến (1), RSI 14 (≥ 70 −0,5 · ≤ 30 +0,5 · ≥ 50 +1 · < 50 −1), MACD vs signal (1), histogram tăng/giảm (0,5), ADX ≥ 25 theo +DI/−DI (1),
  %B Bollinger > 1 −1 / < 0 +1 (0,5), KL > 1,5× TB20 theo chiều nến (0,5). Nhãn: ≥ 50 Tăng mạnh · ≥ 15 Tăng · > −15 Đi ngang · > −50 Giảm · còn lại Giảm mạnh.
- **Năm**: %Δ 12 tháng, giá vs MA250 phiên, cách đỉnh/đáy 52 tuần, σ năm (độ lệch chuẩn log-return 252 phiên × √252).
- **Phán đoán**: Ngày mai (khung ngày, vùng close ± ATR14, pivot S1/P/R1) · Tuần tới (khung tuần, ± ATR tuần, pivot tuần) · Tháng tới (khung tháng, ± ATR tháng) ·
  Năm tới (khung tháng, ± 1σ năm) · Dài hạn (CAGR 5 năm, sụt giảm tối đa 5 năm, cách đỉnh lịch sử; Tích cực khi CAGR > 5 % và giá trên MA250).
- **Lịch sử khi tín hiệu tương tự**: mọi nến quá khứ cùng nhóm điểm → % lần giá cao hơn sau 1 nến (ngày/tuần/tháng) hoặc 12 tháng, trung vị, P25–P75;
  < 20 mẫu thì gộp mọi nhóm cùng chiều ("gộp mọi mức cùng chiều"), < 8 mẫu không hiện P25–P75, < 20 ghi "ít mẫu". Không phải khuyến nghị.

### Giải thích trên Full chart (`ChartEvents`, `ChartHelp`)

- Rê chuột lên mục trong legend → giải thích nến / từng đường (SMA, BB, Ichimoku, SAR…); rê vào pane chỉ báo → ý nghĩa + diễn giải giá trị tại nến đó (RSI 72: quá mua…).
- Điểm cần lưu ý tự dò trong khoảng đang xem (tối đa 80, mới nhất): đỉnh / đáy (cực trị trong cửa sổ ±k nến, k = n/40 kẹp 3–12, nổi bật ≥ 2 ATR), cao nhất / thấp nhất của khoảng,
  MA ngắn nhất cắt MA dài nhất trong các SMA/EMA/WMA đang bật (giao cắt vàng / tử thần), MACD cắt tín hiệu, RSI vào > 70 / < 30, đóng cửa ngoài dải Bollinger, KL ≥ 2,5× TB20.
  Điểm chính (đỉnh, đáy, cao/thấp nhất, giao cắt MA) = mũi tên + chữ; tín hiệu phụ = chấm nhỏ. Rê tới nến có dấu → hộp giải thích. Chart gọn trong pane chi tiết không vẽ dấu.
- Toolbar Full chart: **+ Chỉ báo…** đứng đầu hàng (điện thoại: panel `position:fixed` ngay dưới nút, rộng hết màn hình, vì toolbar cuộn ngang sẽ cắt panel); khoảng thời gian (1 tuần … Tất cả) và khung nến (5m … 1M) là 2 select dùng chung `timeSels` với toolbar mini, khung nến không hợp với khoảng thì bị disable.
- Mở Full chart từ tab bất kỳ luôn tải dữ liệu (trước đây mở từ tab khác "Kỹ thuật" có thể báo không có dữ liệu).

### Thẻ chỉ số (VNINDEX · VN30 · HNX · UPCOM)

- Dòng 1: điểm, ±, % (VPS `getlistindexdetail`). Dòng 2: GT (tỷ) · KL · NN ròng (VNDirect `foreigns?q=code:<INDEX>` phiên gần nhất, tooltip ghi ngày).
- Chart `IndexCardSvg` (pure, `js/model/index-intraday-card-svg.js`): 2 phiên gần nhất nến 1 phút dchart — phiên trước xám, phiên mới xanh/đỏ quanh tham chiếu (clip-path), đường tham chiếu vàng nét đứt, cột KL 5 phút, trục 09:30 · 11:30 · ngày · 11:30 · 14:30; rê chuột = Thời gian · Chỉ số · Khối lượng. Phiên hôm nay nối thêm điểm live từ VPS.
- `IndexData` (`js/data/index-intraday-and-foreign-loader.js`): tải nến 1 phút mỗi 60 s khi đang giao dịch / 10 phút ngoài giờ, khối ngoại mỗi 30 phút.
- Dòng cuối: ⤒ trần · ↑ tăng · — đứng · ↓ giảm · ⤓ sàn + trạng thái phiên. Trần/sàn không có trong feed chỉ số ⇒ đếm từ bảng giá khi tab đang mở đúng rổ (HOSE→VNINDEX, VN30, HNX, UPCOM; tab Thị trường/Bộ lọc → 3 sàn), giữ số gần nhất, chưa có thì "–".

### Đợt 4 — dòng tiền, phái sinh, tương quan, nhiều biểu đồ (2026-11-16)

- **Tab Dòng tiền** (`FlowRank` pure + `FlowsView`): top 15 mua ròng / bán ròng của **khối ngoại** và **tự doanh CTCK** trong 1 / 5 / 10 / 20 phiên, lọc sàn, tổng ròng · mua · bán, giá + % hiện tại (tab chỉ poll các mã đang hiện — `FlowsView.symbols()`, không tải cả thị trường; thẻ chỉ số không đếm trần/sàn từ tab này), bấm mã mở chi tiết; tải lỗi ⇒ thử lại sau ≥ 60 s.
  Dữ liệu cuối ngày VNDirect: `foreigns?q=tradingDate:gte:<ngày>~type:STOCK` (≈ 1.500 dòng/phiên, 20 phiên ≈ 3 MB) và `proprietary_trading?q=date:gte:<ngày>~type:STOCK` (công bố trễ ~1 ngày, chủ yếu HOSE); ngày giao dịch lấy từ dòng `foreigns` của VNINDEX.
- **Tab Phái sinh** (`PS`): 4 hợp đồng VN30F từ `Universe` loại `D`, giá từ `getpsalldatalsnapshot`; thêm cột **OI · Basis · Đáo hạn** (opt `fut`, chỉ ở tab này), basis = giá HĐ − VN30 (cập nhật mỗi lần poll), KL là số hợp đồng (không nhân ×10). Pane chi tiết thêm HĐ mở, basis, ngày đáo hạn; chart kỹ thuật dùng dchart với chính mã KRX.
- **🔗 Tương quan** (nút header, `Correlation` pure + `CorrelationUI`): ma trận Pearson của % thay đổi giá ngày giữa VNINDEX và tối đa 20 mã đầu ★ Danh mục (bỏ mã phái sinh), 3 tháng / 6 tháng / 1 năm, chỉ tính phiên cả hai mã cùng có giá (≥ 20 phiên); TB tương quan giữa các mã (không tính VNINDEX) + nhận xét đa dạng hoá, 3 cặp đi cùng nhau nhất / bù trừ tốt nhất.
- **Bố cục nhiều biểu đồ** (Full chart, select ▢ 1 · ▥ 2 · ▦ 4 biểu đồ — `ChartGrid`): ô 1 là biểu đồ chính như cũ; mỗi ô phụ có ô nhập mã (trống = mã đang xem) + select khung nến, vẽ gọn (giá + chỉ báo trên biểu đồ giá + KL, cùng kiểu nến / thang), khoảng thời gian = khoảng của biểu đồ chính nếu hợp khung nến, không thì mặc định theo khung (5m→1 tuần … 1M→10 năm).
  Tải lại ô phụ khi dữ liệu > 60 s; giữ zoom khi vẽ lại cùng dữ liệu. Desktop 2 ô cạnh nhau / 2×2; ≤ 900px 2 ô xếp dọc; điện thoại 4 ô = 2×2.

### Full chart của chỉ số

- Bấm (hoặc Enter) thẻ VNINDEX / VN30 / HNX / UPCOM ở dải chỉ số ⇒ `ChartCtl.openDialog(code)` mở Full chart của chỉ số đó (dchart dùng đúng các mã này); header lấy giá trị + thay đổi từ `IndexStrip.find`. Đóng dialog ⇒ quay lại mã đang chọn (`home`), mini chart vẽ lại mã đó.

### Menu "+ Chỉ báo…" và hướng dẫn chỉ báo (`IndGuide`, `IND_GUIDE`, `IndIllus`)

- Mỗi dòng: checkbox (đang hiện trên chart = tích; `(n)` khi bật nhiều bộ tham số) · rê chuột = giải thích ngắn (`ChartHelp.desc`) · nút **?** mở hộp hướng dẫn chi tiết.
- Chỉ báo quan trọng (`Indicators.CORE` = SMA, EMA, BB, RSI, MACD) có ★, viền trái + nền màu accent.
- Checkbox "Đánh dấu Đỉnh / Đáy" (`st.peaks`, mặc định tắt, lưu trong Prefs "chart") ẩn/hiện marker `swingHigh`/`swingLow`; Cao nhất/Thấp nhất của khoảng và các tín hiệu khác vẫn hiện.
- Checkbox "Điểm giao cắt quan trọng" (`st.crosses`, mặc định bật): `ChartCrosses.detect` (pure, `js/model/chart-line-crosses-detector.js`) tìm MA nhanh × MA chậm, giá × MA dài nhất, Tenkan × Kijun, đảo chiều SAR, MACD × Signal / × 0, ROC × 0, +DI × −DI, ADX × 25, %K × %D trong vùng 20/80, vào/rời vùng quá mua–quá bán (RSI, CCI, %R, MFI); bỏ cắt lặp trong 3 nến (whipsaw). `ChartCrossUI` (`js/ui/chart-cross-points.js`) vẽ chấm `atPriceMiddle` ngay trên đường bị cắt và giải thích chi tiết khi rê chuột / chạm trong 16 px. Chỉ bật khi controller truyền `s.crosses` ⇒ Bảng giá Crypto (dùng chung `technical-chart-view.js`) không bị ảnh hưởng.
- Khung riêng bật bao nhiêu cũng được (tổng ≤ `Indicators.MAX` = 12): Full chart giữ khung giá ≥ 340 px, mỗi pane chỉ báo ≥ 130 px; không đủ chỗ thì vùng chart cuộn dọc
  (lăn chuột trên pane chỉ báo = cuộn, trên khung giá = zoom như cũ; điện thoại vuốt dọc), mỗi pane có nhãn tên ở góc trên-trái. Đủ chỗ thì giữ bố cục cũ (khung giá ≥ ½ chiều cao).
- Hộp hướng dẫn (`#indHelpDlg`, mở chồng lên Full chart, Esc chỉ đóng hộp này): **Là gì · Cách đọc · Ví dụ minh họa (có số liệu) · Phối hợp với chỉ báo khác · Lưu ý**,
  checkbox "Bật trên biểu đồ", ‹ › hoặc phím ←/→ duyệt cả 18 chỉ báo; menu chỉ báo phía sau giữ nguyên trạng thái mở.
- Hình minh họa vẽ SVG trên chuỗi giá giả lập cố định 160 nến (tăng → đỉnh → giảm → đi ngang → bứt phá; VWAP dùng 4 phiên × 40 nến 5 phút, có vạch ngăn phiên):
  MA vẽ cặp 20/50 (SMA), 12/26 (EMA), 10/30 (WMA) để thấy giao cắt; đánh dấu tín hiệu từ `ChartEvents` (giao cắt MA, MACD, RSI, Bollinger; chỉ báo khác = đỉnh / đáy), tối đa 6 dấu.
- Nội dung tiếng Việt ở `js/ui/indicator-guide-content.js`, English ở `js/i18n/en-indicator-guide-strings.js`; test `indicator-guide-and-illustration.test.js`
  bắt buộc mọi id trong `Indicators.DEFS` có đủ 5 mục (≥ 2 ví dụ, ≥ 2 cách phối hợp) và hình không có NaN — thêm chỉ báo mới phải viết hướng dẫn.

### Lưu / nhập / xuất danh mục (`WatchIO`, `WatchFile`)

- Toolbar: **💾 Lưu danh mục** (đặt tên, lưu ★ danh mục hiện tại; dùng chung module `SavedSessions`, localStorage `lists`, ≤ 30 bản) · **📂 Đã lưu** (mở lại → thay danh mục, có ↶ Khôi phục) · **🗑** xoá bản đang mở.
- **⬇ Xuất danh mục**: `danh-muc-<yyyymmdd>.json` (EN `watchlist-…`) = `{ app: "vn-stock-price-board", version: 1, exported, watch: [mã], notes: { mã: { text, target } }, alerts: [{ sym, type, value }] }` — chỉ ghi chú / cảnh báo của các mã trong danh mục.
- **⬆ Nhập**: JSON của tool (khôi phục cả ghi chú + cảnh báo, bỏ cảnh báo trùng) · mảng JSON mã · TXT (mọi token) · CSV/TSV nhiều dòng (chỉ cột đầu, vd file ⬇ CSV của bảng giá).
  Mã không có trong danh bạ VPS bị chuyển sang "Bỏ qua", tối đa 300 mã; nhập = thay danh mục (↶ Khôi phục được).

## 5. Data model

`QuoteModel.quote(row)` ⇒ `{ sym, ex, type, ceil, floor, ref, bids[3], asks[3] ({p, v}), last, lastVol, chg, pct, totVol, open, high, low, avg, fBuy, fSell, room, cw }`
(map field VPS: `c f r lastPrice lastVolume lot g1–g3 (mua) g4–g6 (bán) "giá|KL|màu" openPrice highPrice lowPrice avePrice fBVol fSVolume fRoom sType CW*`).
`QuoteModel.index(row)` ⇒ `{ name, value, ref, chg, pct, vol, valueMil, up, down, same, time }` (`ot` = `chg|pct%|giá trị triệu đồng|tăng|giảm|đứng`).

## 6. Module & luồng

```text
model/  watchlist-symbol-parser (WatchParse) · quote-price-model (QuoteModel) · board-columns-and-format (Fmt, BoardCols) · intraday-chart-svg (ChartSvg)   ← thuần, có test node
data/   vps-datafeed-client (Feed, Universe)
        chart-ranges-and-resample (ChartRange) · technical-indicators-trend-and-bands + technical-indicators-oscillators (TA) · indicator-catalog (Indicators)
data/   + vndirect-ohlc-history-client (History)
lib/    lightweight-charts-5.2.1.standalone.production.js (+ LICENSE)
ui/     watchlist-store (Prefs, Watch) · board-table-view (BoardView) · index-strip-view (IndexStrip) · symbol-detail-view (DetailView)
        technical-chart-view (TechChart) · technical-chart-drawing-tools (ChartDraw) · technical-chart-toolbar (ChartBar) · technical-chart-controller (ChartCtl)
        board-share-link-and-demo (ShareDemo) · board-app (Board: state + poll) · board-controls (Controls: DOM, status, start)
```

`Controls.start` → đọc hash/`?data`/`?demo`/`?tab` → `Board.setTab` → `symbolsFor(tab)` → `tick()` (quotes + chỉ số song song) → `BoardView.render`
(cùng tập mã ⇒ chỉ đổi ô có chữ khác + flash, đổi thứ tự bằng di chuyển `<tr>`) → `IndexStrip.render` → `DetailView` → `schedule()`.
Test: `node --test src/vn-stock-price-board/tests/*.test.js` (model + phủ từ điển EN).

## Điện thoại

- ≤ 640px: carousel 2 pane **Bảng giá · Chi tiết mã**; chạm 1 hàng (trừ ô ☆) ⇒ tự sang pane Chi tiết; link chia sẻ có `sym` cũng mở pane Chi tiết.
- Cột ☆ + Mã ghim trái khi cuộn ngang bảng; toolbar cuộn ngang, `★ Thêm` ghim trái; màn ≤ 700px cao ẩn sparkline chỉ số.
- Cửa sổ desktop thấp (≤ 600px) và điện thoại ngang: trang cuộn, pane cao 85dvh. Không có thao tác chỉ-hover; ↑/↓ chọn mã chỉ có ở bàn phím.
- Chart lớn: toàn màn hình, thanh công cụ + chip chỉ báo cuộn ngang, legend chỉ hiện dòng OHLC; kéo / chụm 2 ngón để cuộn / phóng to; vẽ bằng chạm.
- Đã kiểm headless ma trận `1440×900 · 1024×768 · 800×700 · 1200×480 · 320×568 · 390×844 · 430×932 · 844×390 · 568×320`; chưa kiểm trên máy iOS/Android thật.

## 7. Giới hạn

- API **không chính thức**: VPS đổi định dạng/chặn CORS là tool trống (báo "Mất kết nối tới VPS"). Không có SLA, có thể trễ vài giây.
- Không gzip: HOSE ~390 KB/lần poll, UPCOM ~850 KB, lịch sử khớp 1 mã thanh khoản cao tới ~3,5 MB.
- Sparkline chỉ số chỉ có điểm từ lúc mở trang (feed không có lịch sử chỉ số trong ngày); mở sau giờ ⇒ đường thẳng TC → đóng cửa.
- Nến lịch sử: ngày từ 2013-01 ("Tất cả" = toàn bộ), phút từ ~2021-11 và thưa ngoài vài tháng; VNDirect chặn User-Agent `HeadlessChrome` (403).
- Không biết ngày nghỉ lễ (phiên tính theo đồng hồ). Thanh chỉ số chỉ có 4 mã đã xác minh (`10` VNINDEX, `11` VN30, `02` HNX, `03` UPCOM); mã `12`, `20`–`26` chưa rõ là chỉ số nào nên chưa hiện.
