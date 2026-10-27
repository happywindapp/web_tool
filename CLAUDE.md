# CLAUDE.md — Workspace `c:/_web_tool` (web_tool)

> [AUTO-LOAD] Claude Code đọc khi khởi động từ `c:/_web_tool`.
> Luật chi tiết sống ở `~/.claude/CLAUDE.md` + `~/.claude/rules/*` (đã auto-load). File này tóm tắt + trỏ đường.

## Workspace là gì

`c:/_web_tool` **chính là git repo** `happywindapp/web_tool` (nhánh `main`): bộ công cụ web tiện ích,
mỗi tool là **1 file HTML tự chứa** trong `_tools/`, chạy 100% client-side, không gọi mạng.
Tool hiện có: `_tools/format-json-xml-html.html` (kiểm tra · tự sửa lỗi · format · minify JSON/XML/HTML).
Đọc `ai-context/project-context.md` để nắm toàn cảnh.

## Tech stack

- **Tool:** HTML5 + CSS + vanilla JS (ES2020) inline trong 1 file. Không framework, không build, không CDN.
- **Chạy/test:** mở file trong trình duyệt (`?demo=json|xml|html` nạp mẫu lỗi rồi format ngay). Chưa có test tự động.
- **Scaffold AI:** Markdown (`docs/`, `ai-context/`), PowerShell (`scripts/`).

## Convention riêng của repo

- 1 tool = 1 file `_tools/<viec-lam-kebab-case>.html`; module JS dạng IIFE (`const X = (() => {...})()`), UI tiếng Việt.
- Ngoại lệ có chủ đích với luật "file < 200 dòng": tool phải tự chứa để mở trực tiếp (xem `docs/decisions/`).
- Mọi sửa lỗi tự động phải đẩy vào `fixes` (`{line, col, msg}`) — không sửa âm thầm.

## Naming convention

- File: **kebab-case** + tên mô tả rõ mục đích (để LLM hiểu ngay qua Grep/Glob).
- Code theo ngôn ngữ: Go/Rust → snake_case; C#/Java → PascalCase; JS/TS/Python/shell → kebab-case.

## Clean code rules (BẮT BUỘC)

- **YAGNI · KISS · DRY.** Diff hẹp, chỉ đụng dòng cần cho task. Không drive-by reformat.
- **Comment tối thiểu:** mặc định KHÔNG comment; khi cần chỉ 1 dòng giải thích WHY.
- Giữ file < ~200 dòng; tách module theo concern.
- Check module/skill đã có trước khi tạo mới.

## Guardrails vận hành (từ `~/.claude/`)

- **DB READ-ONLY:** chỉ `SELECT`/metadata. Mọi INSERT/UPDATE/DELETE/DDL → viết SQL, để user tự chạy.
- **Git:** KHÔNG tự `git commit`/`git push`. Chuẩn bị xong → đưa lệnh/message cho user.
- **PR description:** dùng chuẩn trong `ai-context/prompts/pr-description.md` (khác nhau cho fix bug vs feature mới).
- **Skill:** skill cá nhân xuyên-project → `~/.claude/skills/`; skill dùng chung đa-AI của project → `ai-context/skills/` (chuẩn mở SKILL.md, junction `.claude/skills/` tạo bởi `scripts/link-shared-skills.ps1`).
- **Cài tool:** dưới `C:\_devtools\<tool>\`, per-user (không admin).
- **Orchestration:** khi làm trên downstream target, dùng work-context path của project đó.
- **Code Quality Gates (BẮT BUỘC):** self-review diff theo checklist trước khi báo "xong"; checklist backend/API; ngã rẽ thiết kế ⇒ hỏi user. Chi tiết: `~/.claude/rules/code-quality-gates.md` + `ai-context/memory/code-quality-gates-self-review-checklist-design-forks.md`.
- **Giải thích song ngữ:** kỹ thuật/pattern/khái niệm quan trọng ghi `English term (thuật ngữ tiếng Việt)`, chỉ thuật ngữ then chốt. Chi tiết: `ai-context/memory/bilingual-technique-names-in-explanations.md`.

## Bản đồ điều hướng

1. `ai-context/project-context.md` — toàn cảnh project (đọc đầu tiên).
2. `docs/INDEX.md` — mục lục tài liệu.
3. `ai-context/working/sprint-current.md` — việc đang làm.
4. `ai-context/memory/` + `MEMORY.md` index — bài học đã rút ra.
5. `.agent/` — rules + workflows cho Google Antigravity (đọc `AGENTS.md`+`GEMINI.md`+`.agent/`).
6. `ai-context/skills/` — skills dùng chung mọi AI tool (junction tạo bởi `scripts/link-shared-skills.ps1`).

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`happywindapp/web_tool`, via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context; ADRs live in `docs/decisions/` (NOT `docs/adr/`). See `docs/agents/domain.md`.
