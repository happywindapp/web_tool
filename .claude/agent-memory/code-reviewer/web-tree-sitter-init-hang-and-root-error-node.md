---
name: web-tree-sitter-init-hang-and-root-error-node
description: web-tree-sitter 0.22 pitfalls found reviewing One Editor syntax check - init() never rejects on WASM failure, root node itself can be ERROR
metadata:
  type: reference
---

web-tree-sitter 0.22.x (vendored in tools/vendor/syntax-check-parsers-1, used by SyntaxEngines):

- `TreeSitter.init()` caches `initPromise = new Promise(resolve => ...)`; if `WebAssembly.instantiate` fails (CSP without 'wasm-unsafe-eval', old Safari) emscripten `abort()` throws inside a `.then` -> initPromise hangs forever, never rejects. `.catch(() => reset)` retry code is dead; only `onAbort` in moduleOptions surfaces it.
- Walking only `rootNode.children` misses errors when `rootNode.type === "ERROR"` (e.g. ~20+ nested unclosed calls in Java/Python, ~30 parens in Go) -> zero diagnostics.
- `startIndex` is UTF-16 code units (matches JS string offsets), verified with Vietnamese text.
- Probe in node: vm context + `Uint8Array` created inside the context (cross-realm Uint8Array fails `instanceof` -> Language.load falls to `fetch`).

Related: [[node-probe-harness-tz-and-i18n-check]], [[vendor-path-blocked-by-scout-hook]] (use Grep tool with `-o` + `.{0,200}` windows to read minified vendor code).
