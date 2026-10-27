# Docs Index — Single Source of Truth

> Mục lục điều hướng toàn bộ tài liệu. AI và người dùng dùng chung.

## Bắt đầu từ đâu

- [Project Context](../ai-context/project-context.md) — mục tiêu + kiến trúc high-level (đọc đầu tiên)
- [Service Registry](services-registry.md) — danh sách service theo tier (single source, sinh từ manifest)
- [Glossary](glossary.md) — thuật ngữ domain, viết tắt, tên riêng

## Danh mục tài liệu

| Khu vực | Mô tả | Link |
|---------|-------|------|
| Business | Business rules, luồng xử lý, edge cases | [business/](business/) |
| Architecture | System design, C4, giao tiếp giữa services | [architecture/](architecture/) |
| Data Models | ERD, schema, migration, naming | [data-models/](data-models/) |
| API Contracts | OpenAPI/Swagger, interface giữa services | [api-contracts/](api-contracts/) |
| Security | Auth flows, permission matrix, patterns bắt buộc | [security/](security/) |
| Deployment | Deploy guide, CI/CD, env vars, runbooks | [deployment/](deployment/) |
| Diagrams | Sequence / flow / infra (mermaid + ảnh export) | [diagrams/](diagrams/) |
| Decisions | ADR — quyết định kiến trúc đã chốt + lý do | [decisions/](decisions/) |

## Quy ước

- Tài liệu sống ở đây; KHÔNG nhân bản trong từng repo.
- Khi đổi contract / data model / pattern → cập nhật ngay file tương ứng.
