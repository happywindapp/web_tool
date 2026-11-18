# iframe `srcdoc` kế thừa CSP trang cha — muốn CSP khác thì dùng file riêng

- `srcdoc` iframe dùng chung CSP của trang cha ⇒ trang cha không `'unsafe-eval'` thì D2 (cần eval) trong `srcdoc` cũng chết (`EvalError`).
- Cách đúng: file HTML riêng có `<meta http-equiv="Content-Security-Policy">` của nó, nạp bằng `<iframe sandbox="allow-scripts" src="...">` (không `allow-same-origin`) ⇒ origin `null`, không đọc được `parent.document`/IndexedDB/token của trang cha, Mermaid + D2 vẫn render.
- Trên `file://`, iframe sandbox origin `null` **không nạp được script local** (`Not allowed to load local resource`) ⇒ chỉ bỏ `sandbox` khi chạy `file://` và trang không giữ bí mật (token).
- Kiểm chứng 2026-11-18 bằng headless Chrome (spike One Editor, ADR #21).
