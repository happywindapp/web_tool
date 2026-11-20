---
name: inline-svg-builder-xml-control-chars-and-dup-ids
description: Hand-built SVG strings from user text break on C0 control chars (DOMParser returns html+parsererror) and inline gradient ids collide across hidden panes
metadata:
  type: project
---

Two traps verified with Chrome headless (2026-11-21, One Editor code-image review):
- Escaping only `& < > "` is not enough for SVG/XML built from user text: `\x1b` (ANSI logs) or `\f` make `DOMParser("image/svg+xml")` return documentElement `html` with `<parsererror>`; lone surrogates are tolerated.
- Inline SVGs share the document id space: a visible `fill="url(#bg)"` pointing at a gradient inside an earlier `hidden` (display:none) pane renders no fill.

**Why:** both look fine in single-pane / ASCII tests, fail with real logs or two tabs open.
**How to apply:** when reviewing any tool that builds SVG strings (diagram-editor, one-editor panes), check control-char sanitising and per-instance ids. Probe: `chrome --headless=new --dump-dom file:///probe.html` from the scratchpad. See [[node-probe-harness-tz-and-i18n-check]].
