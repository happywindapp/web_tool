# Service Registry

> **Single source of truth** cho danh sách service. KHÔNG sửa bảng tay — sửa `services` trong
> `template.config.json` rồi chạy `pwsh scripts/apply-template.ps1`. Mọi doc khác tham chiếu file này.

## Services (theo tier)

<!-- BEGIN gen:services-registry -->
| Key | Service | Tier | Stack | Repo | Base URL env |
|-----|---------|------|-------|------|--------------|
| `format-json-xml-html` | format-json-xml-html | frontend | HTML5 · CSS · vanilla JS (1 file tự chứa, không build, không dependency) | `_tools/format-json-xml-html.html` | `N/A (mở file trực tiếp)` |
<!-- END gen:services-registry -->

## Tier — ý nghĩa

| Tier | Vai trò |
|------|---------|
| `frontend` | Web/mobile app người dùng cuối |
| `bff` | Backend-for-frontend / API gateway / edge |
| `gateway` | Reverse proxy / ingress (nếu tách khỏi bff) |
| `domain` | Service nghiệp vụ (mỗi bounded context 1 service) |
| `integration` | Adapter hệ ngoài (bank, SOAP, message protocol…) |
| `infra` | CI/CD, observability, shared contracts (proto/OpenAPI) |

## Env theo tier

Không có — tool chạy client-side. Khối `gen:env` đã gỡ khỏi [server-config.example.md](../server-config.example.md).
