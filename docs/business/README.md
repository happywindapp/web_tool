# Business — web_tool

> Luật nghiệp vụ **chung** mọi tool. Luật riêng (nhận diện định dạng, catalog tự sửa…) nằm trong
> `docs/tools/<tool>.md` — xem [`docs/tools/`](../tools/README.md).

## Người dùng & mục đích

Dev/QA/BA cần xử lý nhanh dữ liệu dạng text (payload, file cấu hình, log…) ngay trên máy.
**Dữ liệu không rời máy** — tool phải dùng được với dữ liệu nhạy cảm (UAT log, dữ liệu khách hàng…).

## Luật chung

- Tool nào tự sửa dữ liệu thì mọi sửa đổi phải hiện cho người dùng duyệt (fix record — `docs/data-models/`);
  UI nhắc rõ "tự sửa là đoán ý định".
- Không lưu input lại sau khi đóng tab.
