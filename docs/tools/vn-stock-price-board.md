# Tool: Bảng giá chứng khoán

> File: [`tools/vn-stock-price-board.html`](../../tools/vn-stock-price-board.html) — **file sinh ra** từ
> [`src/vn-stock-price-board/`](../../src/vn-stock-price-board/) bằng `pwsh scripts/build-single-file-tool.ps1 -Tool vn-stock-price-board` (ADR #7).
> Ngoại lệ gọi mạng: ADR #13 (giá VPS) + ADR #14 (nến lịch sử VNDirect, thư viện Lightweight Charts). Luật chung mọi tool: `docs/architecture/`, `docs/decisions/`.

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
(API không có phân ngành — dùng mẫu danh mục theo ngành thay thế), phái sinh, lô lẻ, thoả thuận.

## 3. Contract (đổi là breaking)

- **Nguồn dữ liệu** (`Feed`, chỉ GET, CSP `connect-src https://bgapidatafeed.vps.com.vn`):
  `getlistckindex/<VN30|VN100|HNX30|hose|hnx|upcom|VNMID|VNSML|VNDIAMOND|VNFINLEAD|VNX50>` · `getliststockdata/<mã,…>` (tối đa 300 mã/request) ·
  `getlistindexdetail/10,11,02,03` · `getliststocktrade/<mã>` · `getlistallstock` (cache localStorage theo ngày VN — tên công ty, sàn, loại `S/E/W`).
- **Nến lịch sử** (`History`, CSP `connect-src https://dchart-api.vndirect.com.vn`): `dchart/history?resolution=<1|5|15|30|60|D>&symbol=&from=&to=` → `{t,o,h,l,c,v,s}`, cache 60s trong bộ nhớ.
- **Tab** (`?tab=`): `watch` (★ Danh mục) · `VN30` · `VN100` · `hose` · `hnx` · `HNX30` · `upcom` · `ETF` · `CW` + rổ khác `VNMID VNSML VNDIAMOND VNFINLEAD VNX50`.
- **`?demo=`**: `banks` · `brokers` · `realestate` · `materials` · `energy` · `consumer` · `broken` (có token sai `12`, `VN-30` + mã không tồn tại `XYZ`, `NOTREAL1` ⇒ footer báo lỗi). Mẫu thay danh mục, giữ bản cũ cho `↶ Khôi phục danh mục trước`.
- **Link chia sẻ** `#pako:` payload `{ tab, watch: [mã], opts: { rate, unit, hl, fr, compact }, sort: { key, dir }, sym, chart: { range, interval, type, scale, volume, compare, ind: [{ id, p }] } }`; `?data=VNM,FPT` = danh mục thô (đi lên server, chỉ dùng cho dữ liệu ngắn).
  Payload không tin cậy: mã phải khớp `^[A-Z0-9]{3,10}$` (tối đa 300), tab/sort/option chỉ nhận giá trị đã biết. Link hỏng ⇒ báo lỗi, giữ danh mục.
- **localStorage** (`web_tool.vn-stock-price-board.*`): `watch`, `watchBackup`, `opts`, `tab`, `theme`, `universe`, `chart`. sessionStorage `…spark` = điểm sparkline chỉ số trong ngày.
- **CSV**: `bang-gia-<tab>-<yyyymmdd>.csv` (EN `price-board-…`), UTF-8 BOM, cột = cột đang hiện.

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
