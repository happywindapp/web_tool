---
name: chrome-keyboard-contextmenu-event-has-coords
description: Chrome keyboard-triggered contextmenu (Menu key) has clientX/Y = focused element center and shiftKey=false; raw CDP probe via node WebSocket when puppeteer path is blocked
metadata:
  type: reference
---

Measured 2026-11-23 (headless Chrome, CDP Input.dispatchKeyEvent): ContextMenu key on a focused button fires `contextmenu` with clientX/clientY = center of the element (non-zero), button -1, shiftKey false even when Shift is held. Shift+F10 via CDP fired nothing in headless.

**How to apply:** code using `!e.clientX && !e.clientY` to detect "opened by keyboard" is dead in Chrome (harmless if it only picks menu position); `e.shiftKey` on contextmenu reliably means Shift+mouse. Detect keyboard via `e.button === -1` if ever needed.

Probe without puppeteer (node_modules paths are blocked by the scout hook): spawn chrome.exe `--headless=new --remote-debugging-port=N --user-data-dir=<scratchpad>`, fetch `/json`, talk CDP with Node 24's global `WebSocket`. Related: [[vendor-path-blocked-by-scout-hook]].
