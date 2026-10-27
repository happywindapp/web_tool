# Note

Ghi chú nháp cá nhân. Không phải source of truth — tài liệu chính thức nằm ở `docs/`.

---

## Cấu trúc thư mục chuẩn (AI-Native Project)

Mô hình tổ chức để **AI Agent và Người** dùng chung một nguồn tài liệu. Chia làm 4 nhóm: **AI auto-load** · **AI context** · **Docs** · **Services**.

```
project-root/
│
│   ━━━━━━━━━━━ AI AUTO-LOAD (mỗi AI tự đọc khi khởi động) ━━━━━━━━━━━
│
├── .github/
│   └── copilot-instructions.md   # Copilot (VS Code) tự đọc. Ngắn gọn: stack, conventions, patterns.
│
├── CLAUDE.md                     # Claude Code tự đọc. Tóm tắt project + trỏ tới docs/ & ai-context/.
├── GEMINI.md                     # Gemini CLI tự đọc. Tương tự CLAUDE.md.
├── AGENTS.md                     # GPT Codex CLI tự đọc. Tương tự CLAUDE.md.
│
│   ━━━━━━━━━━━ AI CONTEXT (bối cảnh động cho AI) ━━━━━━━━━━━
│
├── ai-context/
│   ├── project-context.md        # Mục tiêu cốt lõi + kiến trúc high-level. AI đọc ĐẦU TIÊN để nắm "hồn cốt" dự án.
│   │
│   ├── working/                  # Trạng thái hiện tại — cập nhật hàng ngày / mỗi sprint.
│   │   ├── sprint-current.md     #   Task list đang làm. Inject vào prompt khi cần AI hiểu việc hiện tại.
│   │   └── issues-open.md        #   Bugs & blockers đang mở. Cập nhật khi tạo/đóng issue.
│   │
│   ├── memory/                   # AI ghi lại bài học (vd: lỗi build hay gặp) để lần sau không lặp lại.
│   │
│   └── prompts/                  # Prompt templates tái sử dụng. Copy → điền biến → chạy.
│       ├── 1_init-ai-native-workspace.md          #   Setup: dựng khung thư mục chuẩn (1 lần).
│       ├── 2_autofill-workspace-from-codebase.md  #   Setup: quét code → điền docs + {repo}/readme.md.
│       ├── 3_system-documentation.md              #   Setup: sinh tài liệu hệ thống toàn diện.
│       ├── 4_sync-docs-from-context.md            #   Đối chiếu docs cũ vs code → cập nhật drift.
│       ├── 5_remember-standard-structure-to-memory.md # Lưu cấu trúc chuẩn vào memory (1 lần/AI).
│       ├── 6_onboard-read-context.md              #   Lưu Context Bootstrap Protocol vào memory (1 lần/AI).
│       ├── feature.md            #   Task: implement feature mới.
│       ├── review.md             #   Task: review code / PR.
│       ├── debug.md              #   Task: debug bug phức tạp.
│       └── refactor.md           #   Task: refactor module.
│
│   ━━━━━━━━━━━ DOCS (SINGLE SOURCE OF TRUTH — AI & Người dùng chung) ━━━━━━━━━━━
│
├── docs/
│   ├── INDEX.md                  # Mục lục điều hướng — link tới toàn bộ tài liệu bên dưới.
│   │
│   ├── business/                 # Nghiệp vụ cốt lõi: business rules, luồng xử lý, edge cases.
│   ├── architecture/             # System design tổng thể, C4 models, luồng giao tiếp giữa services.
│   ├── data-models/              # ERD, DB schema, migration rules, naming. Source of truth về data structure.
│   ├── api-contracts/            # OpenAPI/Swagger specs. BE & FE sync từ đây. AI generate đúng types/endpoints.
│   ├── security/                 # Security policies, auth flows, permission matrix, validation/rate-limit patterns.
│   ├── deployment/               # Hướng dẫn deploy, CI/CD pipeline, env vars, runbooks khi có incident.
│   ├── diagrams/                 # Diagrams (sequence/flow/infra). Lưu cả file gốc (draw.io/mermaid) lẫn ảnh export.
│   ├── decisions/                # ADR — ghi quyết định kiến trúc đã chốt. AI hiểu TẠI SAO code viết như vậy.
│   └── glossary.md               # Định nghĩa thuật ngữ: domain terms, viết tắt, tên riêng. Dùng đúng ngôn ngữ team.
│
│   ━━━━━━━━━━━ SERVICES (mã nguồn) ━━━━━━━━━━━
│
├── repo_1/                       # Git repo riêng (BE / FE / service...).
│   └── readme.md                 #   Kiến thức TOÀN BỘ repo source. AI đọc TRƯỚC khi code trong repo.
├── repo_2/                       # Tương tự repo_1 (mỗi repo có readme.md riêng).
│   └── readme.md                 #   Kiến thức TOÀN BỘ repo source. AI đọc TRƯỚC khi code trong repo.
├── repo_3/                       # Tương tự repo_1 (mỗi repo có readme.md riêng).
│   └── readme.md                 #   Kiến thức TOÀN BỘ repo source. AI đọc TRƯỚC khi code trong repo.
│
├── scripts/                      # Scripts dùng chung: setup môi trường, seed data, migration, gen api-contracts, sync services.
├── plans/                        # Kế hoạch & report do AI sinh (planner/research). Theo sprint/task.
│
└── note.md                       # Ghi chú nháp cá nhân (file này).
```

### Quy tắc đọc nhanh cho AI

1. `ai-context/project-context.md` → nắm toàn cảnh.
2. `docs/INDEX.md` → tra cứu tài liệu chi tiết.
3. `ai-context/working/sprint-current.md` → biết việc đang làm.
4. `ai-context/memory/` → tránh lặp lại lỗi cũ.
5. `{repo}/readme.md` → kiến thức repo, đọc TRƯỚC khi code trong repo đó.

---

## Bảng prompt templates (`ai-context/prompts/`)

| Prompt                                      | Vai trò                                                                                                  | Trigger                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `1_init-ai-native-workspace`              | Dựng khung thư mục chuẩn AI-Native Workspace                                                          | 1 lần, lúc khởi tạo workspace                                                                            |
| `2_autofill-workspace-from-codebase`      | Quét code thật → điền nội dung docs còn trống                                                     | Sau khi có khung, docs còn rỗng (bootstrap 1 lần)                                                        |
| `3_system-documentation`                  | Sinh tài liệu hệ thống toàn diện (đa repo FE+BE, Mermaid C4/sequence)                              | Khi cần tài liệu kỹ thuật đầy đủ cho cả hệ thống                                                 |
| `4_sync-docs-from-context`                | Đối chiếu docs cũ với code + memory → cập nhật phần drift                                        | Theo sự kiện: sau khi xong feature/phase, cuối sprint, khi onboard thấy docs lệch, trước khi chạy #3 |
| `5_remember-standard-structure-to-memory` | Bắt AI lưu cấu trúc chuẩn vào memory dài hạn                                                      | 1 lần/AI / khi đổi cấu trúc chuẩn                                                                      |
| `6_onboard-read-context`                  | Lưu "Context Bootstrap Protocol" vào memory → AI TỰ đọc context (context + readme repo) mỗi phiên | 1 lần/AI / khi đổi cấu trúc chuẩn (sau đó tự áp dụng mỗi phiên, không chạy lại)              |

> Trigger của #6 là **event-driven**, không theo lịch ngày/tuần. Lưới an toàn theo lịch (nếu cần): cuối sprint / cuối tháng.
