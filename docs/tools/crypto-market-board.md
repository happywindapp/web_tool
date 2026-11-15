# Tool: Bảng giá Crypto & On-chain

> File: [`tools/crypto-market-board.html`](../../tools/crypto-market-board.html) — **file sinh ra** từ
> [`src/crypto-market-board/`](../../src/crypto-market-board/) bằng `pwsh scripts/build-single-file-tool.ps1 -Tool crypto-market-board` (ADR #7).
> Ngoại lệ gọi mạng: ADR #16 (chỉ GET / WebSocket dữ liệu công khai). Luật chung: `docs/architecture/`, `docs/decisions/`.

## 1. Mục đích

Bảng giá + phân tích thị trường tiền mã hoá trong 1 file HTML, gom tính năng chính của các tool tham khảo: giá realtime (Binance),
top vốn hoá / heatmap / ngành (CoinGecko, Messari), DeFi + doanh thu protocol (DeFiLlama, Token Terminal), chỉ báo chu kỳ BTC
(LookIntoBitcoin, Glassnode), phái sinh (CryptoQuant, Coinglass), ví + cá voi BTC (Arkham, Nansen). Không đăng nhập, không đặt lệnh.
Review chi tiết: `plans/reports/research-261115-0026-crypto-analytics-tools-review.md`.

## 2. Tính năng

| Tab | Nội dung | Nguồn |
|-----|----------|-------|
| ★ Danh mục | Bảng realtime (WebSocket), vốn hoá, 1h/24h/7d, sparkline 7d; **vị thế** (số lượng, giá vốn → giá trị, lãi/lỗ, thanh phân bổ) | Binance, CoinGecko |
| Thị trường | Thị phần vốn hoá, **Altcoin Season** 30 ngày, Fear & Greed 30 ngày, **gợi ý mua / bán** ngắn · trung · dài hạn, heatmap top 50/100/200 (24h/7d, ô ghi % thị phần), nhóm ngành + xem coin trong nhóm, trending, top tăng/giảm/KL | CoinGecko, Binance, alternative.me |
| Top 100 · Top 250 | Hạng, giá, 1h/24h/7d/30d, vốn hoá, FDV, KL, % đã lưu hành, % từ ATH (kiểu trang chủ CoinMarketCap) | CoinGecko (+ giá live Binance) |
| Trending | Thanh lọc: Đang hot (CoinGecko trending) · Tăng mạnh 24h · Giảm mạnh 24h · Biến động mạnh 1 giờ · KL / vốn hoá cao (trong top 250, bỏ stablecoin, KL ≥ $1M) | CoinGecko |
| Exchanges | Xếp hạng sàn kiểu CoinMarketCap: trust score, KL spot 24h, **tài sản dự trữ**, **dòng tiền ròng vào/ra sàn 24h/7d/30d**, OI phái sinh, token sàn, năm, quốc gia; tìm, sort | CoinGecko `/exchanges` + DeFiLlama `/cexs` |
| Mạng lưới | Chọn hệ sinh thái (Ethereum, BNB Chain, Solana, Base, Arbitrum, Polygon, Avalanche, Tron, Sui, TON, Optimism, Hyperliquid, Aptos, NEAR, Cardano, Cosmos, Bitcoin) → top 250 coin của mạng | CoinGecko category |
| Spot Binance | Toàn bộ cặp USDT, realtime `!miniTicker@arr` | Binance |
| Phái sinh | Mọi hợp đồng vĩnh cửu USDT: mark, funding 8h + năm hoá, mark − index, đếm ngược funding | Binance Futures (15s) |
| DeFi & Doanh thu | TVL tổng + lịch sử, chains, giao thức, **Doanh thu (P/F, P/S)**, DEX, stablecoin | DeFiLlama |
| Bitcoin On-chain | Trạng thái mạng (halving, độ khó, phí, hashrate), nhiệt kế chu kỳ, 11 chart: Rainbow, 200W MA, Pi Cycle, Mayer, Golden Ratio, Puell, S2F, halving cycles, drawdown, hash ribbons, F&G | blockchain.info, mempool.space |
| Ví BTC & cá voi | Tra địa chỉ BTC, sổ địa chỉ tự gắn nhãn (import/export JSON), luồng giao dịch cá voi realtime | mempool.space, WS blockchain.info |

Pane **Chi tiết coin**: Tổng quan (biên độ 24h, tokenomics, ATH/ATL, hiệu suất, nhận định nhanh FDV/thanh khoản, form vị thế) ·
Kỹ thuật (Lightweight Charts dùng chung với Bảng giá CK: khoảng 1 ngày · 1 tuần · 1 tháng · 3 tháng · 1/3/5/10 năm · Tất cả × nến 1m → 1M (tối đa 5.000 nến + 250 nến khởi động chỉ báo), 6 kiểu, 17 chỉ báo chọn bằng **checkbox** (đang hiện = được tick; dòng đầu **Đánh dấu Đỉnh / Đáy** bật/tắt nhãn đỉnh–đáy trên biểu đồ giá, mặc định tắt; **Điểm giao cắt quan trọng** chấm tại chỗ các đường cắt nhau (MA, giá × MA dài, MACD, RSI/Stoch vào–ra vùng, +DI/−DI, Tenkan/Kijun, SAR…), rê chuột vào chấm để xem giải thích, mặc định bật — dùng chung `ChartCrosses` / `ChartCrossUI` với bảng giá chứng khoán; mỗi dòng có mô tả ngắn; 5 chỉ báo quan trọng SMA · EMA · Bollinger · RSI · MACD tô vàng + ★ và xếp đầu nhóm; nút **?** mở hướng dẫn chi tiết: đo gì, công thức, cách đọc, hình minh hoạ vẽ từ dữ liệu giả lập bằng đúng code `Indicators` với các điểm tín hiệu đánh số, ví dụ số liệu crypto, cách phối hợp, lưu ý crypto, nút bật/tắt trên biểu đồ — nội dung ở `IND_GUIDE`), so sánh 3 coin, công cụ vẽ, PNG, nến live qua WS + nhận định `TechOutlook` 1h/4h/1D) ·
**Khuyến nghị** (`CoinAdvice` + `AdviceView`: 3 khung Hôm nay/ngắn hạn · Trung hạn · Dài hạn, mỗi khung có hành động, thời điểm mua/bán, vùng mua, vùng bán/chốt lời, dừng lỗ, lời:lỗ, xác suất lịch sử; điểm từ `TechOutlook` trên nến 4h/ngày/tuần, vùng giá từ pivot · MA50/MA200/MA40 tuần · đỉnh–đáy 20 ngày/52 tuần · dải biến động 1 năm ± ATR; mục "Khuyến nghị quan trọng khác": tỷ trọng theo ATR, MA200, RSI, cách đỉnh, funding, Fear & Greed, xu hướng BTC, thanh khoản, DCA; stablecoin không khuyến nghị) · Sổ lệnh (depth 15 mức + khớp lệnh realtime, tỷ lệ mua chủ động) · Phái sinh (OI, funding lịch sử, long/short, top trader, taker + diễn giải) · Hồ sơ (CoinGecko).
Header: 🔔 cảnh báo giá (giá ≥/≤, % 24h; thông báo trình duyệt), 🧮 công cụ (DCA backtest, quy đổi coin ↔ USD ↔ VND, giá thanh lý Futures, khối lượng theo rủi ro).

## 3. Contract (đổi là breaking)

- **Nguồn** (CSP `connect-src`, chỉ GET + WS): `api.binance.com` (dự phòng `data-api.binance.vision`), `wss://stream.binance.com:9443` (dự phòng `data-stream.binance.vision`),
  `fapi.binance.com`, `api.coingecko.com`, `api.llama.fi`, `stablecoins.llama.fi`, `mempool.space`, `api.blockchain.info`, `wss://ws.blockchain.info`, `api.alternative.me`.
- **Tab** (`?tab=`): `watch` · `market` · `top100` · `top` · `trending` · `exchanges` · `network` · `spot` · `futures` · `defi` · `onchain` · `wallet`. Tab chi tiết: `overview` · `chart` · `book` · `deriv` · `profile`.
- **Ngoại lệ có chủ đích với checklist "Dữ liệu mẫu"**: **không** có dropdown `Thử mẫu…` trên toolbar (user yêu cầu bỏ 2026-11-15, giống Bảng giá CK); dữ liệu mẫu chỉ qua `?demo=<key>` — đừng thêm lại dropdown.
- **`?demo=`**: `majors` · `layer1` · `layer2` · `defi` · `meme` · `ai` · `futures` (mở tab Phái sinh + chi tiết phái sinh BTC) · `broken` (token sai `NOT-A-COIN`, `12345`, `??` + mã không tồn tại `ZZZQQQ` ⇒ footer báo lỗi). Mẫu thay danh mục, giữ bản cũ cho `↶ Khôi phục danh mục trước`.
- **Link chia sẻ** `#pako:` payload `{ tab, watch: [mã], opts: { rate, cur, pos, spark }, sort: { key, dir }, sym, dtab, chart: { range, interval, type, scale, volume, ind: [{ id, p }], cmp } }` — **không** kèm vị thế/cảnh báo.
  `?data=BTC,ETH` = danh mục thô (đi lên server, chỉ dữ liệu ngắn). Payload không tin cậy: mã `^[A-Z0-9]{1,15}$` (≤ 200), tab/sort/option chỉ nhận giá trị đã biết.
- **Nhập mã**: không phân biệt hoa thường, bỏ `$`, bỏ hậu tố cặp (`BTCUSDT`, `ETH/USDT`, `SOL-USD`).
- **File**: export `danh-muc-crypto-<yyyy-mm-dd>.json` `{ app: "crypto-market-board", version: 1, watch, holdings, alerts }`; import JSON đó hoặc TXT/CSV (cột đầu). CSV bảng: `bang-gia-crypto-<tab>-<ngày>.csv`, UTF-8 BOM.
- **localStorage** `web_tool.crypto-market-board.*`: `watch`, `watchBackup`, `lists`, `opts`, `tab`, `sel`, `dtab`, `theme`, `chart`, `holdings`, `alerts`, `deriv.period`, `mk.*` (gồm `mk.hz` khung gợi ý), `net`, `trend`, `ex.sort`, `defi.*`, `onchain.*`, `wallet.*`.
  sessionStorage `…http:<url>` = cache phản hồi CoinGecko (giảm gọi lại khi F5).

## 4. Luật nghiệp vụ

- Giá hiển thị: tick Binance nếu có cặp USDT **và** lệch CoinGecko < 15% (chặn 2 coin trùng ticker); không có cặp ⇒ giá CoinGecko (2 phút). Vốn hoá/FDV co giãn theo giá live.
- VND = USD × giá USDT/VND của CoinGecko; chưa tải được tỷ giá thì vẫn hiện USD.
- Funding màu: > 0,03%/8h đỏ (Long đông), < 0 xanh. Altcoin Season: % top 50 (bỏ stablecoin, token bọc) có % 30 ngày > BTC; ≥ 75 mùa altcoin, ≤ 25 mùa Bitcoin.
- Cảnh báo kích hoạt 1 lần rồi chờ "Bật lại"; tab ẩn > 30 s ⇒ giá lấy REST 60 s/lần.
- **Gợi ý mua / bán** (`CoinPicks`, có test): top 60 coin có cặp USDT Binance (bỏ stablecoin, token bọc), nến ngày 400 phiên → điểm `TechOutlook` ngày + tuần, RSI, giá / MA200, cách ATH, FDV / vốn hoá. Ngắn hạn: điểm ngày ≥ 15 & RSI < 70 hoặc quá bán khi tuần còn tăng (bán: điểm ngày ≤ −15 trừ ca quá bán, hoặc RSI ≥ 75). Trung hạn: điểm tuần ≥ 15 (bán ≤ −15). Dài hạn "giá tốt": top 100, ≤ −40% ATH, giá ≤ 1,2 × MA200, FDV < 2 × vốn hoá; "giá cao": giá ≥ 1,8 × MA200, sát ATH khi > 1,3 × MA200, hoặc FDV ≥ 3 × khi dưới MA200. Mỗi bên 6 coin, cache 15 phút.
- Mọi nhận định (kỹ thuật, chu kỳ, phái sinh, tokenomics, gợi ý mua/bán) là luật kinh nghiệm, ghi rõ "không phải lời khuyên đầu tư".

## 5. Module & luồng

`Live` (WS manager: SUBSCRIBE/UNSUBSCRIBE động, snapshot REST cho cặp mới, fallback poll khi WS chết/tab ẩn) → `Coins.row(sym)` (gộp Binance + CoinGecko) →
`Board` (tab, bảng, đồng bộ cặp cần theo dõi) → `BoardView` (flash ô) · `Strip` · `DetailView`/`DetailTabs`. Tab phân tích theo contract `{ id, label, wide, mount(el), unmount(), relabel() }`:
`MarketView`, `DefiView`, `OnchainView`, `WalletView`; phần tử `data-coin="SYM"` mở coin ở pane chi tiết.
Bảng Top 100 / Trending / Mạng lưới lấy danh sách mã từ `TabSources` (kèm thanh lọc `#subBar`); coin ngoài top 250 được ghi vào `Coins.addExtra` để pane chi tiết vẫn có giá. Module thuần có test: `Fmt`, `CoinParse`, `AlertRule`, `Pnl`, `Calc`, `BoardCols`, `WatchFile`, `MarketMath`, `CoinPicks`, `BtcCycle`, `DefiMetrics`, `BtcFlow` —
`node --test src/crypto-market-board/tests/<file>.test.js` (truyền từng file). Tái dùng từ Bảng giá CK: `TechChart` (thêm `setPriceFormat`), `Indicators`, `TA`, `TechOutlook`, `ChartEvents`, `ChartHelp`, `ChartDraw`, `Mkt.treemap`.

## 6. Điện thoại

≤ 640px: carousel 2 pane `Bảng giá | Chi tiết coin`; bấm dòng ⇒ tự sang pane chi tiết. Tab phân tích chiếm pane đầu (desktop > 900px: toàn chiều rộng).
Chart picker On-chain thành `<select>`. Không có thao tác chỉ-hover; kéo-thả chỉ ở chart (chạm/pinch được). Đã kiểm headless 320×568, 390×844, 844×390, 800×700, 1200×480, 1440×900 — chưa kiểm trên máy thật.

## 7. Giới hạn

- API không chính thức/miễn phí: CoinGecko public giới hạn tần suất (429 không kèm CORS ⇒ tool coi lỗi mạng là bị giới hạn, nghỉ 60 s, dùng bản cache); Binance chặn một số vùng (tự sang mirror).
- Tab Doanh thu lần đầu tải ~21 MB JSON thô (nén khi truyền); Spot Binance nhận ~mọi ticker mỗi giây.
- Không có MVRV/SOPR/exchange flow (cần key trả phí), không có ví ETH, không tải logo (CSP `img-src data:`). Tổng BTC cá voi gồm cả tiền thối (không phân biệt change).
