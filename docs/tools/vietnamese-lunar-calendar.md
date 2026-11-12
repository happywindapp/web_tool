# Lịch vạn niên — `tools/vietnamese-lunar-calendar.html`

> File **sinh ra** từ `src/vietnamese-lunar-calendar/` — sửa nguồn rồi `pwsh scripts/build-single-file-tool.ps1 -Tool vietnamese-lunar-calendar`.
> Test: `node --test src/vietnamese-lunar-calendar/tests/*.test.js`.

## 1. Người dùng & mục đích

Người Việt cần xem ngày âm, đổi ngày âm ↔ dương, chọn ngày/giờ tốt (cưới hỏi, khai trương, xuất hành), tra can chi, tiết khí, ngày lễ —
không quảng cáo, chạy offline, không gửi dữ liệu đi đâu.

## 2. Review công cụ tham khảo (2026-11)

| Trang | Điểm mạnh lấy theo | Điểm yếu tránh |
|-------|--------------------|----------------|
| lichngaytot.com | Chi tiết ngày đầy đủ nhất: giờ hoàng đạo kèm can chi + thần, trực (nên/kỵ), sao, tuổi xung ngày/tháng, Hỷ/Tài/Hắc thần, Khổng Minh, Lý Thuần Phong, ngũ hành ngày, tiết khí có giờ giao | Lịch chìm giữa 40–55k ký tự menu, tử vi, popup |
| 24h.com.vn | Lưới tháng gọn: dương to, âm nhỏ, mùng 1 dạng `1/10`, tên lễ thay can chi trong ô, tuần bắt đầu Thứ Hai | Chi tiết ngày sơ sài; nhiều quảng cáo |
| lichvannien365.com | Thần ngày ("Thiên Lao Hắc Đạo"), ngày lễ âm lịch | Chỉ tên chi cho giờ; có khối link cờ bạc |
| vnexpress.net/lich-van-nien | — | Render bằng JS, HTML tĩnh rỗng |

Đã đối chiếu thuật toán với trang ngày của lichngaytot (`/xem-ngay-tot-xau-DD-MM-YYYY`): 12/11/2026, 17/02/2026, 25/07/2025 (tháng 6 nhuận) khớp toàn bộ trường;
thêm 11 ngày kiểm Khổng Minh (nhóm tháng 2 và 3) + trực quanh ngày giao tiết Lập đông 2026. Các ca này nằm trong test.

## 3. Contract (đổi là breaking)

| Vào | Dạng |
|-----|------|
| Ô nhập / `?data=` | `12/11/2026`, `12-11-2026`, `2026-11-12` (dương) · `âm 15/8/2026`, `âm lịch: 15/8/2026`, `lunar 15/8/2026`, `al 15/8/2026` (âm) · tháng nhuận: `âm 1/6n/2025`, `âm 1/6 nhuận/2025`, `lunar 1/6leap/2025` |
| `?demo=<key>` | Tab Lịch: `tet`, `mid-autumn`, `leap`, `solar`, `term` · lỗi `bad-leap`, `bad-lunar`, `bad-solar`. Tab Tử vi: `horo-male`, `horo-before-tet`, `horo-late-hour`, `horo-no-hour` · lỗi `horo-bad-date`, `horo-bad-time`. Nạp rồi chạy, xoá `demo` khỏi URL |
| `?tab=` | `cal` (mặc định) hoặc `horo`; không có thì mở tab dùng lần trước |
| Link chia sẻ | `vietnamese-lunar-calendar.html#pako:<base64url(zlib(JSON))>`, payload tab Lịch `{ "date": "YYYY-MM-DD", "cc": bool }` (`cc` = hiện can chi trong ô); tab Tử vi `{ "tab": "horo", "name", "male": bool, "birth": "dd/mm/yyyy", "time": "HH:mm" hoặc "", "year": int }` — tên và ngày sinh nằm sau `#`, không lên server. Đọc thêm `#base64:`. `?data=` mang ngày thô (đi lên server — chỉ dùng cho chuỗi ngắn) |
| localStorage | `web_tool.lang` (chung), `web_tool.vietnamese-lunar-calendar.theme`, `…cc`, `…tab`. Không lưu tên / ngày sinh |

- Payload không tin cậy: chỉ đọc `date` (string, qua `DateText.parse`) và `cc` (boolean). Link hỏng ⇒ báo ở `#note`, không đổi ngày đang xem.
- Tool không có "bài đang soạn" nên không cần `↶ Khôi phục bản trước`: nạp link/mẫu chỉ đổi ngày được chọn.
- Ngày mở mặc định = hôm nay theo đồng hồ máy người dùng.

## 4. Luật nghiệp vụ / catalog

Mọi phép tính theo **giờ Việt Nam UTC+7** (không đổi theo múi giờ máy). Phạm vi năm 1800–2199.

