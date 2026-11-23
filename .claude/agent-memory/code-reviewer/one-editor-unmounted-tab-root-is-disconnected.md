---
name: one-editor-unmounted-tab-root-is-disconnected
description: One Editor list tabs (folder/results) restored by hot exit but never active have ui.root outside the DOM — isConnected is not a "tab closed" test
metadata:
  type: project
---

`FolderItems.adopt` / `newTab` builds `t.ui.root` but `mount(g)` appends it only for the active tab of a view; inactive restored tabs stay detached until first activated. Mounted-then-hidden tabs stay connected (`hidden = true`).

**Why:** module-level registries that prune with `!t.ui.root.isConnected` (seen in phase 11b FolderFilter.tabs / FolderPreview.panes) drop live tabs at boot because `Tags.load()` fires change listeners right after `HotExit.restore()`.

**How to apply:** when reviewing per-tab registries or listeners in `src/one-editor/js/workbench/explorer-*`, flag isConnected-based cleanup; the correct signal is the `Docs.on("remove")` handler. Also document-wide `querySelectorAll(".fi-list > .fi-row")` misses rows of detached tabs.
