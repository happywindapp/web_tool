// English strings of the FIX Message detail pane (lazy bundle), keyed by the Vietnamese source text.
I18n.add({
  "Không thấy message FIX nào — cần dòng có 8=FIX… hoặc các cặp tag=value có 35=.": "No FIX message found — needs a line with 8=FIX… or tag=value pairs with 35=.",
  "{n} message · {e} lỗi · {w} cảnh báo · từ điển {dict}.": "{n} messages · {e} errors · {w} warnings · {dict} dictionary.",
  "Chỉ hiện {n} message đầu.": "Only the first {n} messages are shown.", "Bỏ qua {n} dòng không phải FIX.": "Skipped {n} non-FIX lines.",
  "Server Sàn": "Exchange server", "✔ Đã chép.": "✔ Copied.", "Message trước": "Previous message", "Message kế": "Next message",
  "◫ 3 vùng": "◫ 3 panes", "◫ 3 vùng: bật": "◫ 3 panes: on",
  "▥ 3 cột": "▥ 3 columns", "▥ 3 cột: bật": "▥ 3 columns: on",
  "3 cột cạnh nhau: dữ liệu · danh sách message · chi tiết (màn hình rộng hơn 900px; hẹp hơn thì xếp như 3 vùng; bấm lại để tắt)": "3 side-by-side columns: data · message list · detail (screens wider than 900px; narrower ones stack like 3 panes; click again to turn off)",
  "Chia 3 vùng như FIX Parser: dữ liệu + danh sách message ở view nguồn, chi tiết ở view này (bấm lại để tắt)": "3 panes like FIX Parser: data + message list in the source view, the detail in this view (click again to turn off)",
  "FIX · {n} message · {dict} — bấm 1 dòng để xem chi tiết": "FIX · {n} messages · {dict} — click a row for its detail",
  // Message list (same wording as FIX Parser's panel 2)
  "Mọi loại message": "All message types", "{shown}/{total} message": "{shown}/{total} messages", "Bỏ lọc chuỗi": "Clear chain filter",
  "Tìm: chữ bất kỳ hoặc tag=giá trị (35=8 55=ABC)": "Search: any text or tag=value (35=8 55=ABC)",
  "Ẩn session": "Hide session", "Heartbeat, TestRequest, ResendRequest, SequenceReset, Logout, Logon": "Heartbeat, TestRequest, ResendRequest, SequenceReset, Logout, Logon",
  "Ẩn broadcast h/f": "Hide h/f broadcasts", "Chỉ message lỗi": "Only messages with issues",
  "TradingSessionStatus (h) và SecurityStatus (f) — Server Sàn gửi hàng nghìn bản mỗi ngày": "TradingSessionStatus (h) and SecurityStatus (f) — the exchange server sends thousands of them a day",
  "Chọn 1 chuỗi lệnh (đặt → xác nhận → sửa/huỷ → khớp) hoặc 1 lệnh cha 🌳 (kèm mọi lệnh con nối qua 583 / tag link của từ điển riêng) để chỉ xem các message đó": "Pick an order chain (new → ack → replace/cancel → fill) or a parent order 🌳 (with every child linked by 583 / custom-dictionary link tags) to see only those messages",
  "↺ Cột": "↺ Columns",
  "Đưa thứ tự cột về mặc định (kéo-thả tiêu đề cột để đổi thứ tự, bấm tiêu đề để lọc, chuột phải vào ô để chỉ hiện / loại trừ giá trị)": "Reset column order (drag a header to reorder, click a header to filter, right-click a cell to only show / exclude its value)",
  "⬇ CSV": "⬇ CSV", "⬇ JSON": "⬇ JSON", "Tải bảng đang lọc thành CSV (mở bằng Excel)": "Download the filtered table as CSV (opens in Excel)",
  "Tải các message đang lọc thành JSON (tag, tên, giá trị, ý nghĩa)": "Download the filtered messages as JSON (tag, name, value, meaning)",
  "Theo chuỗi lệnh": "Follow order chain", "Theo lệnh cha + con": "Follow parent + child orders",
});
