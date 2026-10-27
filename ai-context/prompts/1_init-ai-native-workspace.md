# Prompt: Init AI-Native Workspace

> Copy → chạy ở thư mục gốc workspace. Dùng để dựng khung chuẩn "AI-Native Workspace" cho hệ Microservices.

Hãy khởi tạo và tái cấu trúc thư mục dự án hiện tại theo chuẩn **AI-Native Workspace** cho hệ thống Microservices.

## QUY TẮC AN TOÀN
1. TUYỆT ĐỐI KHÔNG thay đổi / di chuyển / xóa bất kỳ thư mục mã nguồn / git repo nào hiện có (`repo_1`, `repo_2`, `src`...).
2. Chỉ TẠO THÊM thư mục/file mới (trống hoặc chú thích cơ bản) nếu chưa tồn tại — không ghi đè.
3. Nếu là AI có quyền thực thi file system → tạo trực tiếp.

## CẤU TRÚC MỤC TIÊU

```text
├── .github/copilot-instructions.md   # [AUTO-LOAD] Copilot — stack, conventions, patterns
├── CLAUDE.md                         # [AUTO-LOAD] Claude — tóm tắt + pointer docs/ + ai-context/
├── GEMINI.md                         # [AUTO-LOAD] Gemini CLI — tương tự CLAUDE.md
├── ai-context/
│   ├── project-context.md            # Mục tiêu cốt lõi + kiến trúc high-level (đọc đầu tiên)
│   ├── working/
│   │   ├── sprint-current.md         # Task list hiện tại
│   │   └── issues-open.md            # Bugs / blockers đang mở
│   ├── memory/                       # AI ghi bài học (lỗi build hay gặp...)
│   ├── prompts/                      # Prompt templates: feature / review / debug / refactor
│   └── skills/                       # SKILLS DÙNG CHUNG mọi AI (chuẩn mở SKILL.md)
├── docs/                             # SINGLE SOURCE OF TRUTH (AI + người dùng)
│   ├── INDEX.md                      # Mục lục điều hướng
│   ├── business/                     # Business rules, luồng xử lý, edge cases
│   ├── architecture/                 # System design, C4, giao tiếp giữa services
│   ├── data-models/                  # ERD, schema, migration, naming
│   ├── api-contracts/                # OpenAPI/Swagger, interface giữa services
│   ├── security/                     # Auth flows, permission matrix, patterns bắt buộc
│   ├── deployment/                   # Deploy guide, CI/CD, env vars, runbooks
│   ├── diagrams/                     # Sequence/flow/infra (file gốc + ảnh export)
│   ├── decisions/                    # ADR — quyết định kiến trúc + lý do
│   └── glossary.md                   # Thuật ngữ domain, viết tắt, tên riêng
├── repo_1/ repo_2/ repo_3/           # Git repo service (KHÔNG đụng tới)
│   └── readme.md                     #   mỗi repo: kiến thức TOÀN BỘ repo source (đọc trước khi code)
├── scripts/                          # Script chung: setup, seed, migration, gen-contracts
│   └── link-shared-skills.ps1        #   junction skills → mọi AI tool (chạy 1 lần/clone)
└── note.md                           # Ghi chú nháp cá nhân
```

## Yêu cầu
- Tạo từng thư mục/file còn thiếu; file scaffold ghi chú ngắn mục đích (placeholder `{{...}}` cho phần chưa biết).
- **Skills dùng chung:** sau khi tạo `ai-context/skills/`, tạo junction để mọi AI tool đọc chung:
  chạy `scripts/link-shared-skills.ps1` nếu có; nếu chưa có script → tạo junction
  `.agents/skills`, `.claude/skills`, `.github/skills`, `.agent/skills`, `.gemini/skills` → `ai-context/skills`
  (`New-Item -ItemType Junction`, không cần admin) và thêm 5 đường dẫn junction vào `.gitignore`.
- Báo cáo: đã tạo gì, giữ nguyên gì. Không tự xóa file cũ.
