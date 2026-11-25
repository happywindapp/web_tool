# Khởi động One Editor chậm: text shaping emoji + compile script inline

**Triệu chứng:** One Editor sẵn sàng sau ~3,0–3,4 s ở CPU chậm 4× (đo 2026-11-24, sau phase 12), vượt mức cảnh báo ~2 s.

**Nguyên nhân (trace Chrome, thread CrRendererMain):**
- Layout ~1,5 s, trong đó `InlineNode::ShapeTextIncludingFirstLine` ~1 s dù chỉ ~170 layout object ⇒ chi phí **font fallback** (Windows tra font cho glyph không có trong "Segoe UI"), không phải do nhiều chữ.
  - Thay mọi emoji bằng "x": shaping giảm ~45% (~350–400 ms trong trace).
  - Khai báo sẵn `"Segoe UI Emoji"` trong `font-family`: không giảm.
  - Bỏ 70 option của dropdown `Thử mẫu…`: không giảm.
- Script inline 1,15 MB: compile ~450 ms + chạy ~660 ms (trace). Script inline **không** được V8 code cache.
- Điểm nóng JS nhỏ: sort `LangDetect.ids` bằng `localeCompare` (~70 ms self ở 4×), `I18n.num` gọi `toLocaleString` mỗi lần (~34 ms).

**Cách xử lý đúng:** muốn giảm thì nhắm emoji ở vùng luôn hiện (thanh hoạt động, toolbar) và compile script trước; tối ưu lặt vặt hàm boot chỉ được vài chục ms. Đo bằng puppeteer `page.tracing.start` + `Emulation.setCPUThrottlingRate 4`, cộng `dur` theo tên event; so cả bản HEAD cùng lúc vì máy dao động ±0,5 s.

**Cập nhật sau phase 13 (2026-11-25, đo N=5 CPU 4× bằng `cpu4-boot-trace.mjs`):**
- Đo riêng từng vùng thay emoji bằng `"x"`: `activity` tiết kiệm **−163 ms** `shapeMs`, `header` **−87 ms**, `toolbar` chỉ −5 ms, `explorer` +57 ms (dao động).
- Thay emoji ở thanh hoạt động (12 icon) + header (4 nút) + status bar (`btnKeys`, `stLint`) bằng Lucide SVG inline (`currentColor`, ADR #30), hoãn init panel ẩn sang `requestIdleCallback` (`typeable`), tối ưu `Intl.Collator`/`NumberFormat`/`I18n.apply` ⇒ `Layout` giảm **1.387 → 1.120 ms (−19,3%)**, `ShapeText` giảm **973 → 790 ms (−18,8%)**.

**Kết quả phase 13 (2026-11-25):** SVG Lucide thay emoji ở rail / header / status bar + hoãn init panel ẩn sang idle (class `typeable` trước `ready`) ⇒ gõ được sớm hơn ~10%, nhưng editor **hiện ra không sớm hơn** — chưa đạt ~2 s. Khi hoãn việc khởi động: đọc dữ liệu mà thao tác sớm có thể ghi đè (macro) phải nạp **trước** `typeable`; việc chờ mạng (folder link Drive / OneDrive) không được `await` trong chuỗi idle; bọc từng bước try/catch. Đo khi máy quá tải (CPU nền cao) thì kết quả chậm ~3× và nhiễu lớn hơn hiệu ứng ⇒ so xen kẽ HEAD / mới và chỉ đọc tương đối.