| Mục | Luật | Module |
|-----|------|--------|
| Đổi dương ↔ âm | Thuật toán Hồ Ngọc Đức (sóc + trung khí, tháng 11 chứa Đông chí, tháng nhuận = tháng đầu không có trung khí). Giữ nguyên công thức kinh độ mặt trời độ chính xác thấp của bản gốc để khớp lịch VN đã in. Sửa 1 lỗi biên của bản gốc (ước lượng `k` lệch 2 tháng ⇒ ra ngày âm `0`, vd 13/04/1877, 07/05/2054). Tết 1985 VN = 21/01/1985 (khác TQ do UTC+7) | `LunarCal` |
| Can chi | Năm `(y+6)%10, (y+8)%12`; tháng âm `(12y+m+3)%10`, chi `(m+1)%12`, tháng nhuận dùng can chi tháng gốc; ngày `(jd+9)%10, (jd+1)%12`; can giờ Tý = `(can ngày % 5)·2` | `CanChi` |
| Nạp âm, ngũ hành ngày | 30 cặp nạp âm theo chỉ số lục thập hoa giáp; quan hệ can–chi: sinh ⇒ Bảo/Nghĩa nhật, khắc ⇒ Chế/Phạt nhật, đồng hành ⇒ Chuyên nhật | `CanChi`, `Almanac.dayRelation` |
| Tiết khí | Kinh độ mặt trời biểu kiến (Meeus + chương động/quang sai) **lúc 0h đầu ngày**; ngày giao tiết vẫn thuộc tiết cũ, kèm nhãn "… bắt đầu hôm nay". Giờ giao tính bằng Newton, sai ≤ ~6 phút so với lichngaytot ⇒ hiển thị `≈HH:mm` | `CanChi.solarTerm` |
| Ngày/giờ hoàng đạo | 12 thần (Thanh Long … Câu Trận), hoàng đạo = Thanh Long, Minh Đường, Kim Quỹ, Bảo Quang, Ngọc Đường, Tư Mệnh. Thanh Long khởi ở Thân với chi Tý/Ngọ, mỗi cặp chi lùi 2. Giờ: theo chi ngày. Ngày: theo chi **tháng âm** (tháng nhuận = tháng gốc) | `Almanac.hourGod/dayGod` |
| Trực | `(chi ngày − chi tháng tiết) mod 12`, tháng tiết mở ở Lập xuân = Dần | `Almanac.truc` |
| Nhị thập bát tú | `(jd + 11) mod 28`, 0 = Giác (khớp Giác–Thứ Năm) | `Almanac.mansion` |
| Hướng xuất hành | Hỷ thần theo can ngày (Giáp/Kỷ ĐB, Ất/Canh TB, Bính/Tân TN, Đinh/Nhâm N, Mậu/Quý ĐN); Tài thần theo bảng 10 can; Hắc (Hạc) thần: từ Kỷ Dậu 44 ngày đi ĐB‑Đ‑ĐN‑N‑TN‑T‑TB‑B (6/5 ngày luân phiên), từ Quý Tỵ 16 ngày lên trời | `Almanac.directions` |
| Lý Thuần Phong | `(tháng âm − 1 + ngày âm − 1 + giờ) mod 6` trên Đại An, Tốc Hỷ, Lưu Niên, Xích Khẩu, Tiểu Cát, Tuyệt Lộ | `Almanac.lyThuanPhong` |
| Khổng Minh | Tháng 1/4/7/10: chu kỳ 6 (Đường Phong…); 2/5/8/11: chu kỳ 8 (Thiên Đạo…); 3/6/9/12: chu kỳ 8 bắt đầu Chu Tước | `Almanac.khongMinh` |
| Tuổi xung | Can chi có **chi đối xung** hoặc **can xung** (Giáp–Canh, Ất–Tân, Bính–Nhâm, Đinh–Quý; Mậu/Kỷ không có), chỉ giữ cặp có nạp âm khắc nhau (2 chiều) — áp cho ngày và tháng | `Almanac.clashes` |
| Ngày kỵ | Nguyệt kỵ (5, 14, 23), Tam nương (3, 7, 13, 18, 22, 27), Dương công kỵ nhật (13 ngày cố định) | `Almanac.taboos` |
| Ngày lễ | 20 ngày dương + 14 ngày âm + Giao thừa (ngày cuối tháng Chạp); tháng nhuận không có lễ âm; `off` = nghỉ lễ chính thức (nền đỏ nhạt) | `Holidays` |

Nội dung "nên/kỵ" của trực là tóm tắt phổ biến, tham khảo — không phải luật chuẩn duy nhất.

### Tab Tử vi (tham khảo, giải trí — ghi rõ trên UI)

