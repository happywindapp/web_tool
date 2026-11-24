// Explorer groups (OneCommander style): named lists of folders / files (handles), notes and cloud links in IndexedDB meta "groups"; each shows as an Explorer section.
const Groups = (() => {
  let list = [];
  const E = (label, key, run) => TabMenu.entry(label, key, run);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const persist = () => NotesDb.putMeta("groups", list).catch(e => console.warn("One Editor groups:", e));
  const changed = () => { persist(); Explorer.render(); };

  async function init() {
    const saved = await NotesDb.getMeta("groups").catch(() => null);
    list = Array.isArray(saved) ? saved.filter(g => g && typeof g.id === "string" && typeof g.name === "string")
      .map(g => ({ id: g.id, name: g.name, items: Array.isArray(g.items) ? g.items.filter(Pinned.valid) : [] })) : [];
    Docs.on((type, doc) => {
      if (type !== "remove") return;
      let hit = false;
      for (const g of list) { const n = g.items.length; g.items = g.items.filter(p => !(p.kind === "note" && p.id === doc.id)); hit ||= g.items.length !== n; }
      if (hit) changed();
    });
    Explorer.render();
  }

  // → a group item, or null for what a group cannot keep (a temporary tab, a dropped folder without handle, a file inside a cloud folder).
  const ofHandle = h => h && typeof h.isSameEntry === "function" ? { kind: h.kind === "directory" ? "dir" : "file", name: h.name, handle: h } : null;
  const ofNode = n => !n ? null : n.handle ? ofHandle(n.handle) : n.remote && !n.parent && n.link ? { kind: "cloud", name: n.name, link: n.link } : null;
  function ofDoc(doc) {
    const r = doc && Docs.root(doc);
    if (!r) return null;
    if (r.kind === "note") return { kind: "note", id: r.id };
    return r.kind === "folder" ? ofNode(FolderItems.nodeOf(r.id)) : ofHandle(r.handle);
  }
  const copy = p => ({ ...p });

  async function has(g, it) {
    for (const p of g.items) {
      if (p.kind !== it.kind) continue;
      if (p.kind === "note" ? p.id === it.id : p.kind === "cloud" ? p.link === it.link : await p.handle.isSameEntry(it.handle).catch(() => false)) return true;
    }
    return false;
  }

  async function add(g, raw) {
    const items = raw.filter(Boolean), skipped = raw.length - items.length;
    let n = 0;
    for (const it of items) if (!(await has(g, it))) { g.items.push(it); n++; }
    if (n) changed();
    const msg = [n ? T("Đã thêm {n} mục vào group “{name}”.", { n, name: g.name }) : items.length ? T("Các mục này đã có trong group “{name}”.", { name: g.name }) : "",
      skipped ? T("Bỏ qua {n} mục: group chỉ giữ file / folder trên máy (Chrome / Edge), ghi chú và folder mở từ link.", { n: skipped }) : ""].filter(Boolean).join(" ");
    StatusBar.msg(msg, n && !skipped ? "good" : "warn");
  }

  function create() {
    const name = prompt(T("Tên group mới:"), T("Group {n}", { n: list.length + 1 }))?.trim();
    if (!name) return null;
    const g = { id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, items: [] };
    list.push(g);
    changed();
    return g;
  }
  function rename(g) {
    const name = prompt(T("Tên group:"), g.name)?.trim();
    if (name && name !== g.name) { g.name = name; changed(); }
  }
  function remove(g) {
    if (g.items.length && !confirm(T("Xoá group “{name}” ({n} mục)? File / folder trên đĩa không bị xoá.", { name: g.name, n: g.items.length }))) return;
    list = list.filter(x => x !== g);
    ExplorerSections.forget("g:" + g.id);
    changed();
  }
  function removeItem(g, p) { g.items = g.items.filter(x => x !== p); changed(); }

  // Like a pinned item; a file / folder gone from disk leaves the group.
  const open = (g, p) => Pinned.open(p, () => { removeItem(g, p); StatusBar.msg(T("“{name}” không còn trên đĩa — đã bỏ khỏi group.", { name: p.name }), "warn"); });

  // Disk rename / move: the group copies follow the entry like the pinned one.
  async function find(handle) {
    const out = [];
    for (const g of list) for (const p of g.items) if (p.handle && await p.handle.isSameEntry(handle).catch(() => false)) out.push(p);
    return out;
  }
  function renamed(items, handle) { if (!items.length) return; items.forEach(p => Object.assign(p, { handle, name: handle.name })); changed(); }

  function menu(items, x, y) {
    TabMenu.show([el("div", "menu-head", T("Thêm vào group")), ...list.map(g => E("🗂 " + g.name, T("{n} mục", { n: g.items.length }), () => add(g, items))),
      ...(list.length ? [el("hr", "menu-sep")] : []), E("＋ " + T("Group mới…"), "", () => { const g = create(); if (g) add(g, items); })], x, y);
  }
  // "Thêm vào group ▸" for a menu opened on head; nothing when no item can go into a group.
  const entries = (items, head) => items.some(Boolean)
    ? [E(T("Thêm vào group") + " ▸", "", () => { const r = head.getBoundingClientRect(); menu(items.map(p => p && copy(p)), r.left + 16, r.bottom); })] : [];

  // The tab command: the menu under the focused view's active tab.
  function addDoc(doc) {
    const r = document.querySelector(".group.focused .tab.on")?.getBoundingClientRect();
    menu([ofDoc(doc)], r ? r.left : innerWidth / 3, r ? r.bottom : innerHeight / 4);
  }

  // The header "+" (group or Pinned): the focused view's active tab.
  function addActive(g) {
    const d = Views.activeDoc();
    if (!d) { StatusBar.msg(T("Chưa có tab nào đang chọn."), "warn"); return; }
    add(g, [ofDoc(d)]);
  }

  function move(g, to) {
    const i = list.indexOf(g);
    if (i < 0 || to === i) return;
    list.splice(i, 1);
    list.splice(Math.max(0, Math.min(to, list.length)), 0, g);
    changed();
  }

  function groupMenu(g, anchor) {
    const r = anchor.getBoundingClientRect(), tabs = Views.groups.flatMap(v => v.tabs.map(id => ofDoc(Docs.get(id)))), i = list.indexOf(g), last = list.length - 1;
    const cur = Views.activeDoc() ? [E(T("Thêm tab đang chọn"), "", () => addActive(g))] : [];
    const moves = [...(i > 0 ? [E(T("Chuyển lên đầu"), "", () => move(g, 0)), E(T("Chuyển lên"), "", () => move(g, i - 1))] : []),
      ...(i < last ? [E(T("Chuyển xuống"), "", () => move(g, i + 1)), E(T("Chuyển xuống cuối"), "", () => move(g, last))] : [])];
    TabMenu.show([el("div", "menu-head", "🗂 " + g.name), ...cur, ...(tabs.length ? [E(T("Thêm mọi tab đang mở ({n})", { n: tabs.length }), "", () => add(g, tabs))] : []),
      el("hr", "menu-sep"), ...moves, ...(moves.length ? [el("hr", "menu-sep")] : []), E(T("Đổi tên group…"), "", () => rename(g)), E(T("Xoá group…"), "", () => remove(g))], r.left, r.bottom + 2);
  }

  // Drops on a group section: Explorer / folder tab rows (ExplorerDnd) and editor tabs (FileDrop).
  const dropSec = target => target?.closest?.("#explorer .ex-sec[data-group]") || null;
  const byId = id => list.find(g => g.id === id);
  function dropNodes(sec, nodes) { const g = byId(sec.dataset.group); if (g) add(g, nodes.map(ofNode)); }
  function dropDoc(sec, id) { const g = byId(sec.dataset.group); if (g) add(g, [ofDoc(Docs.get(id))]); }

  $("exNewGroup").onclick = () => create();
  return { init, list: () => list, ofNode, ofDoc, ofHandle, entries, addDoc, addActive, move, open, removeItem, groupMenu, create, find, renamed, dropSec, dropNodes, dropDoc };
})();
