# Giải thích kỹ thuật — ghi tên song ngữ Anh + Việt

> Áp dụng cho **mọi AI tool** (Claude Code, Codex, Gemini, Copilot, Antigravity) và mọi project dùng cấu trúc chuẩn này.
> Bản gốc cho Claude: `~/.claude/CLAUDE.md` mục "Language & Response Style". Sửa luật → sửa cả 2 nơi.

**Triệu chứng:** giải thích chỉ dùng 1 ngôn ngữ — chỉ tiếng Anh thì người đọc khó hiểu nhanh, chỉ tiếng Việt thì
khó tra cứu tài liệu/Google theo tên chuẩn.

**Nguyên nhân:** chưa có quy ước chung về cách gọi tên kỹ thuật khi trả lời bằng tiếng Việt.

## Cách xử lý đúng (bắt buộc)

- Khi nói/giải thích vấn đề, các **kỹ thuật/pattern/khái niệm quan trọng** ghi cả 2 tên: `English term (thuật ngữ tiếng Việt)`.
  Vd: `State machine (máy trạng thái)`, `Idempotency (tính lũy đẳng)`, `Optimistic locking (khóa lạc quan)`.
- Chỉ áp cho thuật ngữ then chốt — không dịch mọi từ; lần đầu nhắc ghi song ngữ, các lần sau dùng 1 tên là đủ.
- Code, tên file, identifier, log, error message vẫn giữ nguyên bản gốc, không dịch.
