// Explorer undo like Windows Ctrl+Z (focus in the Explorer, a folder tab or the recycle bin): each disk action pushes its reverse — rename back, move back, created ⇒ recycle bin, deleted ⇒ restored. Memory only, 30 steps.
const ExplorerUndo = (() => {
  const stack = [], MAX = 30;
  // A failure the step already reported.
  const shown = () => Object.assign(new Error(""), { shown: true });
  // Handle + parent handle → the node shape the disk actions take (path: the parent folder, for messages and the bin).
  const like = (handle, parent, path = "") => ({ name: handle.name, dir: handle.kind === "directory", handle, parent: { handle: parent, path } });

  function push(label, run) {
    const s = { label, run };
    stack.push(s);
    if (stack.length > MAX) stack.shift();
    return s;
  }
  const last = () => stack.at(-1)?.label ?? null;

  // s: the step a status bar link was made for — a newer action since ⇒ Ctrl+Z goes step by step instead. One step at a time: the next one may depend on it.
  let running = false;
  async function undo(s = null) {
    if (running) { StatusBar.msg(T("Đang hoàn tác — chờ bước trước xong."), "warn"); return; }
    if (s && stack.at(-1) !== s) { StatusBar.msg(T("Đã có thao tác mới hơn — dùng Ctrl+Z để hoàn tác lần lượt."), "warn"); return; }
    const step = stack.pop();
    if (!step) { StatusBar.msg(T("Không còn thao tác nào để hoàn tác."), "warn"); return; }
    running = true;
    try {
      await step.run();
      StatusBar.msg(T("↶ Đã hoàn tác: {what}.", { what: step.label }), "good");
    } catch (e) { if (!e.shown) StatusBar.msg(T("Không hoàn tác được “{what}”: {msg}", { what: step.label, msg: e.message }), "bad"); }
    finally { running = false; }
  }

  const stamp = h => (h.kind === "file" ? h.getFile().then(f => f.size + ":" + f.lastModified, () => null) : null);
  // Entries an action created (paste, duplicate, new, ZIP, extract) — items [{ handle, parent, path }]: undo moves them to the bin, asking first when a file changed since.
  function created(label, items) {
    const before = Promise.all(items.map(it => stamp(it.handle)));
    return push(label, async () => {
      const was = await before, now = await Promise.all(items.map(it => stamp(it.handle)));
      const changed = items.find((it, k) => was[k] && now[k] && was[k] !== now[k]);
      if (changed && !confirm(T("“{name}” đã bị sửa sau khi tạo. Vẫn chuyển vào thùng rác?", { name: changed.handle.name }))) throw shown();
      if (!await ExplorerDisk.remove(items.map(it => like(it.handle, it.parent, it.path)), { undoable: false })) throw shown();
    });
  }

  const inScope = el => !!el?.closest?.("#explorer, .fi") && !el.closest("input, textarea, [contenteditable='true']");
  // window capture: ahead of the editor's own Ctrl+Z on document.
  addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z" || !inScope(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) undo();
  }, true);

  return { push, undo, last, created, like, shown };
})();