Vào: họ tên (tùy chọn, chỉ dùng cho thần số học), giới tính, ngày sinh (dương; `âm …` cũng được), giờ sinh (tùy chọn), năm âm cần xem.
Lỗi: ngày không tồn tại, ngày sau hôm nay, giờ sai ⇒ viền đỏ ô lỗi + trạng thái `✖`.

| Mục | Luật | Module |
|-----|------|--------|
| Tứ trụ | Năm/tháng/ngày theo âm lịch (sinh trước Tết ⇒ năm âm trước); giờ = chi `⌊(h+1)/2⌋`; **giờ Tý muộn 23–24h ⇒ trụ ngày + can giờ tính sang hôm sau** | `BirthChart.compute` |
| Mệnh, màu, số | Nạp âm năm sinh; màu hợp = hành bản mệnh + hành sinh mệnh, màu kỵ = hành khắc mệnh; số Hà Đồ (Thủy 1,6 · Hỏa 2,7 · Mộc 3,8 · Kim 4,9 · Thổ 5,0) | `BirthChart` |
| Cung mệnh bát trạch | Nam `(1999 − năm âm) mod 9 + 1`, nữ `(năm âm − 1977) mod 9 + 1`; 5 ⇒ nam Khôn / nữ Cấn. 8 hướng Sinh Khí … Tuyệt Mệnh theo bảng bát trạch | `BirthChart.kua` |
| Tuổi hợp/xung | Tam hợp, lục hợp, xung (đối chi), lục hại theo chi năm sinh | `BirthChart.compat` |
| Sao chiếu mệnh | Cửu Diệu theo tuổi mụ, chu kỳ 9 bắt đầu tuổi 10 — nam: La Hầu, Thổ Tú, Thủy Diệu, Thái Bạch, Thái Dương, Vân Hớn, Kế Đô, Thái Âm, Mộc Đức; nữ: Kế Đô, Vân Hớn, Mộc Đức, Thái Âm, Thổ Tú, La Hầu, Thái Dương, Thái Bạch, Thủy Diệu. Đã khớp lichngaytot năm 2027 (Canh Ngọ, Ất Sửu, nam/nữ) | `YearFortune.forYear` |
| Tam Tai · Kim Lâu · Hoang Ốc | Tam Tai theo nhóm tam hợp (Thân Tý Thìn ⇒ Dần Mão Thìn …); Kim Lâu = tuổi mụ mod 9 ∈ {1,3,6,8}; Hoang Ốc = `(⌊tuổi/10⌋ − 1 + tuổi mod 10) mod 6` trên Nhất Cát … Lục Hoang Ốc | `YearFortune` |
| Thái Tuế, ngũ hành năm | Năm tuổi / xung / hại / hợp Thái Tuế theo chi; nạp âm năm ↔ mệnh (sinh, khắc, đồng hành) | `YearFortune` |
| Điểm năm | Sao (±2) + ngũ hành năm (−2…+2) + Thái Tuế (−2…+1) − Tam Tai 2 − Kim Lâu 1 − Hoang Ốc xấu 1 ⇒ Tốt ≥ 3, Khá ≥ 1, Trung bình ≥ −1, còn lại Cần thận trọng | `YearFortune` |
| Thần số học | Pythagoras: A=1 … I=9 lặp lại; tên bỏ dấu (Đ→D); Y là nguyên âm khi không đứng cạnh nguyên âm khác; giữ số bậc thầy 11/22/33; năm cá nhân = ngày + tháng + năm (rút gọn); 4 đỉnh cao, chặng 1 kết thúc ở tuổi `36 − số chủ đạo` | `Numerology` |
| Tương lai gần / xa | 12 tháng âm tới (can chi tháng hợp/xung/hại tuổi + tháng cá nhân) · 10 năm sau năm sau (sao, hạn, đánh giá) | `YearFortune.months`, `HoroView` |

Pane **Bản mệnh** chia thành các khối `<details>` (mở/thu gọn được): Tổng quan · Tứ trụ & cân bằng ngũ hành (đếm hành của 4 can + 4 chi, 3 can + 3 chi nếu không rõ giờ; hành thiếu ⇒ gợi ý màu + hướng) + Nhật chủ (can ngày sinh, 10 lời luận) · Mệnh nạp âm (tính cách, điểm mạnh/yếu, nghề, sức khỏe, hướng, màu, số) · 12 con giáp (tính cách + lời khuyên, tuổi hợp/xung) · Cung hoàng đạo theo ngày dương (`NatalExtra.zodiac`: Bạch Dương 21/3 … Song Ngư 19/2–20/3; nguyên tố = chỉ số mod 4, tính chất = mod 3; "hợp nhất" = cùng nguyên tố, "cũng hợp" = Lửa↔Khí, Đất↔Nước) · Ngày sinh theo lịch vạn niên (thần hoàng/hắc đạo, trực, 28 tú, tiết khí của ngày sinh dương) · Bát trạch · Thần số học + nghề hợp + biểu đồ ngày sinh 3×3 và 8 mũi tên (đủ 3 số ⇒ mũi tên sức mạnh, vắng cả 3 ⇒ mũi tên trống; `NatalExtra.birthGrid`) · 4 đỉnh cao.
Văn bản luận giải chi tiết viết theo cặp VI/EN trong `js/i18n/horoscope-detail-texts-vi-en.js` (`HoroDetail`), khóa `T()` là bản tiếng Việt.

