// Phase 9 demo labels; content + follow-up step: PowerDemos (lazy bundle).
(() => {
  const LIST = {
    "cron": "Cron: giải thích + lần chạy kế", "sql-from-data": "CSV / JSON → SQL INSERT", "json-schema": "JSON → JSON Schema (2020-12)",
    "batch-replace": "Thay hàng loạt (regex / chuỗi)", "unicode-invisible": "Ký tự vô hình (zero-width, NBSP, SOH…)", "markdown-table": "Bảng Markdown: TSV → bảng, căn cột, mục lục",
    "recipe-base64-gzip-json": "Recipe: Base64 → gunzip → JSON", "regex": "Regex tester: nhóm bắt, thay thế", "run-html": "Chạy HTML / JS + console",
    "run-js": "Chạy JS (dừng vòng lặp vô hạn)", "code-image": "Code → ảnh (PNG / SVG)",
  };
  for (const [k, label] of Object.entries(LIST)) DEMOS[k] = { label, lazy: true };
})();
