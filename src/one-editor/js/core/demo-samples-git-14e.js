// Phase 14e demo labels; content: PowerDemos in tools/one-editor-extras.js (js/editor/git-conflict-patch-demos.js).
(() => {
  const LIST = { "git-conflict": "Conflict Git: 2 khối (1 kiểu diff3) + Markdown có “=======” không phải conflict", "patch-apply": "Patch 2 file → áp vào tab (1 hunk lệch 3 dòng)" };
  for (const [k, label] of Object.entries(LIST)) DEMOS[k] = { label, lazy: true };
})();
