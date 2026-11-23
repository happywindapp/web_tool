---
name: explorer-folder-listing-silent-5000-cap
description: One Editor Explorer.loadKids / LocalFs list() silently stops at MAX_ENTRIES=5000 per folder — any scan/compare/sync must flag it as incomplete
metadata:
  type: project
---

`LocalFs.fromHandle(...).list()` breaks at `LocalFs.MAX_ENTRIES` (5000) with no flag; `Explorer.loadKids` caches that truncated list. Find in files reports it (`st.cut`), but 11e scans (DirCompare/FileSearch/DupFinder) did not as of 2026-11-23.

**Why:** a truncated listing makes folder compare report false ⬅/➡ rows while `complete` stays true — sync with "delete extra" can then bin real files.

**How to apply:** when reviewing any new Explorer walker/compare/sync, check `kids.length >= LocalFs.MAX_ENTRIES` handling. Also check undo paths that call `TrashStore.put` before `restoreIds` (TrashQuota.drops evicts the oldest records first, which may be the backup being restored). Related: [[isomorphic-git-statusmatrix-readonly-facts]].
