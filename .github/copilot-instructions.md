# Copilot Instructions — `c:/_web_tool`

> [AUTO-LOAD] GitHub Copilot đọc tự động trong VS Code. Giữ NGẮN — chỉ stack, conventions, patterns.

## Bối cảnh

`c:/_web_tool` = git repo `happywindapp/web_tool`: bộ công cụ web, mỗi tool là 1 file HTML tự chứa
trong `tools/`, chạy 100% client-side. Tài liệu nguồn: `ai-context/project-context.md`.

## Stack

- Tool: HTML5 + CSS + vanilla JS inline 1 file (module IIFE). Không framework/build/CDN, không gọi mạng.
- Scaffold AI: Markdown (`docs/`, `ai-context/`), PowerShell (`scripts/`).

## Conventions

- File naming: kebab-case mô tả rõ mục đích. Code: Go → snake_case; C#/Java → PascalCase; JS/TS/Python/shell → kebab-case.
- Comment: tối thiểu, 1 dòng, chỉ giải thích WHY khi không hiển nhiên.
- Giữ file < ~200 dòng; tách theo concern. YAGNI · KISS · DRY.

## Patterns bắt buộc

- DB **READ-ONLY** — không sinh code/lệnh ghi-xóa DB tự chạy.
- KHÔNG auto `git commit`/`git push`.
- **Giải thích song ngữ:** kỹ thuật/pattern/khái niệm quan trọng ghi `English term (thuật ngữ tiếng Việt)`, chỉ thuật ngữ then chốt, lần đầu nhắc. Chi tiết: `ai-context/memory/bilingual-technique-names-in-explanations.md`.
- PR description theo chuẩn `ai-context/prompts/pr-description.md` (fix bug vs feature mới khác nhau).
- Skill dùng chung project ở `ai-context/skills/` (Copilot đọc qua junction `.github/skills/`); mỗi skill = 1 folder + `SKILL.md` (frontmatter `name` + `description`).
- Thuật ngữ domain: `docs/glossary.md`. Quyết định kiến trúc: `docs/decisions/`.

## Universal Project Structure (Multi-AI)

Áp dụng cho mọi project theo chuẩn thư mục dùng chung đa tool.

- Root chuẩn: `.github/copilot-instructions.md`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `note.md`.
- Google Antigravity: dùng `AGENTS.md` + `GEMINI.md` + thư mục `.agent/` (`rules/`, `workflows/`).
- AI context chuẩn: `ai-context/project-context.md`, `ai-context/working/sprint-current.md`, `ai-context/working/issues-open.md`, `ai-context/memory/`, `ai-context/prompts/`.
- Docs chuẩn (single source of truth): `docs/INDEX.md`, `business/`, `architecture/`, `data-models/`, `api-contracts/`, `security/`, `deployment/`, `diagrams/`, `decisions/`, `glossary.md`.
- Services chuẩn: nhiều repo độc lập (`repo_1/`, `repo_2/`, `repo_3/`...) và `scripts/` dùng chung.

## Copilot Default Workflow

- Trước khi viết code, luôn đọc theo thứ tự:
	1. `ai-context/project-context.md` (đọc đầu tiên)
	2. `docs/INDEX.md` rồi mở tài liệu liên quan trong `docs/`
	3. `ai-context/working/sprint-current.md`
	4. `ai-context/working/issues-open.md`
- Nếu code mâu thuẫn docs, ưu tiên docs.
- Ghi bài học mới vào `ai-context/memory/`.
- Khi phù hợp, dùng template trong `ai-context/prompts/` như `feature.md`, `review.md`, `debug.md`, `refactor.md`.
