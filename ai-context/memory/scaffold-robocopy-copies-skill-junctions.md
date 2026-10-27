# Scaffold template bằng robocopy chép junction `*/skills` thành thư mục rỗng

- **Triệu chứng:** sau khi copy template sang project mới, `scripts/link-shared-skills.ps1` báo
  `SKIP .claude\skills - la thu muc that` cho cả 5 thư mục (`.agents/.claude/.github/.agent/.gemini`).
- **Nguyên nhân:** robocopy mặc định đi theo junction; `/XD ai-context\skills` không loại các junction trỏ về nó.
- **Cách xử lý đúng:** robocopy thêm `/XJ`. Nếu đã lỡ: kiểm tra thư mục rỗng rồi xoá bằng
  `[System.IO.Directory]::Delete('<path>')` (không đệ quy, an toàn), chạy lại `link-shared-skills.ps1`.
- Gặp khi apply cho `C:\_market` (2026-10-19).
