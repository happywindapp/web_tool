# Scripts

Scripts dùng chung toàn project: setup môi trường, seed data, chạy migration,
generate api-contracts, sync giữa các services.

## Quy ước
- Tên file kebab-case mô tả rõ mục đích: `setup-env.sh`, `seed-data.sh`, `gen-api-contracts.sh`.
- Mỗi script tự ghi 1 dòng mô tả ở đầu file.
- Script phá hủy dữ liệu phải hỏi xác nhận trước khi chạy.
