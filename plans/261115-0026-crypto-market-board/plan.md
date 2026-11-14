# Plan — Crypto Market Board (`tools/crypto-market-board.html`)

Nguồn review: [research report](../reports/research-261115-0026-crypto-analytics-tools-review.md). Khuôn: `src/vn-stock-price-board/` (ADR #7, #13–#15).

## Kiến trúc
- `src/crypto-market-board/` → build `pwsh scripts/build-single-file-tool.ps1 -Tool crypto-market-board`.
- Tái dùng (`@include`): data-workbench core (I18n, ShareCodec, Dom, ThemePicker, PhoneLayout, base/app-bar/phone CSS);
  vn-stock-price-board: Lightweight Charts 5.2.1, `TA`, `Indicators`, `ChartEvents`, `ChartHelp`, `ChartRange.heikinAshi`, `TechChart`, `Mkt.treemap`, CSS chart/detail tabs.
- Sửa nhỏ tương thích ngược `technical-chart-view.js`: `TechChart.setPriceFormat(fn)` (giá crypto < 1 USD cần nhiều số lẻ).
- ADR #16: ngoại lệ gọi mạng cho Crypto board (chỉ GET/WS dữ liệu công khai).

## Phase
| # | Việc | Trạng thái |
|---|------|-----------|
| 1 | Nền: template, CSS, Fmt, fetch+cache, store (★, vị thế, cảnh báo), Binance REST + WS | ✅ |
| 2 | Bảng ★ Danh mục / Top 250 / Spot Binance / Phái sinh + thanh chỉ số toàn cầu | ✅ |
| 3 | Pane chi tiết: Tổng quan+tokenomics · Kỹ thuật · Sổ lệnh · Phái sinh · Hồ sơ | ✅ |
| 4 | Tab Thị trường (heatmap, ngành, trending, F&G) | ✅ |
| 5 | Tab DeFi & Doanh thu (DeFiLlama, P/F P/S) — agent song song | ✅ |
| 6 | Tab Bitcoin On-chain (chu kỳ, halving, hashrate) — agent song song | ✅ |
| 7 | Tab Ví BTC & cá voi — agent song song | ✅ |
| 8 | Công cụ: cảnh báo giá, DCA backtest, quy đổi, tính thanh lý; share link, demo, CSV, import/export | ✅ |
| 9 | Docs (tool doc, ADR, README, index card, project-context), test node, kiểm headless desktop+mobile, self-review | ✅ |

## Rủi ro
- CoinGecko public rate limit → cache, chu kỳ ≥ 120s, báo rõ khi 429.
- WS bị chặn ở một số mạng → tự fallback REST poll.
- API không chính thức có thể đổi → lỗi hiển thị rõ, tool tự thử lại.
