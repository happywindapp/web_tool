# Scripts

Scripts dùng chung toàn project: setup môi trường, seed data, chạy migration,
generate api-contracts, sync giữa các services.

## Quy ước
- Tên file kebab-case mô tả rõ mục đích: `setup-env.sh`, `seed-data.sh`, `gen-api-contracts.sh`.
- Mỗi script tự ghi 1 dòng mô tả ở đầu file.
- Script phá hủy dữ liệu phải hỏi xác nhận trước khi chạy.

## Study (bài thi ôn tập)
- `validate-study-quiz-bank.js` — `node scripts/validate-study-quiz-bank.js study/<MA_DE>.html`: kiểm schema `BANK`, trùng câu, phương án tham chiếu chéo thiếu `fixed`, thống kê chủ đề / vị trí đáp án / đáp án dễ đoán.
- `extract-pdf-text-bold-or-images-for-quiz.py` — `python -I … <file.pdf>`: text kèm `**in đậm**` (file đáp án in đậm); `--images <dir>`: xuất ảnh từng trang PDF scan. Cần `pypdf`.
