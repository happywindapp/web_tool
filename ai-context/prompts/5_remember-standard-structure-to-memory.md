# Prompt: Ghi nhớ cấu trúc chuẩn vào memory

> Copy → paste vào AI tool bất kỳ (Claude Code / Gemini / Copilot / Codex). Mục đích: bắt AI đọc + lưu cấu trúc project chuẩn vào bộ nhớ dài hạn để tự áp dụng cho mọi project sau này.

Hãy đọc và ghi nhớ cấu trúc thư mục chuẩn dưới đây. Đây là quy ước tổ chức
project tôi DÙNG CHUNG cho TẤT CẢ dự án, nhằm phối hợp nhiều AI tool cùng lúc
(Claude Code, GPT Codex, Gemini, GitHub Copilot).

YÊU CẦU:

1. Lưu kiến thức này vào BỘ NHỚ DÀI HẠN / GLOBAL của bạn để tự động áp dụng cho
   mọi project sau này (không chỉ session hiện tại). Cụ thể theo từng tool:

   - Claude Code  → lưu vào global memory (~/.claude/.../memory/) + cập nhật MEMORY.md
   - Gemini CLI   → ghi vào file GEMINI.md ở cấp global/user
   - GitHub Copilot → ghi vào .github/copilot-instructions.md
   - GPT Codex    → ghi vào AGENTS.md
     (Nếu không có cơ chế global, lưu ở mức cao nhất mà bạn hỗ trợ.)
2. Khi làm việc ở BẤT KỲ project nào theo cấu trúc này, hãy TỰ ĐỘNG:

   - Đọc trước file context cốt lõi: ai-context/project-context.md
   - Đọc readme.md của repo sẽ làm việc (kiến thức toàn bộ repo) TRƯỚC khi code
   - Tra cứu tài liệu nguồn (single source of truth) trong docs/ (qua docs/INDEX.md)
   - Xem việc đang làm trong ai-context/working/sprint-current.md và issues-open.md
   - Ghi lại bài học mới vào ai-context/memory/
   - Dùng prompt template trong ai-context/prompts/ khi phù hợp
   - Skill dùng chung project → tạo/sửa trong ai-context/skills/; nếu không thấy skill nào (junction thiếu) → chạy scripts/link-shared-skills.ps1
3. Không được update các file của các AI khác

CẤU TRÚC THƯ MỤC:

Root:

- .github/copilot-instructions.md → [AUTO-LOAD] Copilot đọc tự động (stack, conventions, patterns)
- CLAUDE.md  → [AUTO-LOAD] Claude Code đọc tự động (tóm tắt + pointer tới docs/ & ai-context/)
- GEMINI.md  → [AUTO-LOAD] Gemini CLI đọc tự động
- AGENTS.md  → [AUTO-LOAD] GPT Codex đọc tự động
- note.md    → ghi chú nháp cá nhân

ai-context/ (context cho AI):

- project-context.md → mục tiêu cốt lõi + kiến trúc high-level. ĐỌC ĐẦU TIÊN.
- working/sprint-current.md → task list hiện tại
- working/issues-open.md    → bugs & blockers đang mở
- memory/ → nơi AI ghi lại bài học (lỗi build hay gặp, v.v.)
- prompts/ → template tái sử dụng: feature.md, review.md, debug.md, refactor.md
- skills/ → SKILLS DÙNG CHUNG mọi AI tool (chuẩn mở SKILL.md, frontmatter name + description).
  Tool đọc qua junction .agents/.claude/.github/.agent/.gemini + /skills/ (gitignored),
  tạo bởi scripts/link-shared-skills.ps1 — junction thiếu thì chạy lại script.
  Skill dùng chung của project CHỈ tạo ở đây, không tạo ở thư mục riêng từng tool.

docs/ (SINGLE SOURCE OF TRUTH — AI và người dùng dùng chung):

- INDEX.md        → mục lục, link tới toàn bộ tài liệu
- business/       → nghiệp vụ cốt lõi: business rules, luồng xử lý, edge cases
- architecture/   → system design tổng thể, C4 models, giao tiếp giữa services
- data-models/    → ERD, DB schema, migration rules, naming conventions
- api-contracts/  → OpenAPI/Swagger specs, interface giữa services
- security/       → security policies, auth flows, permission matrix
- deployment/     → hướng dẫn deploy, CI/CD, env vars, runbooks
- diagrams/       → diagrams (sequence/flow/infra), file gốc + ảnh export
- decisions/      → ADR (Architecture Decision Records): TẠI SAO code viết như vậy
- glossary.md     → định nghĩa thuật ngữ, viết tắt, tên riêng của team

services (mỗi cái là git repo riêng):

- repo_1/, repo_2/, repo_3/ → BE / FE / service...
  - mỗi repo có readme.md → kiến thức TOÀN BỘ repo source (đọc trước khi code trong repo đó)
- scripts/ → scripts dùng chung: setup, seed data, migration, gen api-contracts, sync

NGUYÊN TẮC ƯU TIÊN:

- docs/ là nguồn chân lý. Khi code mâu thuẫn với docs/ → tin docs/.
- Luôn đọc context (ai-context/project-context.md + docs/) TRƯỚC khi viết code.

Sau khi lưu xong, xác nhận ngắn gọn bạn đã ghi vào đâu.
