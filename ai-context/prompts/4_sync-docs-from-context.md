# Prompt: Sync Docs from Context (Doc Refresh)

> Copy → chạy ĐỊNH KỲ khi code/memory đã tiến triển và docs có thể lỗi thời.
> Khác 2_autofill (điền lần đầu từ code): prompt này ĐỐI CHIẾU docs hiện có với
> code + memory + tài liệu liên quan rồi CẬP NHẬT phần đã drift.

**Role:** Solution Architect kiêm Technical Writer. Re-sync tài liệu cho khớp thực tại.

## QUY TẮC THỰC THI

- Áp dụng nguyên block "QUY TẮC THỰC THI" của `2_autofill-workspace-from-codebase.md`
  (không bịa · DỪNG nếu sai nguồn · secrets chỉ inventory · merge-safe readme).
- BỔ SUNG: KHÔNG viết lại từ đầu phần đã đúng — chỉ sửa mục lệch/thiếu/lỗi thời.
- Mục nghi lỗi thời nhưng chưa xác minh được → đánh dấu `> ⚠️ cần xác minh`, KHÔNG xoá.

## NGUỒN ĐỐI CHIẾU (đọc trước khi sửa)

1. Memory: `~/.claude/.../memory/` + `MEMORY.md` — bài học/quyết định mới nhất.
2. ai-context/: project-context.md, working/sprint-current.md, working/issues-open.md.
3. docs/: qua docs/INDEX.md (single source of truth).
4. Mỗi `{{repo}}/readme.md` + mã nguồn thực tế để bắt drift.
5. Lịch sử git gần đây (nếu có) để biết gì vừa đổi.

## MỤC TIÊU CẬP NHẬT (chỉ sửa phần lệch)

- [ ] `{{repo}}/readme.md` — merge-safe, đồng bộ tech stack/cấu trúc/luồng mới.
- [ ] `ai-context/project-context.md` — cập nhật kiến trúc/downstream nếu đổi.
- [ ] `ai-context/working/*` — phản ánh sprint & issues hiện tại.
- [ ] `docs/*` — business/architecture/api-contracts/data-models khớp code mới.
- [ ] AI config (CLAUDE.md/GEMINI.md/.github/) — chỉ khi convention/stack đổi.
- [ ] `ai-context/skills/*/SKILL.md` — skill lệch với flow/code mới; junction thiếu (tool không thấy skill) → chạy `scripts/link-shared-skills.ps1`.

## QUY TRÌNH

1. Đọc toàn bộ NGUỒN ĐỐI CHIẾU ở trên.
2. Lập danh sách drift: mục nào trong docs lệch với code/memory.
3. Sửa từng mục; giữ nội dung đúng, đánh dấu mục nghi ngờ.
4. Báo cáo: file nào sửa, đổi gì, mục `⚠️ cần xác minh`, mục còn trống & vì sao.
