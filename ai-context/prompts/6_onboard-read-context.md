# Prompt: Context Bootstrap — Lưu protocol vào global memory (chạy 1 LẦN)

> Copy → chạy 1 LẦN lúc setup workspace (hoặc khi cấu trúc thay đổi).
> KHÔNG cần dán lại mỗi session — sau khi lưu, AI TỰ áp dụng protocol bên dưới
> mỗi khi làm việc trong workspace theo cấu trúc này.

## 0. YÊU CẦU LƯU VÀO BỘ NHỚ DÀI HẠN (làm trước tiên)

Lưu "Context Bootstrap Protocol" (mục 1–6 bên dưới) vào global/long-term memory
của bạn, để TỰ ĐỘNG áp dụng cho mọi session sau mà không cần được nhắc lại.
Theo từng tool:

- Claude Code  → ghi 1 memory (`~/.claude/projects/.../memory/` + cập nhật `MEMORY.md`)
  với nội dung: "Trước khi code trong workspace AI-Native, luôn chạy Context
  Bootstrap Protocol (đọc context + `{repo}/readme.md`) — xem
  `ai-context/prompts/6_onboard-read-context.md`."
- Gemini CLI   → ghi vào `GEMINI.md` (cấp global/user nếu có).
- GitHub Copilot → ghi vào `.github/copilot-instructions.md`.
- GPT Codex    → ghi vào `AGENTS.md`.
- Google Antigravity → đã có sẵn ở `.agent/rules/00-context-protocol.md` (always-on);
  bổ sung global nếu cần ở `~/.gemini/AGENTS.md`.
  (Tool không có cơ chế global → lưu ở mức cao nhất tool hỗ trợ.)

Xác nhận ngắn gọn đã lưu vào đâu. KHÔNG sửa file cấu hình của AI tool khác.

---

## Context Bootstrap Protocol (nội dung được lưu & tự áp dụng)

Trước khi viết/sửa BẤT KỲ dòng code nào, BẮT BUỘC đọc theo thứ tự sau và
xác nhận đã nắm ngữ cảnh. KHÔNG bắt đầu code khi chưa hoàn tất bước này.

## 1. Hiểu toàn cảnh (đọc đầu tiên — bắt buộc)

- `ai-context/project-context.md` — mục tiêu + kiến trúc high-level + downstream targets.
- `docs/INDEX.md` — mục lục tài liệu, single source of truth.
- `docs/glossary.md` — thuật ngữ domain, viết tắt, tên riêng của dự án.

## 2. Việc đang làm & ràng buộc hiện tại

- `ai-context/working/sprint-current.md` — việc đang chạy.
- `ai-context/working/issues-open.md` — vấn đề đang mở.
- `ai-context/memory/README.md` — bài học đã rút ra (tránh lặp lỗi cũ).

## 3. Kiến thức repo sẽ đụng tới (BẮT BUỘC trước khi code trong repo đó)

- `{{repo}}/readme.md` — kiến thức tổng hợp của TOÀN BỘ repo source (kiến trúc,
  module, luồng chính, quy ước). Đọc trước khi sửa bất kỳ file nào trong repo.
- Nếu task chạm nhiều repo → đọc `readme.md` của từng repo liên quan.

## 4. Tài liệu chuyên sâu theo loại task (đọc CÓ CHỌN LỌC, đúng việc)

- Logic nghiệp vụ      → `docs/business/`
- Thiết kế hệ thống    → `docs/architecture/`  +  `docs/diagrams/`
- DB / schema / model  → `docs/data-models/`
- Interface giữa service → `docs/api-contracts/`
- Auth / phân quyền    → `docs/security/`
- Deploy / env / CI    → `docs/deployment/`
- Quyết định đã chốt   → `docs/decisions/` (ADR)

## 5. Nếu task chạm DOWNSTREAM target (code thật, root riêng)

Dùng work-context path của project đó, KHÔNG phải `c:/_web_tool`:

- `format-json-xml-html`       → `path/to/your-repo-a` (skill phù hợp với domain của bạn)
- `{{service-b}}`       → `path/to/your-repo-b` (skill phù hợp với domain của bạn)
- `{{gateway-service}}` → `path/to/your-gateway` (skill phù hợp với domain của bạn)
- `N/A (tool chạy 100% client-side, không có backend)`     → skill phù hợp với domain của bạn

## 6. Luật điều phối AI (đã auto-load, nhắc lại để tuân thủ)

- Quy ước & rule điều phối: `CLAUDE.md` (+ `~/.claude/rules/*`).
- DB READ-ONLY. KHÔNG tự `git commit`/`git push`. Diff hẹp, đúng việc.
- YAGNI · KISS · DRY. Comment tối thiểu (1 dòng WHY khi cần). File < ~200 dòng.
- Skills dùng chung: `ai-context/skills/` (tool tự nạp qua junction; không thấy skill → chạy `scripts/link-shared-skills.ps1`).

## Xác nhận trước khi code (in ra cho tôi)

1. Mục tiêu task + downstream target liên quan (root path nào).
2. Các file context/doc ĐÃ đọc ở mục 1–4 (gồm `{{repo}}/readme.md`).
3. Business rule / API contract / data model ràng buộc trực tiếp.
4. Rủi ro / câu hỏi chưa rõ (nếu có) — hỏi trước khi code.

→ Chỉ khi xác nhận xong mới bắt đầu implement.
