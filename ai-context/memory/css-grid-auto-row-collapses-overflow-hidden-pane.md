# Grid `auto` row co về 0 khi pane có `overflow:hidden`

**Triệu chứng:** One Editor ở dải 641–900 px, màn thấp (800×900): Explorer (và thanh icon khi ẩn sidebar) chỉ cao 2px — mất hẳn. Màn cao hơn thì bình thường.

**Nguyên nhân:** `#work` có chiều cao cố định, các view chiếm `grid-auto-rows:minmax(280px,1fr)`; hết chỗ trống thì track `auto` của Explorer chỉ được min-content của item. Item là scroll container (`overflow:hidden`) ⇒ automatic minimum = 0 ⇒ track chỉ còn viền. Toolbar cao thêm (thêm nút) làm lỗi có sẵn lộ ra.

**Cách xử lý đúng:** đặt `min-height` cho item trong track `auto` (`min(30vh, 220px)`; nội dung ngắn như thanh icon ⇒ `fit-content`). Test headless phải đo `getBoundingClientRect().height` > ngưỡng hợp lý, đừng chỉ kiểm `display` / `flexDirection`.
