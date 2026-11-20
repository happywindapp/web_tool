---
name: node-probe-harness-tz-and-i18n-check
description: How to verify One Editor pure-module findings in node (vm harness, DST via process.env.TZ, i18n missing-string scan) on this Windows box
metadata:
  type: reference
---

- Pure modules load the way `src/one-editor/tests/*.test.js` loads them: `vm.createContext({ T, I18n:{lang:"en",num:String}, Intl })` + concatenate files. Copy that header into a scratchpad probe to reproduce a finding.
- DST tests: `TZ=America/New_York node x.js` from Git Bash does NOT take effect (it still printed Asia/Bangkok). Use `node -e "process.env.TZ='America/New_York';require('x.js')"` instead.
- i18n scan: eval every `src/one-editor/js/i18n/en-*.js` with a fake `I18n.add`, then regex-scan string literals that contain Vietnamese letters and are missing from the dict. Shared entries come from `../data-workbench/js/i18n/en-shared-theme-sessions-filters.js` (for example "Đóng").
- Write regex-heavy probe scripts with the Write tool. A bash heredoc mangled `\\\n` inside a regex literal (see [[vendor-path-blocked-by-scout-hook]] for other shell pitfalls).
