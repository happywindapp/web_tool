// Phase 14d demo labels; content: PowerDemos in tools/one-editor-extras.js (js/devtools/curl-x509-protobuf-openapi-demos.js).
(() => {
  const LIST = { "curl-convert": "cURL → Python requests (che token / cookie)", "x509-pem": "Chứng chỉ X.509: chuỗi 2 cert + 1 cert hết hạn + khoá riêng", "protobuf-raw": "Protobuf thô (hex) → cây field", "openapi-petstore": "OpenAPI Pet Store → Tài liệu API (lọc, $ref vòng)" };
  for (const [k, label] of Object.entries(LIST)) DEMOS[k] = { label, lazy: true };
})();
