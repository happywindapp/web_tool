# `.agent/` — Google Antigravity extension point

> Thư mục native của **Google Antigravity** (agentic IDE, Gemini 3). Antigravity tự nạp:
> - `.agent/rules/*.md` — **rules** always-on (ràng buộc, được inject vào mọi agent run).
> - `.agent/workflows/*.md` — **workflows** (prompt lưu sẵn / quy trình nhiều bước, gọi theo tên trong Agent Manager).

## Antigravity đọc gì trong workspace này

| Nguồn | Vai trò | Antigravity tự nạp? |
|-------|---------|---------------------|
| `AGENTS.md` (root) | Rule cross-tool (cũng dùng cho Codex) | ✅ |
| `GEMINI.md` (root) | Rule Antigravity-specific (ưu tiên cao hơn AGENTS.md) | ✅ |
| `.agent/rules/*.md` | Rule chi tiết theo concern | ✅ |
| `.agent/workflows/*.md` | Workflow gọi theo tên | ✅ (invoke thủ công) |
| `.agent/skills/` | Skills dùng chung — junction → `ai-context/skills/` (gitignored, tạo bởi `scripts/link-shared-skills.ps1`) | ✅ (load theo relevance) |
| `ai-context/`, `docs/` | Single source of truth (đọc theo rule 00) | qua rule, không auto |

## Nguyên tắc (DRY)

- **KHÔNG nhân bản** nội dung từ `docs/` hay `ai-context/` vào đây — rule/workflow chỉ **trỏ** tới single source of truth.
- Guardrails (DB read-only, no auto git) sống đầy đủ trong `AGENTS.md`; ở đây nhắc bản rút gọn vì Antigravity **không** đọc `~/.claude/rules/*`.
- Workflow = wrapper mỏng của `ai-context/prompts/` — sửa nội dung ở `ai-context/prompts/`, không sửa 2 nơi.

## Bật nested rules (tuỳ chọn)

Để Antigravity nạp `AGENTS.md` trong thư mục con: **Settings → Agent → Load nested AGENTS.md files**.
