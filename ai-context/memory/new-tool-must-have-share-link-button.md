# Tool mới / sửa tool: luôn có nút 🔗 Chia sẻ link

**Triệu chứng:** người dùng muốn gửi đúng dữ liệu + kết quả cho đồng nghiệp nhưng phải copy-paste input và dặn lại từng tuỳ chọn;
hoặc link tự chế đưa dữ liệu vào query `?data=` ⇒ dữ liệu lọt vào log server/proxy, link dài bị lỗi 414.

**Nguyên nhân:** tool không có tính năng chia sẻ, hoặc làm chia sẻ bằng query thay vì hash.

**Cách làm đúng (bắt buộc mọi AI, mọi tool):**

- Theo checklist **"Link chia sẻ dữ liệu"** ở `docs/architecture/README.md` mục 3 (nguồn chân lý) + ADR #9.
- Nút `🔗 Chia sẻ link` ở header; link `<tool>.html[?tab=<id>]#pako:<base64url(zlib(JSON))>` — cùng định dạng mermaid.live.
  Codec: `src/data-workbench/js/core/share-link-codec.js` (tool 1 file chép nguyên văn). Dữ liệu **chỉ ở hash**.
- Payload = dữ liệu + tuỳ chọn ảnh hưởng kết quả (+ tab). Mở link ⇒ nạp + chạy, xoá hash khỏi URL, nghe `hashchange`.
- Đọc thêm `?data=<text>` cho link tự soạn (đi lên server ⇒ chỉ dữ liệu ngắn, ghi rõ trong doc).
- Không mất bài đang sửa (nút `↶ Khôi phục bản trước` hoặc lịch sử); payload không tin cậy ⇒ chỉ gán field đã biết, link hỏng báo lỗi.
- Tham khảo: Data Workbench `src/data-workbench/js/core/workbench-tab-router.js` (`share`, `openLink`, `keep`, `restore`);
  Diagram Editor `src/diagram-editor/js/ui/share-links.js`.
