// Phase 14f demo labels; content: PowerDemos in tools/one-editor-extras.js (js/extras/file-checksum-demos.js).
(() => {
  const LIST = { "checksum-verify": "Kiểm tra checksum: file .sha256 với 3 tab (1 sai hash, 1 thiếu file)" };
  for (const [k, label] of Object.entries(LIST)) DEMOS[k] = { label, lazy: true };
})();
