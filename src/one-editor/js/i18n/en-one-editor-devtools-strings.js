// English strings for phase 8c (dev text tools: JWT, URL, escape, UUID, epoch, number bases, hover, local history), keyed by the Vietnamese source text.
I18n.add({
  // Ops, demos, commands
  "Công cụ dev": "Dev tools", "JWT decode (không kiểm chữ ký)": "JWT decode (signature not verified)", "URL → thành phần + bảng query": "URL → parts + query table",
  "URL → bảng tham số query": "URL → query parameter table", "Epoch · hex · ngày giờ (rê chuột lên số)": "Epoch · hex · dates (hover a number)",
  "JWT: giải mã ở view kia (không kiểm chữ ký)": "JWT: decode in the other view (signature not verified)",
  "URL: tách thành phần + bảng tham số query ở view kia": "URL: parts + query parameter table in the other view",
  "Chuỗi: JSON escape (vùng chọn hoặc cả tab)": "String: JSON escape (selection or whole tab)", "Chuỗi: JSON unescape (vùng chọn hoặc cả tab)": "String: JSON unescape (selection or whole tab)",
  "Chèn UUID v4 (mỗi con trỏ 1 UUID)": "Insert UUID v4 (one per cursor)", "Chèn epoch hiện tại (giây)": "Insert current epoch (seconds)",
  "Chèn epoch hiện tại (mili giây)": "Insert current epoch (milliseconds)", "Chèn ngày giờ hiện tại (ISO, UTC)": "Insert current date-time (ISO, UTC)",
  "Epoch ⇄ ngày giờ ISO (UTC) ở con trỏ / vùng chọn": "Epoch ⇄ ISO date (UTC) at the cursor / selection",
  "Epoch ⇄ ngày giờ ISO (giờ máy) ở con trỏ / vùng chọn": "Epoch ⇄ ISO date (local time) at the cursor / selection",
  "Số: đổi sang hex (0x…)": "Number: to hex (0x…)", "Số: đổi sang thập phân": "Number: to decimal", "Số: đổi sang nhị phân (0b…)": "Number: to binary (0b…)",
  "Bật / tắt tooltip quy đổi số / timestamp khi rê chuột": "Toggle the number / timestamp conversion tooltip on hover",
  "Lịch sử cục bộ: so sánh / khôi phục bản đã lưu…": "Local history: compare / restore a saved version…", "Lịch sử cục bộ: chụp bản ngay": "Local history: take a snapshot now",
  "Lịch sử cục bộ: khôi phục bản đang so sánh vào tab gốc": "Local history: restore the compared version into the original tab",
  "Lịch sử cục bộ: xoá lịch sử của tab": "Local history: delete this tab's history",
  // Actions, errors
  "Tab chỉ đọc — không đổi được.": "Read-only tab — cannot change it.",
  "Đặt con trỏ vào một số / ngày giờ, hoặc bôi đen phần cần đổi.": "Put the cursor on a number / date, or select what to convert.",
  "✔ Đã đổi {n} chỗ — Ctrl+Z để hoàn tác.": "✔ Changed {n} place(s) — Ctrl+Z to undo.",
  "Tooltip quy đổi số / timestamp: bật.": "Number / timestamp tooltip: on.", "Tooltip quy đổi số / timestamp: tắt.": "Number / timestamp tooltip: off.",
  "Không phải epoch (10 / 13 chữ số, năm 2000–2099) hay ngày giờ ISO: “{s}”.": "Not an epoch (10 / 13 digits, years 2000–2099) or an ISO date: “{s}”.",
  "Không có số nguyên nào để đổi.": "No integer to convert.", "Chuỗi escape lỗi: {msg}": "Invalid escaped string: {msg}",
  "URL không hợp lệ: “{s}”.": "Invalid URL: “{s}”.", "Không thấy URL hay query string (a=1&b=2) ở dòng đầu của tab.": "No URL or query string (a=1&b=2) on the first line of the tab.",
  "Phần {name} của JWT không phải Base64URL hợp lệ.": "The JWT {name} is not valid Base64URL.", "Phần {name} của JWT không phải JSON: {msg}": "The JWT {name} is not JSON: {msg}",
  "Không thấy JWT (dạng eyJ….….…) trong tab.": "No JWT (eyJ….….…) in the tab.",
  "JWT chỉ được giải mã trên máy — chữ ký KHÔNG được kiểm.": "The JWT was only decoded on this device — the signature was NOT verified.",
  // Hover, report pane
  "Giờ máy": "Local time", "Tương đối": "Relative", "Epoch giây": "Epoch seconds", "Epoch mili giây": "Epoch milliseconds", "Ngày giờ (không ghi múi giờ = UTC)": "Date-time (no time zone = UTC)", "Số": "Number",
  "JWT · {alg} · chữ ký chưa kiểm": "JWT · {alg} · signature not verified",
  "Chỉ giải mã — chữ ký KHÔNG được kiểm (không có khoá). Đừng tin payload khi server chưa verify; đừng để token thật trong ghi chú / link chia sẻ.":
    "Decoded only — the signature is NOT verified (no key here). Don't trust the payload until the server has verified it; don't keep real tokens in notes / share links.",
  "Thời hạn": "Validity", "Chữ ký": "Signature", "Độ dài": "Length", "{n} byte": "{n} bytes", "Đã kiểm": "Verified", "Không — cần khoá bí mật / khoá công khai ở server": "No — needs the secret / public key on the server",
  "✖ Đã hết hạn": "✖ Expired", "✔ Còn hạn": "✔ Not expired", "✖ Chưa có hiệu lực": "✖ Not valid yet", "✔ Đã có hiệu lực": "✔ Valid",
  "URL · {n} tham số": "URL · {n} parameters", "Thành phần": "Parts", "Tham số query": "Query parameters", "Khoá": "Key", "Giá trị": "Value", "(không có)": "(none)",
  "⧉ Chép JSON": "⧉ Copy JSON", "Chép nội dung tab (JSON) vào clipboard": "Copy the tab content (JSON) to the clipboard", "✔ Đã chép JSON.": "✔ JSON copied.",
  "Một tab mới hơn của One Editor đã nâng cấp dữ liệu — tải lại trang này (F5) để lưu tiếp.": "A newer One Editor tab upgraded the stored data — reload this page (F5) to keep saving.",
});
