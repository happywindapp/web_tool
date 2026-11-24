---
name: one-editor-boot-order-and-stale-tab-reveal
description: One Editor review traps — Docs.on listeners registered after HotExit.restore miss restored tabs; revealLine on a stale (F5) file tab lands on line 1
metadata:
  type: project
---

app-boot.js runs `await HotExit.restore()` BEFORE later `X.init()` calls (Pinned, BookmarkFiles, Groups). A `Docs.on` listener registered in those inits misses the restore's `create` events and the `Docs.remove` of orphan tabs (hot-exit-session.js "Tabs missing from the layout").

After F5 clean file tabs are `stale` with text "" until `FileOpen.reload` (async; only asks permission on a host pointerdown or `reload(d, true)`). `Views.revealLine` on such a tab clamps to line 1, and the reload's re-activate resets the selection anyway.

**Why:** found reviewing the bookmarks side panel (2026-11-24); headless OPFS tests grant permission so they hide the permission half.
**How to apply:** any new "jump to line N of tab X" or Docs.on-based store in One Editor — check stale tabs and init order vs HotExit.restore. See [[headless-opfs-stands-in-for-file-picker]].
