# `ai-context/skills/` — Skills dùng chung cho MỌI AI tool

> Nơi chứa **duy nhất** (canonical) các Agent Skills theo [chuẩn mở SKILL.md](https://developers.openai.com/codex/skills).
> Các AI tool đọc skill qua **junction** trỏ về đây — tạo bằng `pwsh scripts/link-shared-skills.ps1` (chạy 1 lần sau clone).

## Tool nào đọc từ đâu

| Junction (gitignored) | Tool đọc |
|-----------------------|----------|
| `.agents/skills/` | GPT Codex CLI, Copilot CLI (native convention) |
| `.claude/skills/` | Claude Code (project-level) |
| `.github/skills/` | GitHub Copilot (VS Code agent mode) |
| `.agent/skills/` | Google Antigravity |
| `.gemini/skills/` | Gemini CLI |

## Quy ước viết skill (để chạy được mọi tool)

- Mỗi skill = 1 thư mục kebab-case + `SKILL.md` (frontmatter chỉ `name` + `description`), tuỳ chọn `references/`, `scripts/`.
- `description` phải nói rõ **khi nào** agent kích hoạt skill (trigger keywords).
- CHỈ dùng chuẩn mở — tránh feature riêng từng tool (context forking của Claude, `openai.yaml` của Codex).
- Skill cá nhân xuyên-project (không thuộc project này) vẫn đặt ở `~/.claude/skills/` như cũ.

## Lưu ý

- Junction KHÔNG commit (đã gitignore) → tính năng **server-side** (Copilot cloud agent / code review trên github.com) không thấy skill. Nếu cần, copy skill đó thành file thật trong `.github/skills/` và bỏ ignore riêng nó.
- Nếu junction bị mất (clone mới, checkout máy khác) → chạy lại `scripts/link-shared-skills.ps1`.
