# AI Memory

> Nơi AI ghi lại **bài học** để lần sau không lặp lại sai lầm.
> Khác với memory global riêng từng AI tool (`~/.claude/projects/.../memory/` với Claude Code) — xem
> `docs/glossary.md` mục "Memory" để phân biệt 2 hệ. File ở ĐÂY là bản chung, git-tracked,
> mọi AI tool + người đều đọc được — không phải bản thay thế cho memory global.

## Cách dùng

- Mỗi bài học = 1 file `.md` ngắn, tên kebab-case mô tả vấn đề.
  Ví dụ: `build-error-lib-x-version-mismatch.md`, `gotcha-grpc-timeout-default.md`.
- Nội dung gợi ý: **Triệu chứng → Nguyên nhân → Cách xử lý đúng**.
- Chỉ ghi điều DURABLE (lặp lại nhiều lần, dễ quên). Bỏ qua noise debug tạm thời.
- **Nếu bạn (AI) vừa ghi 1 finding vào memory global của riêng mình, quay lại đây và tự hỏi: "cái này có
  cần AI tool khác / người khác biết không?"** — nếu có, ghi thêm 1 file ở đây trong CÙNG lượt, đừng đợi
  user phải hỏi lại.

## Mục lục

- [bilingual-technique-names-in-explanations.md](bilingual-technique-names-in-explanations.md) —
  **bắt buộc mọi AI khi giải thích:** kỹ thuật/pattern/khái niệm quan trọng ghi song ngữ `English term (thuật ngữ tiếng Việt)`; chỉ thuật ngữ then chốt, lần đầu nhắc. Bản Claude: `~/.claude/CLAUDE.md`

- [code-quality-gates-self-review-checklist-design-forks.md](code-quality-gates-self-review-checklist-design-forks.md) —
  **bắt buộc mọi AI, mọi task code:** self-review diff theo checklist trước khi báo "xong"; checklist backend/API
  (scale/paging DB, che lỗi, không trả entity, tên = cột domain, Validate() ở request DTO + guard nil ở usecase, tách DDL/backfill, index);
  ngã rẽ thiết kế ⇒ hỏi user; review PR theo mục D. Bản Claude: `~/.claude/rules/code-quality-gates.md`

- [new-tool-must-support-vi-en-i18n.md](new-tool-must-support-vi-en-i18n.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** song ngữ English + Tiếng Việt (nút `VI | EN`, module `I18n`, từ điển English, dịch card index);
  checklist ở `docs/architecture/README.md` mục 3.

- [new-tool-must-ship-quick-test-sample-data.md](new-tool-must-ship-quick-test-sample-data.md) —
  **bắt buộc mọi AI khi thêm/sửa tool:** dropdown `Thử mẫu…` + `?demo=<key>`, mẫu hợp lệ + mẫu lỗi, dữ liệu giả;
  checklist ở `docs/architecture/README.md` mục 3.

- [scaffold-robocopy-copies-skill-junctions.md](scaffold-robocopy-copies-skill-junctions.md) — robocopy cần `/XJ` khi copy template
