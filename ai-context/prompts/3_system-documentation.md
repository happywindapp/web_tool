# Prompt: Generate System Documentation

> Copy → điền biến `{{...}}` → chạy. Một template dùng cho mọi workspace microservices;
> phần **§Trading variant** chỉ kích hoạt khi hệ thống là Trading (sàn giao dịch, OMS...).

**Role:** Bạn là Principal System Architect & Lead Technical Writer.
_(Hệ Trading: thêm "chuyên mảng hệ thống Giao dịch Tài chính — Trading Systems".)_

**Task:** Quét, phân tích toàn bộ repository/thư mục mã nguồn liên quan (cả FE & BE) và tạo tài liệu kỹ thuật toàn diện.

- Phạm vi quét: `{{repo_1, repo_2, ... hoặc "tất cả repo trong workspace"}}`
- Nguồn kiến thức cấp repo: đọc `{{repo}}/readme.md` của từng repo trước (kiến thức toàn bộ repo source) → đối chiếu với mã nguồn thực tế trước khi tổng hợp.
- File đích: `{{SYSTEM_DOCUMENTATION.md}}` (hoặc cập nhật `README_ALL.md` / `doc/README_ALL.md` nếu đã có; xuất kèm `.docx` nếu cần).

## Phần 1: Kiến trúc & Giải thích Source Code
1. Phân tích kiến trúc tổng thể (Microservices, Monolithic, Clean Architecture, MVC, DDD...).
2. Cấu trúc thư mục (tree) các repo FE & BE + giải thích ngắn mục đích từng thư mục.
3. Luồng dữ liệu chính & thành phần cốt lõi (core modules, Auth/Authz, DB schema/ORM, state management FE).
4. Công nghệ, framework, thư viện chính (Database, ORM, Caching).
5. **§Trading variant:** vai trò & Bounded Context từng service (OMS, FIX Gateway, Middleware, STP); cách giao tiếp (REST / gRPC / Message Queue/Kafka).

## Phần 2: Vận Hành, Build & Testing Local
1. **Prerequisites:** công cụ & phiên bản (Node.js, Docker, Database, SDK ngôn ngữ...).
2. **Build & Run Local:** lệnh cài deps, cấu hình `.env`, khởi chạy local FE & BE; nếu có `docker-compose.yml` chung → hướng dẫn chạy toàn hệ thống.
3. **Step-by-step E2E Test** một luồng nghiệp vụ chính đầu→cuối:
   - Thao tác bắt đầu từ FE (click nút nào, điền form ra sao).
   - API nào gọi xuống BE (kèm payload ví dụ).
   - BE xử lý qua service/controller nào.
   - Kết quả lưu DB / trả về FE ra sao.
   - **§Trading variant — luồng "Đặt lệnh" (Place Order):** `{{FE}}`/`{{Admin}}` → `{{Middleware}}` → `{{OMS}}` → `{{FIX Gateway}}` → Database.

## Phần 3: Sơ Đồ (Mermaid.js — chỉ xuất mã raw)
1. **Architecture / System Context (C4):** kết nối FE ↔ BE Services ↔ Database ↔ External API _(Trading: thêm actor Trader/Admin + hệ FIX bên ngoài)_.
2. **Detailed Sequence Diagram:** một request từ Client (FE) → API Gateway → Backend Service → Database và phản hồi ngược lại.
3. **§Trading variant — thêm Sequence:** luồng "Đặt lệnh" xuyên suốt `{{FE}} → {{Middleware}} → {{OMS}} → {{FIX Gateway}} → Database`, và (nếu có) `{{Admin}} → {{STP}} → ... → Database`.

## Yêu cầu định dạng đầu ra
- Viết 100% tiếng Việt, chuyên nghiệp, rõ ràng. Bắt buộc có Table of Contents ở đầu.
- Markdown chuẩn; code block cho lệnh terminal và mã Mermaid.
- Giải thích chi tiết nhưng KHÔNG dông dài quá trình làm — chỉ xuất tài liệu cuối cùng.

---

### Ví dụ điền §Trading variant

> `{{FE}}`=`{{frontend-app}}` · `{{Admin}}`=`{{admin-app}}` · `{{Middleware}}`=`{{middleware-service}}`
> `{{OMS}}`=`{{oms-service}}` · `{{FIX Gateway}}`=`{{fix-gateway}}` · `{{STP}}`=`{{stp-service}}`
> Quét tại root `path/to/your-repo`. Lặp lại tương tự cho từng hệ thống trading khác.
