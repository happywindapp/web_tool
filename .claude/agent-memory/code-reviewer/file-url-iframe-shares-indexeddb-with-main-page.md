---
name: file-url-iframe-shares-indexeddb-with-main-page
description: Chrome file:// iframe without sandbox attr is DOM-cross-origin but shares IndexedDB (storage key file://) with the main page; workers it spawns too
metadata:
  type: project
---

Measured 2026-11-21 (Chrome 157, headless puppeteer): in One Editor on file://, a Worker created from a blob by the unsandboxed `one-editor-preview-sandbox.html` iframe reports `self.origin === "null"` yet opens `web_tool.one-editor` IndexedDB (all stores). A nested `srcdoc sandbox="allow-scripts"` iframe is denied IDB/localStorage.

**Why:** ADR #21 drops `sandbox` on file:// (local scripts won't load otherwise), assuming "file:// is already its own opaque origin" — true for DOM, false for storage.

**How to apply:** when reviewing any code-execution path inside that sandbox page on file://, check storage access, not just DOM; run untrusted code in a sandboxed srcdoc child instead. Probe recipe: [[vendor-path-blocked-by-scout-hook]] (headless Chrome).
