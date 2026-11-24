// Bookmarks of closed file tabs, kept in IndexedDB with the file handle (Chrome / Edge) and given back when the same file opens again.
const BookmarkFiles = (() => {
  const MAX = 100;
  let list = [];

  const valid = x => x && x.handle && typeof x.handle.isSameEntry === "function" && typeof x.name === "string" && BookmarkLines.clean(x.lines).length;
  const changed = () => { NotesDb.putMeta("bookmarks", list).catch(e => console.warn("One Editor bookmarks:", e)); BookmarkList.render(); };

  function keep(doc) {
    if (doc.kind !== "file" || !doc.handle || doc.big) return;
    const lines = Bookmarks.linesOf(doc);
    if (!lines.length) return;
    const texts = doc.state && doc.marksLive ? lines.map(n => doc.state.doc.line(n).text.slice(0, 200)) : BookmarkLines.texts(doc.text, lines);
    list = [{ name: doc.name, handle: doc.handle, lines, texts, at: Date.now() }, ...list].slice(0, MAX);
    changed();
  }

  // Every entry of that file goes back into the tab (a file closed twice may have two).
  async function take(doc) {
    const hits = [];
    for (const x of list) if (await doc.handle.isSameEntry(x.handle).catch(() => false)) hits.push(x);
    const still = hits.filter(x => list.includes(x));
    if (!still.length || !Docs.get(doc.id) || doc.hex || doc.big) return;
    list = list.filter(x => !still.includes(x));
    BookmarkList.set(doc, [...Bookmarks.linesOf(doc), ...still.flatMap(x => x.lines)]);
    changed();
  }

  async function init() {
    const saved = await NotesDb.getMeta("bookmarks");
    list = Array.isArray(saved) ? saved.filter(valid).map(x => ({ ...x, texts: Array.isArray(x.texts) ? x.texts : [] })) : [];
    Docs.on((type, doc) => {
      if (type === "remove") keep(doc);
      else if (type === "create" && doc.kind === "file" && doc.handle && typeof doc.handle.isSameEntry === "function" && list.length) take(doc);
    });
  }

  async function open(x, line) {
    try {
      if (!(await LocalFs.readable(x.handle))) { StatusBar.msg(T("Trình duyệt chưa cho đọc lại “{name}”.", { name: x.name }), "warn"); return; }
      const doc = await FileOpen.open(await x.handle.getFile(), x.handle, Views.focused);
      if (!doc) return;
      await take(doc);
      Views.revealLine(doc, line);
      PhoneLayout.show(Views.where(doc.id) + 1);
    } catch (e) {
      if (e.name !== "NotFoundError") { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: x.name, msg: e.message }), "bad"); return; }
      drop(x);
      StatusBar.msg(T("“{name}” không còn trên đĩa — đã xoá bookmark của file này.", { name: x.name }), "warn");
    }
  }

  // Without a line: the whole entry.
  function drop(x, line) {
    const k = x.lines.indexOf(line);
    if (line != null && k >= 0 && x.lines.length > 1) { x.lines.splice(k, 1); x.texts.splice(k, 1); }
    else list = list.filter(y => y !== x);
    changed();
  }

  function clear() { list = []; changed(); }

  return { init, items: () => list, open, drop, clear };
})();
