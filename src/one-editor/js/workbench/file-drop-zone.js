// Drag & drop: files dropped on View 1 / View 2 open there (elsewhere: the focused view), a folder becomes the Explorer tree, a dragged tab moves to the view it is dropped on; on a writable folder tab ExplorerDnd copies them in instead.
const FileDrop = (() => {
  const types = e => [...(e.dataTransfer?.types || [])];
  const isTab = e => types(e).includes(TabStrip.TAB_TYPE);
  const isFiles = e => types(e).includes("Files");
  let over = null;
  const mark = el => { if (over === el) return; over?.classList.remove("drop-target"); over = el; over?.classList.add("drop-target"); };

  // Handles / entries must be read during the drop event: the DataTransfer is emptied once it returns.
  function takeItems(dt) {
    return [...dt.items].filter(i => i.kind === "file").map(i => ({
      handle: typeof i.getAsFileSystemHandle === "function" ? i.getAsFileSystemHandle() : null,
      entry: typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null,
      file: i.getAsFile(),
    }));
  }

  async function openDropped(items, gi) {
    const files = [];
    let folder = false;
    for (const it of items) {
      const h = it.handle ? await it.handle.catch(() => null) : null;
      if (h && h.kind === "directory") { Explorer.setRoot(LocalFs.fromHandle(h)); folder = true; }
      else if (!h && it.entry && it.entry.isDirectory) { Explorer.setRoot(LocalFs.fromEntry(it.entry)); folder = true; }
      else if (it.file) files.push({ file: it.file, handle: h });
    }
    if (files.length) await FileOpen.openMany(files, gi);
    if (folder) { StatusBar.msg(T("Đã mở folder trong Explorer."), "good"); if (!files.length) PhoneLayout.show(0); }
  }

  function init() {
    document.addEventListener("dragover", e => {
      if (!isFiles(e) && !isTab(e)) return;
      e.preventDefault();
      const grp = isTab(e) && Groups.dropSec(e.target);
      e.dataTransfer.dropEffect = isTab(e) && !grp ? "move" : "copy";
      mark(grp || (isFiles(e) && ExplorerDnd.takesFiles(e.target) ? null : e.target.closest?.(".group, #explorerPane") || null));
    }, true);
    document.addEventListener("dragleave", e => { if (!e.relatedTarget) mark(null); }, true);
    document.addEventListener("dragend", () => mark(null), true);
    // Capture phase: CodeMirror would otherwise paste a dropped file's text into the document.
    document.addEventListener("drop", e => {
      if (!isFiles(e) && !isTab(e)) return;
      e.preventDefault();
      e.stopPropagation();
      mark(null);
      const g = e.target.closest?.(".group"), gi = g ? +g.dataset.group : -1;
      const grp = Groups.dropSec(e.target);
      if (isTab(e) && grp) { Groups.dropDoc(grp, e.dataTransfer.getData(TabStrip.TAB_TYPE)); return; }
      if (isTab(e)) { if (gi >= 0) Views.move(e.dataTransfer.getData(TabStrip.TAB_TYPE), gi); return; }
      const items = takeItems(e.dataTransfer);
      if (ExplorerDnd.dropFiles(e.target, items)) return;
      openDropped(items, gi >= 0 ? gi : Views.focused)
        .catch(err => StatusBar.msg(T("Kéo-thả lỗi: {msg}", { msg: err.message }), "bad"));
    }, true);
  }

  return { init };
})();
