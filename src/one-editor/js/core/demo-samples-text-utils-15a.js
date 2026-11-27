// Phase 15a demo labels; content: PowerDemos in tools/one-editor-extras.js (js/extras/text-utilities-demos.js).
(() => {
  const LIST = {
    "case-styles": "Đổi kiểu chữ: camel · snake · CONSTANT · dot (chuột phải ▸ Aa)",
    "wrap-sql-in": "Bọc dòng: 1.200 id → SQL IN chia 2 lô 1.000",
    "extract-ips-urls": "Trích URL / email / IPv4 / IPv6 từ log lộn xộn",
    "slug-html-text": "Slug bỏ dấu tiếng Việt + HTML → văn bản",
    "number-words-vi": "Số → chữ tiếng Việt (có “đồng”)",
    "encoders-hmac-cidr": "Encoder: HMAC-SHA256 · CIDR · UUID v7 / ULID",
  };
  for (const [k, label] of Object.entries(LIST)) DEMOS[k] = { label, lazy: true };
})();
