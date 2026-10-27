# Architecture — web_tool

## 1. Mô hình

- **Static single-file tool (công cụ 1 file tĩnh)**: mỗi tool = 1 file `.html` trong `tools/`, CSS + JS inline.
- `index.html` ở root = trang chủ tĩnh, chỉ chứa link tới từng tool.
- Không backend, không build, không dependency, không network request. Mở bằng `file://` hay host tĩnh đều chạy.
- Trạng thái chỉ sống trong DOM/biến JS của tab — không `localStorage`, không cookie.

```text
index.html                 # trang chủ: danh sách tool
tools/<ten-tool>.html      # 1 tool = 1 file tự chứa
docs/tools/<ten-tool>.md   # kiến thức riêng của tool (luật, contract, data model, module, giới hạn)
```

## 2. Module & luồng từng tool

Xem `docs/tools/<tool>.md` — danh sách ở [`docs/tools/`](../tools/README.md).

## 3. Nguyên tắc kiến trúc

- Thêm tool mới = thêm 1 file `tools/<ten-kebab>.html`, cùng khuôn: header toolbar · 2 pane · footer trạng thái.
- Code dùng chung giữa các tool được **chép** vào từng file (chấp nhận trùng lặp để giữ tự chứa — ADR #1).
- Không đưa thư viện ngoài vào; nếu bắt buộc → hỏi user và ghi ADR (đổi cam kết offline/riêng tư).
- Parser trả `fixes` thay vì throw — chỉ throw khi không thể xử lý (vd nội dung trống).
