// English for the advice backtest section.
I18n.add({
  "Kiểm chứng quá khứ": "Backtest", "phát lại khuyến nghị trên lịch sử, không nhìn trước tương lai": "replays the advice over history without looking ahead",
  "▶ Kiểm chứng quá khứ": "▶ Run backtest", "▶ Chạy lại kiểm chứng": "▶ Run backtest again",
  "Đang tải nến lịch sử…": "Loading candle history…", "Đang phát lại lịch sử… {p}%": "Replaying history… {p}%",
  "Chưa đủ lịch sử giá (cần ≥ 310 nến ngày) để kiểm chứng.": "Not enough price history (≥ 310 daily candles needed) to backtest.",
  "Không chạy được kiểm chứng.": "Could not run the backtest.", "Đã chạy {n} lần phát lại trong {s} giây.": "Replayed {n} points in {s} s.",
  "Chốt lời": "Take profit", "Hết hạn giữ": "Time exit", "Khuyến nghị mua (mô phỏng / tổng)": "Buy calls (simulated / total)", "vào lệnh {n} lần ({p}%)": "entered {n} times ({p}%)",
  "Tỷ lệ thắng": "Win rate", "{n} lệnh có lãi sau phí": "{n} trades profitable after fees", "Lãi trung bình / lệnh": "Average return / trade",
  "lệnh tệ nhất {w}": "worst trade {w}", "Lãi gộp các lệnh": "Compounded return", "mua & giữ cùng kỳ {b}": "buy & hold, same period {b}",
  "Sụt giảm tối đa": "Max drawdown", "chuỗi lệnh nối tiếp": "of the trade sequence", "Thời gian giữ trung bình": "Average holding time", "{d} ngày": "{d} days",
  "chốt lời {a} · dừng lỗ {b} · hết hạn {c}": "target {a} · stop {b} · time {c}",
  "chưa có lần nào chạm vùng mua": "price never reached the buy zone", "chưa có khuyến nghị mua nào": "no buy call in this period",
  "Khuyến nghị bán": "Sell calls", "giá thấp hơn sau {w} ngày: {p}% số lần (thay đổi TB {m})": "price lower after {w} days: {p}% of the time (average move {m})",
  "Trung lập (chờ)": "Neutral (wait)", "Chưa kết thúc": "Unresolved", "bỏ qua vì dữ liệu chưa đủ để chốt kết quả": "skipped: not enough data after the call to settle the result",
  "Lệnh gần nhất ({n})": "Latest trades ({n})", "Vào": "Entry", "Giá vào": "Entry price", "Giá ra": "Exit price", "Kết thúc": "Exit", "Lãi / lỗ": "P / L",
  "Quy tắc: khuyến nghị mua → chờ giá chạm vùng mua trong {a} / {b} / {c} ngày (ngắn / trung / dài hạn), vào ở giá thấp hơn của giá mở cửa và đỉnh vùng mua; thoát khi chạm dừng lỗ hoặc vùng bán, nếu không thì sau {d} / {f} / {g} ngày. Nến vừa vào lệnh chỉ xét dừng lỗ; cùng nến chạm cả dừng lỗ và mục tiêu tính là dừng lỗ; gap qua mức thì khớp ở giá mở cửa. Phí {x}% mỗi chiều, không tính trượt giá, mỗi lệnh dùng toàn bộ vốn và các lệnh không chồng nhau.":
    "Rules: buy call → wait for price to reach the buy zone within {a} / {b} / {c} days (short / medium / long term), fill at the lower of the open and the top of the zone; exit at the stop or the sell zone, otherwise after {d} / {f} / {g} days. The entry candle only checks the stop; a candle touching both stop and target counts as the stop; a gap through a level fills at the open. Fee {x}% per side, no slippage, each trade uses the full capital and trades do not overlap.",
  "Khuyến nghị bán: so giá đóng cửa sau {a} / {b} / {c} ngày với giá lúc khuyến nghị (các lần có thể chồng nhau; “có thể hồi kỹ thuật” tính là trung lập). Ngắn / trung hạn phát lại mỗi ngày trong ~2 năm gần nhất, dài hạn mỗi tuần trên toàn bộ lịch sử nến ngày ({n} nến). Chỉ dùng nến đã đóng tại thời điểm đó; bỏ qua funding, Fear & Greed, xu hướng BTC và thanh khoản. Quy tắc theo kỹ thuật, quá khứ không đảm bảo tương lai, không phải lời khuyên đầu tư.":
    "Sell calls: compare the close after {a} / {b} / {c} days with the price at the call (calls may overlap; “bounce possible” counts as neutral). Short / medium term are replayed daily over roughly the last 2 years, long term weekly over the whole daily history ({n} candles). Only candles already closed at that moment are used; funding, Fear & Greed, BTC trend and liquidity are ignored. Rule-based on technicals, past results do not guarantee the future, not investment advice."
});
