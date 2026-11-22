# Chi phí parse JS theo dung lượng + chi phí kiểm cú pháp theo ngôn ngữ (đo 2026-11-22)

## 1. Parse + compile JS theo dung lượng

Đo bằng Chrome headless, `file://`, nạp `<script src>` từ vendor thật, trung vị 3 lần, không có code cache:

| MB | CPU 1× | CPU 4× |
|---|---|---|
| 1,2 (codemirror-languages) | 34 ms | 48 ms |
| 1,7 (CM core + languages) | 73 ms | 181 ms |
| 3,2 (plantuml) | 283 ms | 300 ms |
| 5,2 (mermaid) | 248 ms | 414 ms |
| 7,8 (d2, phần lớn là chuỗi base64 WASM) | 95 ms | 118 ms |
| 10,4 (gộp 9 gói) | 439 ms | 935 ms |

- Khoảng **90 ms/MB code ở CPU 4×**; chuỗi/dữ liệu rẻ hơn code nhiều. One Editor tải đầu ~1 MB sẵn sàng trong 1,3–1,5 s ở CPU 4×, phần lớn thời gian là chạy code boot chứ không phải parse.
- Nâng trần file chính lên 2/3/5/10 MB làm mobile tầm trung chậm thêm khoảng 0,1–0,2 / 0,2–0,3 / 0,4–0,6 / 0,9–1,5 s, máy yếu gấp đôi. Chi phí lớn hơn là **tải mạng lần đầu** (10 MB ≈ 3 MB gzip ≈ 2,5 s ở 4G) và **RAM** (iOS Safari dễ reload tab).
- Tốc độ chạy tính năng sau khi nạp **không phụ thuộc dung lượng**; chỉ khựng lần gọi đầu (compile lười).
- ⇒ Giữ trần 1 MB, tính năng nặng tách bundle nạp lười (xem `one-editor-size-budget-lazy-bundles-vendor-rebuild.md`).

## 2. Kiểm cú pháp không chạy code

- **0 KB thêm, dùng Lezer có sẵn:** đếm node `type.isError` sau `ensureSyntaxTree`. Bắt được lỗi cấu trúc ở C++, Java, Python, JS, TS, Go, SQL, Rust, PHP. Parse 200 KB mất 100–210 ms. **C#, Kotlin** là legacy mode nên không bắt được gì. Giới hạn: không có message, dòng báo có thể lệch 1 dòng, không bắt lỗi kiểu dữ liệu.
- JS/TS cần message chuẩn ⇒ dùng parser Prettier đã vendor (`typescript.js` 881 KB, `babel.js` 311 KB).
- Gói thêm (raw): C# Lezer `@replit/codemirror-lang-csharp` 134 KB. tree-sitter: runtime 256 KB + grammar (go 230, java 420, python 465, js 632, c 774, php 794, rust 800, ts 2288, c_sharp 3885, kotlin 3958, cpp 4554 KB). `node-sql-parser` theo dialect 260–339 KB.
- Kiểm kiểu thật (TypeScript compiler ~8–9 MB, Pyodide, JVM/Roslyn WASM) quá nặng cho tool offline.
