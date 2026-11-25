// Phase 14c demo labels; content: PowerDemos in tools/one-editor-extras.js (js/log/log-domain-demos.js).
(() => {
  const LIST = { "log-merge": "Gộp 3 log lệch giờ + histogram (có stack trace)", "fix-lifecycle": "FIX: vòng đời lệnh New → Replace → Partial → Filled (+1 chuyển lạ)", "swift-mt540": "SWIFT MT540: chi tiết + kiểm 16R/16S (1 bản lỗi)" };
  for (const [k, label] of Object.entries(LIST)) DEMOS[k] = { label, lazy: true };
})();