**Chưa có:** Bát hạn (chưa tìm được bảng nguồn đáng tin; 4 điểm dữ liệu thu được không khớp chu kỳ đơn giản nào) và lá số Tử Vi Đẩu Số đầy đủ (12 cung, 14 chính tinh, đại hạn) — làm đợt sau.

## 5. Module & luồng

```text
src/vietnamese-lunar-calendar/
  vietnamese-lunar-calendar.template.html    # khung + @include
  styles/lunar-calendar-month-grid-and-day-detail.css
  js/calendar/  lunar-solar-conversion-ho-ngoc-duc.js (LunarCal) · can-chi-solar-terms-nap-am.js (CanChi)
                auspicious-days-hours-almanac.js (Almanac) · vietnam-solar-lunar-holidays.js (Holidays) · date-text-parser.js (DateText)
  js/i18n/      en-lunar-calendar-ui-strings.js · en-almanac-terms.js
  js/horoscope/ birth-chart-pillars-and-feng-shui.js (BirthChart) · yearly-fortune-stars-and-age-taboos.js (YearFortune)
                pythagorean-numerology-name-and-birth.js (Numerology) · horoscope-interpretation-texts.js (HoroText)
  js/samples/   demo-dates-registry.js (DEMOS) · horoscope-demo-profiles.js (HORO_DEMOS)
  js/horoscope/ western-zodiac-and-element-balance.js (NatalExtra)
  js/ui/        month-grid-view.js (MonthGrid) · day-detail-pane.js (DayDetail) · horoscope-tab-view.js (HoroView) · horoscope-natal-profile-view.js (HoroProfile)
                horoscope-tab-controller.js (HoroApp) · lunar-calendar-app.js (tab + điều phối)
  tests/        lunar-calendar-pure-modules.test.js · horoscope-pure-modules.test.js · i18n-dictionary-coverage.test.js
```

Ô nhập/mẫu/link → `DateText.parse` → `jd` → `select(jd)` → `MonthGrid.build` (lưới + sự kiện trong tháng) + `DayDetail.render` + thanh trạng thái.
Lỗi nhập ⇒ ô nhập viền đỏ + trạng thái `✖ …`, không đổi ngày đang xem. Module dùng chung từ Data Workbench: `I18n`, `ShareCodec`, `Dom`, `ThemePicker`, `PhoneLayout`.

Phím: `← → ↑ ↓` đổi ngày (focus trong lưới), `PageUp/PageDown` đổi tháng, `Home` về hôm nay, `Enter` ở ô nhập = Xem ngày.

## Điện thoại

- Tab ở hàng cuối header (📅 Lịch · 🔮 Tử vi); mỗi tab có toolbar, pane-switch và dòng trạng thái riêng.
- Tab Tử vi: form xuống dòng, trang cuộn được, 2 pane **Bản mệnh** · **Vận hạn** cao 85dvh.
- Tab Lịch: 2 pane trong carousel: **Lịch tháng** (pane 0, mặc định) · **Chi tiết ngày** (pane 1). Chạm 1 ô ngày, 1 sự kiện, hoặc `Xem ngày` ⇒ tự sang pane 1; nạp mẫu/link ⇒ pane 1.
- Điều hướng tháng (◀ tháng năm ▶) nằm trên thanh của pane Lịch tháng nên luôn thấy; toolbar cuộn ngang, `Xem ngày` ghim trái.
- Desktop > 900px không có `#split` kéo đổi tỉ lệ: lưới tháng và chi tiết có bề rộng tự nhiên, tỉ lệ cố định 1.15 : 1.
- Không có thao tác chỉ-hover: thông tin trong `title` của ô (âm lịch, can chi, thần) đều có trong pane chi tiết.

## Giới hạn

- Năm 1800–2199. Trước 1968 lịch VN thực tế có lúc dùng UTC+8; tool luôn tính UTC+7 (giống lịch Hồ Ngọc Đức).
- Giờ giao tiết sai số vài phút (công thức Meeus rút gọn).
- Dựng 1 tháng ≈ 42 ô × (đổi lịch + tiết khí) — tức thời; test round-trip 146k ngày chạy ~6 giây.
