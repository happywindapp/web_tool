---
name: review-files-change-mid-review
description: One Editor (web_tool) reviews run while the implementer keeps editing src/one-editor — re-read files before reporting, and check T() strings against js/i18n dictionaries
metadata:
  type: feedback
---

Re-read every file under review right before writing findings; in web_tool the implementer edits src/one-editor concurrently (seen 2026-11-20, phase 6a review: replace/sources/export files changed between first read and report).

**Why:** findings against a stale read cite wrong lines or already-fixed bugs.

**How to apply:** after scouting, run a quick node script (in scratchpad) that extracts `T("…")` strings from changed files and checks they exist in `src/one-editor/js/i18n/*.js` — rewritten strings often lose their English entry (ADR #8 requires bilingual UI). Bash commands containing "vendor" are hook-blocked; use Grep/Read for tools/vendor and scripts/vendor-*.ps1.
