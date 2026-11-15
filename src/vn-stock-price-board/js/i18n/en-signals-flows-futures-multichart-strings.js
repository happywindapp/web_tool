// English for the backtest table, technical-signal alerts, "Dòng tiền" tab, futures tab, correlation dialog and the Full chart multi layout.
I18n.add({
  "Tín hiệu": "Signal", "Số lần": "Count", "Sau {n} phiên": "After {n} sessions", "Lần gần nhất": "Last seen", "Mọi phiên (tham chiếu)": "All sessions (baseline)",
  "tăng {p}%": "up {p}%", "Kiểm chứng tín hiệu (backtest {y} năm)": "Signal backtest ({y} years)",
  "Với mã này, tín hiệu đáng tin nhất là “{s}”: đúng hướng {w}% số lần sau 20 phiên ({n} lần).": "For this ticker the most reliable signal is “{s}”: right direction {w}% of the time after 20 sessions ({n} times).",
  "Chưa có tín hiệu nào đúng hướng ổn định (≥ 55% sau 20 phiên, ≥ 5 lần) với mã này — đừng dựa vào một tín hiệu đơn lẻ.": "No signal has been reliably right for this ticker (≥ 55% after 20 sessions, ≥ 5 times) — don't rely on a single signal.",
  "Dữ liệu ngày {a} – {b} · SMA 20/50, RSI 14, MACD 12-26-9, Stoch 14, ADX 14, SAR.": "Daily data {a} – {b} · SMA 20/50, RSI 14, MACD 12-26-9, Stoch 14, ADX 14, SAR.",
  "Ô = lãi / lỗ trung bình sau N phiên kể từ giá đóng cửa ngày có tín hiệu · % = tỷ lệ lần giá đi đúng hướng tín hiệu (xanh ≥ 60%, đỏ ≤ 40%, cần ≥ 5 lần). Chưa trừ phí, thuế; quá khứ không bảo đảm tương lai.":
    "Cell = average gain / loss N sessions after the close on the signal day · % = share of times price moved the signal's way (green ≥ 60%, red ≤ 40%, needs ≥ 5 times). Before fees and taxes; the past does not guarantee the future.",
  "Không có giao cắt nào trong giai đoạn này.": "No crosses in this period.",

  "Cảnh báo giá & tín hiệu kỹ thuật": "Price & technical-signal alerts", "Giá": "Price", "Tín hiệu kỹ thuật (nến ngày)": "Technical signals (daily candles)",
  "Giá cắt lên MA {v}": "Price crosses above MA {v}", "Giá cắt xuống MA {v}": "Price crosses below MA {v}", "RSI 14 vượt lên {v}": "RSI 14 rises above {v}", "RSI 14 xuống dưới {v}": "RSI 14 falls below {v}",
  "MACD cắt lên đường tín hiệu": "MACD crosses above its signal line", "MACD cắt xuống đường tín hiệu": "MACD crosses below its signal line",
  "Giá vào vùng mua hôm nay (tab Khuyến nghị)": "Price enters today's buy zone (Recommendations tab)", "Giá thủng dừng lỗ trung hạn (tab Khuyến nghị)": "Price breaks the medium-term stop (Recommendations tab)",
  "Tín hiệu kỹ thuật: so giá khớp hiện tại với giá đóng cửa hôm qua trên nến ngày — báo khi giao cắt xảy ra trong phiên hôm nay (MA = kỳ bạn nhập, RSI = ngưỡng bạn nhập).":
    "Technical signals compare the live price with yesterday's close on daily candles — they fire when the cross happens during today's session (MA = the period you enter, RSI = the level you enter).",

  "Dòng tiền": "Money flow", "Số phiên": "Sessions", "Sàn giao dịch": "Exchange", "Tất cả": "All", "Khối ngoại": "Foreign investors", "Tự doanh CTCK": "Proprietary trading (brokers)",
  "Ròng {n} tỷ · mua {b} tỷ · bán {s} tỷ": "Net {n} bn · bought {b} bn · sold {s} bn", "Top mua ròng (tỷ đồng)": "Top net buys (VND bn)", "Top bán ròng (tỷ đồng)": "Top net sells (VND bn)",
  "Tự doanh công bố sau phiên khoảng 1 ngày, chủ yếu cổ phiếu HOSE.": "Proprietary flows are published about 1 day after the session, mostly HOSE stocks.",
  "Đang tải dòng tiền {n} phiên (khoảng 3 MB)…": "Loading {n} sessions of flows (about 3 MB)…", "Đang tải dòng tiền {n} phiên…": "Loading {n} sessions of flows…",
  "Nguồn: VNDirect finfo, cuối ngày (không phải realtime). Bấm mã để xem chi tiết.": "Source: VNDirect finfo, end of day (not real time). Click a ticker for details.", "Không có dữ liệu.": "No data.",

  "Phái sinh": "Futures", "OI": "OI", "Basis": "Basis", "Đáo hạn": "Maturity", "HĐ mở (OI)": "Open interest", "Basis so với VN30": "Basis vs VN30",

  "Tương quan giá danh mục": "Watchlist price correlation", "3 tháng": "3 months", "6 tháng": "6 months", "1 năm": "1 year",
  "Các mã đi cùng nhau rất sát — danh mục tập trung rủi ro, nên thêm mã khác ngành.": "These tickers move closely together — the watchlist concentrates risk; consider other sectors.",
  "Mức tương quan trung bình — đa dạng hoá ở mức vừa.": "Moderate correlation — moderately diversified.", "Tương quan thấp — danh mục được đa dạng hoá tốt.": "Low correlation — well diversified.",
  "Tương quan trung bình giữa các mã: {r}.": "Average correlation between tickers: {r}.", "Bỏ qua (không đủ dữ liệu): {s}": "Skipped (not enough data): {s}",
  "Đi cùng nhau nhất": "Move together most", "Bù trừ nhau tốt nhất": "Best offsetting pairs",
  "Hệ số tương quan Pearson của % thay đổi giá ngày, chỉ tính các phiên cả hai mã cùng có giá (≥ {n} phiên): 1 = luôn cùng chiều, 0 = không liên quan, −1 = ngược chiều. Hàng / cột {b} cho biết mã đi theo thị trường chung đến mức nào.":
    "Pearson correlation of daily % price changes over sessions both tickers traded (≥ {n} sessions): 1 = always together, 0 = unrelated, −1 = opposite. The {b} row / column shows how closely each ticker follows the market.",
  "Cần ít nhất 2 mã trong ★ Danh mục để tính tương quan.": "Add at least 2 tickers to the ★ Watchlist to compute correlation.", "Đang tải giá {n} mã…": "Loading prices of {n} tickers…",
  "Không tải được dữ liệu giá (VNDirect). Thử lại sau.": "Could not load prices (VNDirect). Try again later.", "Chỉ tính {n} mã đầu tiên của danh mục.": "Only the first {n} watchlist tickers are used.",
  "Tương quan giá giữa các mã trong ★ Danh mục và VNINDEX": "Price correlation between ★ Watchlist tickers and VNINDEX", "🔗 Tương quan": "🔗 Correlation",

  "▢ 1 biểu đồ": "▢ 1 chart", "▥ 2 biểu đồ": "▥ 2 charts", "▦ 4 biểu đồ": "▦ 4 charts", "Bố cục: thêm biểu đồ phụ, mỗi ô tự chọn mã và khung nến": "Layout: add side charts, each with its own ticker and interval",
  "Mã hoặc chỉ số (để trống = mã đang xem)": "Ticker or index (empty = the ticker on screen)",
});
