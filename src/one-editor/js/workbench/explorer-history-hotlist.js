// Folder tab history and hotlist: right-click / long-press on ← → lists up to 15 steps like Windows; Ctrl+D lists pinned folders + folders visited lately (≤ 20 per opened root, localStorage fiRecentDirs) + pin / unpin this folder.
const FolderHotlist = (() => {
  const KEY = "fiRecentDirs", SHOW = 15;
  let api = null;
  const init = a => { api = a; };
  const base = p => p.slice(p.lastIndexOf("/") + 1);
  const head = text => FolderRows.el("div", "menu-head", text);
  const entry = (label, title, run) => { const b = TabMenu.entry(label, "", run); b.title = title; return b; };
  const remember = path => Prefs.set(KEY, FolderNav.remember(Prefs.get(KEY, []), path));

  // dir -1 = ← list, +1 = → list; the nearest step first.
  function history(t, dir, x, y) {
    const list = (dir < 0 ? t.past : t.next).slice(-SHOW).reverse();
    if (!list.length) return;
    TabMenu.show([head(T(dir < 0 ? "Quay lại tới" : "Tiến tới")), ...list.map((p, i) => entry("📁 " + base(p), p, () => api.back(t, dir, i + 1)))], x, y);
  }
  // Long-press on touch opens the context menu event too.
  function wire(t) {
    for (const [b, dir] of [[t.ui.back, -1], [t.ui.fwd, 1]]) b.addEventListener("contextmenu", e => { e.preventDefault(); const r = b.getBoundingClientRect(); history(t, dir, r.left, r.bottom + 2); });
  }

  // A pinned folder inside the opened root opens in this tab; another one becomes the Explorer root (as from Đã ghim).
  async function openPin(t, p) {
    const root = Explorer.root(), rel = p.kind === "dir" && root?.handle ? await root.handle.resolve(p.handle).catch(() => null) : null;
    if (rel) api.goPath(t, [root.name, ...rel].join("/")); else Pinned.open(p);
  }

  async function hotlist(t) {
    const box = t.ui.path.getBoundingClientRect(), pins = Pinned.items().filter(p => p.kind === "dir" || p.kind === "cloud");
    const recent = FolderNav.recent(Prefs.get(KEY, []), t.path.split("/")[0]).filter(p => p !== t.path);
    const mine = t.node?.handle ? await Pinned.find(t.node.handle) : null, out = [];
    if (pins.length) out.push(head(T("Đã ghim")), ...pins.map(p => entry((p.kind === "cloud" ? "☁ " : "📌 ") + p.name, p.name, () => openPin(t, p))));
    if (recent.length) out.push(head(T("Folder vừa vào")), ...recent.map(p => entry("📁 " + base(p), p, () => api.goPath(t, p))));
    if (t.node?.handle) out.push(...(out.length ? [FolderRows.el("hr", "menu-sep")] : []), entry(T(mine ? "📌 Bỏ ghim folder này" : "📌 Ghim folder này"), t.path, () => Pinned.toggleHandle(t.node.handle)));
    if (!out.length) out.push(head(T("Chưa có folder ghim hay vừa vào.")));
    TabMenu.show(out, box.left, box.bottom + 2);
  }

  // Window capture while a folder tab has focus.
  function hotkey(t, e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "d") return false;
    hotlist(t);
    return true;
  }

  return { init, remember, wire, history, hotlist, hotkey };
})();
