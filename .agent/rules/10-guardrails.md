# Rule: Guardrails vận hành (always-on)

> Bản rút gọn để Antigravity tuân thủ inline (Antigravity KHÔNG đọc `~/.claude/rules/*`).
> Bản đầy đủ: `AGENTS.md` ở root.

- **DB READ-ONLY:** chỉ `SELECT`/`SHOW`/`EXPLAIN`/metadata. Mọi INSERT/UPDATE/DELETE/DDL → viết SQL hoàn chỉnh, giải thích tác động, để user TỰ chạy. Áp dụng mọi DB, mọi môi trường, kể cả khi user ra lệnh trực tiếp.
- **Git:** KHÔNG tự `git commit`/`git push`. Chuẩn bị (stage/message) xong → đưa lệnh + message cho user tự chạy. "review/check/verify/build" KHÔNG phải là cho phép commit.
- **File ops:** đọc/ghi/sửa file thường → làm trực tiếp. Hành động phá hủy/bất thường → xác nhận trước.
- **Markdown:** chỉ tạo ở `c:/_web_tool/plans` hoặc `c:/_web_tool/docs`, trừ khi user yêu cầu rõ.
- **Cài tool:** dưới `C:\_devtools\<tool>\`, per-user (máy KHÔNG có quyền admin).
- **Secrets:** không đọc/commit `server-config.md`, `.env*`; chỉ dùng `server-config.example.md` làm mẫu.

## Ngôn ngữ

- Trả lời **tiếng Việt** (giữ nguyên thuật ngữ tiếng Anh, tên file, identifier, log). Giữ đủ dấu tiếng Việt.
