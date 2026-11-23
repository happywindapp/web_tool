// Colour tags on Explorer items (6 colours, by path in IndexedDB meta.tags): the right-click "Colour tag ▸" menu, the dot on tree / list rows, and the map kept in step when One Editor renames, moves or deletes.
const Tags = (() => {
  let map = {}, loaded = false, early = false, raf = 0;
  const listeners = [];
  const pathOf = n => n.path ?? n.parent.path + "/" + n.name;

  async function load() {
    const stored = TagMap.clean(await NotesDb.getMeta("tags").catch(() => null));
    // A tag set before the read finished wins over the stored one.
    map = { ...stored, ...map };
    loaded = true;
    if (early) save();
    changed();
  }
  const warn = msg => StatusBar.msg(T("Không lưu được nhãn màu: {msg}", { msg }), "warn");
  const save = Dom.debounce(() => {
    if (!loaded) return;
    NotesDb.putMeta("tags", map).then(ok => { if (!ok) warn(T("trình duyệt chặn IndexedDB")); }, e => warn(e.message));
  }, 300);

  // One pass per frame however many items a paste or move retagged; rows and tree rows get their dot in place, nothing is rebuilt.
  function changed() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      for (const r of document.querySelectorAll(".fi-list > .fi-row")) FolderRows.retag(r);
      for (const h of document.querySelectorAll("#explorer .ex-row, #explorer .ex-dir > summary")) {
        const n = Explorer.nodeOf(h), at = h.matches("summary") ? h.querySelector(".ex-dname") : h.firstChild;
        if (!n || !at) continue;
        at.querySelector(".tag-dot")?.remove();
        const d = dot(n);
        if (d) at.append(d);
      }
      listeners.forEach(fn => fn());
    });
  }
  function commit(next) {
    if (next === map) return;
    map = next;
    if (!loaded) early = true;
    save();
    changed();
  }

  const of = node => (node ? map[pathOf(node)] || null : null);
  function set(nodes, color) {
    const next = TagMap.put(map, nodes.map(pathOf), color);
    if (!next) { StatusBar.msg(T("Đã có {n} nhãn — bỏ bớt nhãn cũ trước khi gắn thêm.", { n: TagMap.MAX }), "warn"); return; }
    commit(next);
  }
  const moved = (from, to) => commit(TagMap.move(map, from, to));
  // → the entries removed, for undo.
  function removed(nodes) {
    const { map: next, gone } = TagMap.drop(map, nodes.map(pathOf));
    commit(next);
    return gone;
  }
  const restore = gone => { if (gone?.length) commit({ ...map, ...Object.fromEntries(gone) }); };

  const name = c => T(TagMap.LABEL[c]);
  function dot(node) {
    const c = of(node);
    if (!c) return null;
    const d = document.createElement("i");
    d.className = "tag-dot tag-" + c;
    d.title = T("Nhãn: {color}", { color: name(c) });
    return d;
  }

  // "Colour tag ▸" opens the colours where the menu was; the current colour of the first item is ticked.
  function entry(nodes, head) {
    return TabMenu.entry(T("Nhãn màu") + " ▸", "", () => {
      const r = head.getBoundingClientRect(), cur = of(nodes[0]), E = TabMenu.entry;
      const items = TagMap.COLORS.map(c => {
        const b = E((c === cur ? "✓ " : "") + name(c), "", () => set(nodes, c));
        b.firstChild.prepend(Object.assign(document.createElement("i"), { className: "tag-dot tag-" + c }));
        return b;
      });
      TabMenu.show([Object.assign(document.createElement("div"), { className: "menu-head", textContent: T("Nhãn màu") }), ...items, E(T("Bỏ nhãn"), "", () => set(nodes, null))], r.left + 16, r.bottom);
    });
  }

  return { load, of, set, moved, removed, restore, dot, name, entry, pathOf, onChange: fn => listeners.push(fn) };
})();
