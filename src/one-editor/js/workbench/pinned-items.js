// Explorer "Pinned": folders and files (handles, Chrome/Edge) and notes (by id) kept in IndexedDB; a pinned folder opens as the Explorer root.
const Pinned = (() => {
  let list = [], ready = false;

  const persist = () => NotesDb.putMeta("pinned", list).catch(e => console.warn("One Editor pinned:", e));
  const changed = () => { persist(); Explorer.render(); };
  const valid = p => p && (p.kind === "note" ? Docs.get(p.id)?.kind === "note" : (p.kind === "dir" || p.kind === "file") && p.handle && typeof p.name === "string");
  const nameOf = p => p.kind === "note" ? Docs.get(p.id)?.name || "" : p.name;
  const hasNote = doc => list.some(p => p.kind === "note" && p.id === doc.id);
  const canPin = doc => { const r = Docs.root(doc); return r.kind === "note" || !!r.handle; };

  // After the hot-exit restore, so pinned notes can be checked against the restored ones.
  async function init() {
    const saved = await NotesDb.getMeta("pinned");
    list = Array.isArray(saved) ? saved.filter(valid) : [];
    Docs.on((type, doc) => { if (type === "remove" && hasNote(doc)) { list = list.filter(p => p.id !== doc.id); persist(); } });
    ready = true;
  }

  function remove(item) { list = list.filter(p => p !== item); changed(); }

  async function find(handle) {
    for (const p of list) if (p.handle && await p.handle.isSameEntry(handle).catch(() => false)) return p;
    return null;
  }

  // A disk rename moves only that handle object: the pinned copy follows it.
  function renamed(item, handle) { Object.assign(item, { handle, name: handle.name }); changed(); }

  // find() is async: a quick double click would otherwise pin the same entry twice.
  let busy = false;
  async function toggleHandle(handle) {
    if (!ready || busy || !handle || typeof handle.isSameEntry !== "function") return;
    busy = true;
    try {
      const hit = await find(handle);
      if (hit) { remove(hit); StatusBar.msg(T("Đã bỏ ghim “{name}”.", { name: hit.name }), "good"); return; }
      list.push({ kind: handle.kind === "directory" ? "dir" : "file", name: handle.name, handle });
      changed();
      StatusBar.msg(T("Đã ghim “{name}” — xem ở mục Đã ghim của Explorer.", { name: handle.name }), "good");
    } finally { busy = false; }
  }

  function toggleNote(doc) {
    if (!ready) return;
    const on = !hasNote(doc);
    list = on ? [...list, { kind: "note", id: doc.id }] : list.filter(p => p.id !== doc.id);
    changed();
    StatusBar.msg(T(on ? "Đã ghim “{name}” — xem ở mục Đã ghim của Explorer." : "Đã bỏ ghim “{name}”.", { name: doc.name }), "good");
  }

  // The tab's note, or its file on disk (canPin gates the command).
  function toggleDoc(doc) {
    const r = Docs.root(doc);
    if (r.kind === "note") toggleNote(r); else toggleHandle(r.handle);
  }

  async function open(p) {
    if (p.kind === "note") { const d = Docs.get(p.id); if (d) Explorer.openNote(d); return; }
    try {
      if (!(await LocalFs.readable(p.handle))) { StatusBar.msg(T("Trình duyệt chưa cho đọc lại “{name}”.", { name: p.name }), "warn"); return; }
      if (p.kind === "file") { await FileOpen.openMany([{ file: await p.handle.getFile(), handle: p.handle }], Views.focused); return; }
      await p.handle.keys().next();
      Explorer.setRoot(LocalFs.fromHandle(p.handle));
      StatusBar.msg(T("Đã mở folder “{name}”.", { name: p.name }), "good");
    } catch (e) {
      if (e.name === "NotFoundError") { remove(p); StatusBar.msg(T("“{name}” không còn trên đĩa — đã bỏ ghim.", { name: p.name }), "warn"); }
      else StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: p.name, msg: e.message }), "bad");
    }
  }

  return { init, items: () => list, nameOf, hasNote, canPin, find, renamed, toggleHandle, toggleNote, toggleDoc, open, remove };
})();
