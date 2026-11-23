---
name: isomorphic-git-statusmatrix-readonly-facts
description: isomorphic-git 1.44.x facts for reviewing the One Editor git overlay — refresh option, index writes, gitlinks, stat compare, cache retention
metadata:
  type: reference
---

Verified against raw.githubusercontent.com/isomorphic-git/isomorphic-git/v1.44.11/src (tools/vendor is off-limits to read).

- `statusMatrix({ refresh })` (default true) passes it to `WORKDIR({ refresh })`; GitWalkerFs.oid() only queues `index.insert` (⇒ `.git/index` write) when refresh is true. `refresh:false` = no index write.
- `compareStats` compares mtime/ctime seconds AND nanoseconds, uid, gid, size, mode (if core.filemode), ino (trustino = true in browsers, `process` undefined).
- autocrlf IS applied (content() reads core.autocrlf and passes `{autocrlf}` to fs.read); `.gitattributes` eol is not.
- map returns `null` for HEAD/STAGE type `commit` (submodule gitlink) ⇒ no row and children not walked ⇒ submodule content looks "not listed".
- The shared `cache` object keeps parsed pack indexes + whole pack buffers across calls (memory held as long as the cache lives).

How to apply: when reviewing [[node-probe-harness-tz-and-i18n-check]]-style pure-module tests or the GitStatus overlay, check refresh:false stays, gitlinks/submodules, and cache lifetime.
