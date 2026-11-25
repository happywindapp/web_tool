// Explorer "Recent": the last 20 local files opened with a handle (Chrome/Edge), kept in IndexedDB; reopening asks for read permission on the click.
const RecentFiles = (() => {
  const MAX = 20;
  let list = [];

  const persist = () => NotesDb.putMeta("recent", list).catch(e => console.warn("One Editor recent files:", e));

  async function load() {
    const saved = await NotesDb.getMeta("recent");
    const prev = Array.isArray(saved) ? saved.filter(r => r && r.handle && typeof r.name === "string") : [];
    if (list.length) {
      const seen = new Set(list.map(r => r.name));
      list = [...list, ...prev.filter(r => !seen.has(r.name))].slice(0, MAX);
      persist();
    } else list = prev;
  }

  async function add(handle) {
    if (!handle || typeof handle.isSameEntry !== "function") return;
    const keep = [];
    for (const r of list) if (!(await r.handle.isSameEntry(handle).catch(() => false))) keep.push(r);
    list = [{ name: handle.name, handle, at: Date.now() }, ...keep].slice(0, MAX);
    persist();
    Explorer.render();
  }

  function remove(item) {
    list = list.filter(r => r !== item);
    persist();
    Explorer.render();
  }

  function clear() { list = []; persist(); Explorer.render(); }

  async function open(item) {
    try {
      if (!(await LocalFs.readable(item.handle))) { StatusBar.msg(T("Trình duyệt chưa cho đọc lại “{name}”.", { name: item.name }), "warn"); return; }
      await FileOpen.openMany([{ file: await item.handle.getFile(), handle: item.handle }], Views.focused);
    } catch (e) {
      if (e.name === "NotFoundError") { remove(item); StatusBar.msg(T("“{name}” không còn trên đĩa — đã bỏ khỏi danh sách Gần đây.", { name: item.name }), "warn"); }
      else StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: item.name, msg: e.message }), "bad");
    }
  }

  return { load, add, remove, clear, open, list: () => list };
})();
