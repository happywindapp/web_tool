# AGENTS.md — Workspace `c:/_web_tool` (web_tool)

> File hướng dẫn cho coding agents (GPT Codex CLI + **Google Antigravity** + tương thích). Codex và Antigravity tự đọc `AGENTS.md` ở repo root.
> Tương đương `CLAUDE.md` (cho Claude Code). Hai file giữ cùng nội dung; sửa một, đồng bộ file kia.
> **Antigravity** còn nạp `GEMINI.md` (ưu tiên cao hơn) + thư mục `.agent/rules/*` và `.agent/workflows/*` (xem `.agent/README.md`).

## Workspace là gì

`c:/_web_tool` **chính là git repo** `happywindapp/web_tool` (nhánh `main`): bộ công cụ web tiện ích,
mỗi tool là **1 file HTML tự chứa** trong `_tools/`, chạy 100% client-side, không gọi mạng.
Đọc `ai-context/project-context.md` để nắm toàn cảnh.

## Tech stack

- **Tool:** HTML5 + CSS + vanilla JS inline trong 1 file. Không framework, không build, không CDN.
- **Chạy/test:** mở file trong trình duyệt (`?demo=json|xml|html`). Chưa có test tự động.
- **Scaffold AI:** Markdown (`docs/`, `ai-context/`), PowerShell (`scripts/`).

## Naming convention

- File: **kebab-case** + tên mô tả rõ mục đích (để agent hiểu ngay qua grep/glob).
- Code theo ngôn ngữ: Go/Rust → snake_case; C#/Java → PascalCase; JS/TS/Python/shell → kebab-case.

## Clean code rules (BẮT BUỘC)

- **YAGNI · KISS · DRY.** Diff hẹp, chỉ đụng dòng cần cho task. Không drive-by reformat.
- **Comment tối thiểu:** mặc định KHÔNG comment; khi cần chỉ 1 dòng giải thích WHY.
- Giữ file < ~200 dòng; tách module theo concern.
- Check module đã có trước khi tạo mới. Sửa file hiện hữu thay vì tạo file `*-enhanced`/`*-v2`.

## Guardrails vận hành (BẮT BUỘC)

- **DB READ-ONLY:** chỉ chạy `SELECT`/`SHOW`/`EXPLAIN`/metadata. Mọi INSERT/UPDATE/DELETE/DDL → viết SQL hoàn chỉnh, giải thích tác động, để user TỰ chạy. Áp dụng mọi DB, mọi môi trường, kể cả khi user ra lệnh trực tiếp.
- **Git:** KHÔNG tự `git commit`/`git push`. Chuẩn bị (stage/message) xong → đưa lệnh + message cho user tự chạy. "review/check/verify/build" KHÔNG phải là cho phép commit.
- **PR description:** dùng chuẩn trong `ai-context/prompts/pr-description.md` (khác nhau cho fix bug vs feature mới).
- **File ops:** đọc/ghi/sửa file thường → làm trực tiếp, không cần hỏi. Hành động phá hủy/bất thường → xác nhận trước.
- **Cài tool:** dưới `C:\_devtools\<tool>\`, per-user (máy KHÔNG có quyền admin).
- **Markdown:** chỉ tạo ở `c:/_web_tool\plans` hoặc `c:/_web_tool\docs`, trừ khi user yêu cầu rõ (như file này).

## Ngôn ngữ & phong cách

- Trả lời bằng **tiếng Việt** (giữ nguyên thuật ngữ tiếng Anh, tên file, identifier, log).
- **Giải thích song ngữ:** kỹ thuật/pattern/khái niệm quan trọng ghi `English term (thuật ngữ tiếng Việt)`, chỉ thuật ngữ then chốt, lần đầu nhắc. Chi tiết: `ai-context/memory/bilingual-technique-names-in-explanations.md`.
- Giữ đủ dấu tiếng Việt. Sacrifice grammar for concision trong report.

## Bản đồ điều hướng

1. `ai-context/project-context.md` — toàn cảnh hub (đọc đầu tiên).
2. `docs/INDEX.md` — mục lục tài liệu.
3. `ai-context/working/sprint-current.md` — việc đang làm.
4. `ai-context/memory/` + `MEMORY.md` index — bài học đã rút ra.
5. `.agent/` — rules + workflows native cho Antigravity (trỏ về 1–4, không nhân bản).
6. `ai-context/skills/` — skills dùng chung mọi AI (chuẩn mở SKILL.md; junction `.agents/.claude/.github/.agent/.gemini` tạo bởi `scripts/link-shared-skills.ps1`).

## Đường dẫn chuẩn

- Reports: `c:/_web_tool\plans\reports\`
- Plans: `c:/_web_tool\plans\`
- Docs: `c:/_web_tool\docs\`

## Quy ước project multi-AI dùng chung

Áp dụng tự động cho mọi project có cấu trúc chuẩn gồm `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, `.github/copilot-instructions.md`, `ai-context/`, `docs/`,
`services/`, `scripts/`.

- Codex chỉ cập nhật file dành cho Codex (`AGENTS.md`) trừ khi user yêu cầu rõ file khác.
- Luôn đọc trước `ai-context/project-context.md`.
- Tra cứu source of truth trong `docs/` qua `docs/INDEX.md`; nếu code mâu thuẫn docs thì ưu tiên docs.
- Xem việc đang làm trong `ai-context/working/sprint-current.md` và `ai-context/working/issues-open.md`.
- Ghi bài học mới, lỗi build hay gặp, quyết định vận hành vào `ai-context/memory/` khi có giá trị tái sử dụng.
- Dùng prompt template trong `ai-context/prompts/` khi phù hợp với task.
- Root files tự động theo tool: Claude Code dùng `CLAUDE.md`, Gemini CLI dùng `GEMINI.md`, GitHub Copilot dùng `.github/copilot-instructions.md`, GPT Codex dùng `AGENTS.md`, Google Antigravity dùng `AGENTS.md` + `GEMINI.md` + `.agent/`.
- `docs/` là SINGLE SOURCE OF TRUTH cho business, architecture, data models, API contracts, security, deployment, diagrams, ADR, glossary.
