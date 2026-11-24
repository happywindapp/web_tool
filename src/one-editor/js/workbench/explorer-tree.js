// Explorer: pinned items, open tabs, notes (IndexedDB) and a local folder tree loaded lazily; every row is a button so touch and keyboard work like the mouse.
const Explorer = (() => {
  const box = $("explorer"), filter = $("exFilter");
  let root = null, raf = 0, dirsOnly = false, saved = null;
  const nodes = new WeakMap(), loading = new WeakMap();
  const DATA = new Set(["JSON", "YAML", "XML", "CSV", "TSV", "TOML", "Properties files"]);

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (cls, text, title, onClick) => { const b = el("button", cls, text); b.title = title; b.onclick = onClick; return b; };
  const row = (label, title, onClick, extra = []) => { const r = el("div", "ex-row"); r.append(btn("ex-item", label, title, onClick), ...extra); return r; };
  // Pinned ⇒ always shown; otherwise only on hover / focus (always on touch), like the disk actions.
  function pinAct(on, title, onClick) {
    const b = btn("ex-act ex-pin" + (on ? " on" : ""), "📌", title, onClick);
    b.setAttribute("aria-pressed", on);
    if (on) return b;
    const s = el("span", "ex-acts");
    s.append(b);
    return s;
  }
  const section = (...a) => ExplorerSections.section(...a);
  // groupItem: what "Thêm vào group ▸" of the row menu adds.
  const tagRow = (r, item) => { r.groupItem = item; return r; };
  function fileIcon(name) {
    const id = LangDetect.byName(name);
    if (/\.(png|jpe?g|gif|webp|bmp|ico)$/i.test(name)) return "🖼";
    return !id ? "📄" : DATA.has(id) ? "🧾" : id === "Markdown" ? "📘" : id === LangDetect.PLAIN || id === "Log" ? "📄" : "📜";
  }

  async function openNode(node, gi = Views.focused) {
    try {
      await FileOpen.openMany([await node.read()], gi);
    } catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: node.name, msg: e.message }), "bad"); }
  }

  // One read per folder at a time, shared by the tree and the item pane of View 1.
  function loadKids(node) {
    if (node.children) return Promise.resolve(node.children);
    if (!loading.has(node)) loading.set(node, node.list().then(k => { node.children = k; GitStatus.found(node); return k; }).finally(() => loading.delete(node)));
    return loading.get(node);
  }

  // Hidden files (".x") and extensions follow the View menu of the folder tab; the colour tag dot goes after the name.
  const tagged = (el, node) => { const d = Tags.dot(node); if (d) el.append(d); };
  function treeNode(node, hit) {
    if (node !== root && !FolderView.shows(node.name)) return null;
    if (!node.dir) {
      if (dirsOnly || !hit(node.name)) return null;
      const label = FolderView.label(node), r = row(fileIcon(node.name) + " " + label, node.path, () => openNode(node), ExplorerDisk.buttons(node));
      const git = GitStatus.paint(r.firstChild, fileIcon(node.name), node, label);
      if (git) r.firstChild.title += " · " + git;
      tagged(r.firstChild, node);
      nodes.set(r, node);
      return r;
    }
    const d = el("details", "ex-dir"), kids = el("div", "ex-kids"), sum = el("summary");
    nodes.set(sum, node);
    const cloudRoot = node.remote && !node.parent && node.link;
    // preventDefault: a click inside <summary> would also fold the folder.
    const cloudPin = cloudRoot ? [pinAct(Pinned.hasCloud(node.link), T(PIN_ITEM), e => { e.preventDefault(); e.stopPropagation(); Pinned.toggleCloud(node); })] : [];
    const icon = node.remote && !node.parent ? "☁" : "📁", dname = el("span", "ex-dname", icon + " " + node.name), git = GitStatus.paint(dname, icon, node);
    // Row buttons sit at the right edge like on file rows (a flex <summary> would lose its ▶ marker).
    const acts = el("span", "ex-sacts");
    acts.append(...ExplorerDisk.buttons(node), ...cloudPin);
    tagged(dname, node);
    sum.append(dname, acts);
    sum.title = node.path + (git ? " · " + git : "");
    if (FolderItems.isShown(node)) sum.classList.add("fi-cur");
    // Like the Windows navigation pane: a click shows the folder in View 1's folder tab; a second click on the shown folder folds it.
    // node.open is set here: show() redraws the tree before the async "toggle" event would record it.
    sum.addEventListener("click", e => {
      if (FolderItems.current() === node) return;
      if (d.open) e.preventDefault(); else node.open = true;
      FolderItems.show(node);
    });
    d.append(sum, kids);
    const fill = () => kids.replaceChildren(...node.children.map(c => treeNode(c, hit)).filter(Boolean));
    d.addEventListener("toggle", async () => {
      node.open = d.open;
      if (!d.open || node.children) return;
      kids.replaceChildren(el("p", "ex-empty", T("Đang đọc…")));
      try { await loadKids(node); fill(); }
      catch (e) { kids.replaceChildren(el("p", "ex-empty bad", T("Không đọc được folder: {msg}", { msg: e.message }))); }
    });
    if (node.children) fill();
    d.open = !!node.open;
    return d;
  }

  function openNote(d) { Views.open(d, Views.where(d.id) >= 0 ? Views.where(d.id) : Views.focused); PhoneLayout.show(Views.where(d.id) + 1); }
  const PIN_ITEM = "Ghim / bỏ ghim vào mục Đã ghim";

  function noteRow(d) {
    const del = () => {
      if (!confirm(T("Xoá ghi chú “{name}”? Không khôi phục được.", { name: d.name }))) return;
      Views.close(d.id, true);
      Docs.remove(d.id);
    };
    const r = row("📝 " + d.name, T("Mở ghi chú"), () => openNote(d), [pinAct(Pinned.hasNote(d), T(PIN_ITEM), () => Pinned.toggleNote(d))]);
    r.menuExtra = [[T("Đổi tên…"), () => TabStrip.rename(d)], [T("Xoá"), del]];
    return tagRow(r, { kind: "note", id: d.id });
  }

  // A pinned or grouped item (folder / file / note / cloud link) with its ✕ button.
  function itemRow(p, open, unTitle, un) {
    const icon = p.kind === "dir" ? "📁" : p.kind === "cloud" ? "☁" : p.kind === "note" ? "📝" : fileIcon(p.name);
    const title = T(p.kind === "dir" || p.kind === "cloud" ? "Mở folder này trong Explorer" : p.kind === "note" ? "Mở ghi chú" : "Mở file");
    return tagRow(row(icon + " " + Pinned.nameOf(p), title, open, [btn("ex-act", "✕", unTitle, un)]), p);
  }

  const addTabBtn = run => btn("ex-act", "+", T("Thêm tab đang chọn vào đây"), run);
  // Always shown (its "+" pins the active tab); hidden only while a filter matches nothing in it.
  function pinnedSection(hit, q) {
    const items = Pinned.items().filter(p => hit(Pinned.nameOf(p)));
    if (q && !items.length) return null;
    const rows = items.length ? items.map(p => itemRow(p, () => Pinned.open(p), T("Bỏ ghim"), () => Pinned.remove(p)))
      : [el("p", "ex-empty", T("Chưa ghim mục nào — bấm + để ghim tab đang chọn, hoặc 📌 trên file / folder / ghi chú."))];
    return section("pinned", T("Đã ghim"), rows, [addTabBtn(() => Pinned.addActive())]);
  }

  // Groups without a filter match hide while filtering, like Pinned.
  function groupSection(g, hit, q) {
    const items = g.items.filter(p => hit(Pinned.nameOf(p)));
    if (q && !items.length) return null;
    const rows = items.length ? items.map(p => itemRow(p, () => Groups.open(g, p), T("Bỏ khỏi group"), () => Groups.removeItem(g, p)))
      : [el("p", "ex-empty", T("Group trống — kéo file / folder / tab vào đây, hoặc chuột phải ▸ Thêm vào group."))];
    const s = section("g:" + g.id, "🗂 " + g.name, rows, [addTabBtn(() => Groups.addActive(g)), btn("ex-act", "⋯", T("Thao tác group: thêm tab, chuyển lên / xuống, đổi tên, xoá"), e => Groups.groupMenu(g, e.currentTarget))]);
    if (s) s.dataset.group = g.id;
    return s;
  }

  function recentSection(hit) {
    const items = RecentFiles.list().filter(r => hit(r.name));
    const rows = items.map(r => tagRow(row(fileIcon(r.name) + " " + r.name, T("Mở lại — lần mở trước: {at}", { at: new Date(r.at).toLocaleString(I18n.lang) }), () => RecentFiles.open(r),
      [pinAct(false, T(PIN_ITEM), () => Pinned.toggleHandle(r.handle)), btn("ex-act", "✕", T("Bỏ khỏi danh sách"), () => RecentFiles.remove(r))]), Groups.ofHandle(r.handle)));
    const empty = LocalFs.canPick ? T("Chưa có file nào mở gần đây.") : T("Trình duyệt này không giữ được file để mở lại (cần Chrome / Edge).");
    return section("recent", T("Gần đây"), rows.length ? rows : [el("p", "ex-empty", empty)], items.length ? [btn("ex-act", "🗑", T("Xoá danh sách Gần đây"), () => RecentFiles.clear())] : []);
  }

  // Shown only while the recycle bin holds something.
  function trashSection() {
    const s = TrashStore.summary();
    return s?.n ? section("trash", T("Thùng rác"), [row("🗑 " + T("{n} mục · {size}", { n: s.n, size: FolderFmt.size(s.size) }), T("Mở thùng rác — khôi phục file đã xoá"), () => TrashTab.open())]) : null;
  }

  function draw() {
    raf = 0;
    const q = filter.value.trim().toLowerCase(), hit = s => !q || s.toLowerCase().includes(q);
    ExplorerSections.setFiltering(!!q);
    const open = Views.groups.flatMap(g => g.tabs.map(id => [g.i, Docs.get(id)])).filter(([, d]) => d && hit(d.name));
    const notes = Docs.notes().filter(d => hit(d.name)).sort((a, b) => Pinned.hasNote(b) - Pinned.hasNote(a) || b.updated - a.updated);
    const refreshBtn = () => btn("ex-act", "🔄", T("Làm mới từ đĩa: đọc lại folder và các file bị sửa bên ngoài"), () => DiskSync.checkAll());
    const tabPin = d => pinAct(d.pinned, T(d.pinned ? "Bỏ ghim tab" : "Ghim tab (luôn ở đầu view, hỏi lại trước khi đóng)"), () => Views.togglePin(d));
    const sections = [
      pinnedSection(hit, q),
      ...Groups.list().map(g => groupSection(g, hit, q)),
      section("open", T("Đang mở"), open.length ? open.map(([gi, d]) => tagRow(row(TabStrip.ICON[d.kind] + " " + d.name + (d.dirty ? " ●" : "") + (d.diskChanged ? " ⚠" : ""), T("View {n}", { n: gi + 1 }), () => { Views.activate(gi, d.id); PhoneLayout.show(gi + 1); }, [tabPin(d)]), Groups.ofDoc(d)))
        : [el("p", "ex-empty", T("Chưa mở tab nào."))], Docs.list().some(d => d.kind === "file" && d.handle) ? [refreshBtn()] : []),
      section("notes", T("Ghi chú"), notes.length ? notes.map(noteRow) : [el("p", "ex-empty", NotesDb.ok ? T("Chưa có ghi chú — bấm + để tạo.") : T("Trình duyệt chặn IndexedDB — ghi chú không được lưu."))],
        [btn("ex-act", "+", T("Ghi chú mới (Alt+N)"), () => Actions.newNote(Views.focused))]),
      recentSection(hit),
      trashSection(),
    ];
    if (root) {
      dirsOnly = Prefs.get("exShowFiles", true) === false;
      const showFiles = el("label", "ex-chk"), cb = el("input");
      Object.assign(cb, { type: "checkbox", checked: !dirsOnly, onchange: () => { Prefs.set("exShowFiles", cb.checked); render(); } });
      showFiles.title = T("Hiện file trong cây folder (bỏ chọn ⇒ chỉ hiện folder) — tab folder vẫn liệt kê đủ file");
      showFiles.append(cb, T("Hiện file"));
      const tree = treeNode(root, hit);
      sections.push(section("folder", T("Folder"), [tree], [showFiles, ...(root.handle || root.remote ? [refreshBtn()] : []), btn("ex-act", "✕", T("Đóng folder"), () => setRoot(null))]));
    } else {
      const again = saved ? [btn("ex-open", T("📂 Mở lại “{name}”", { name: saved.name }), T("Sau khi tải lại trang, trình duyệt cần bạn bấm để cho đọc lại folder này"), () => reopenSaved())] : [];
      sections.push(section("folder", T("Folder"), [...again, el("p", "ex-empty", T("Chưa mở folder. Kéo folder vào đây hoặc bấm:")), btn("ex-open", T("📂 Mở folder…"), T("Mở folder trên máy"), () => Actions.openFolder()),
        btn("ex-open", T("☁ Mở từ link Drive / OneDrive…"), T("Mở folder công khai Google Drive / OneDrive cá nhân"), () => Actions.openCloudFolder())]));
    }
    // The redraw replaces every row: keyboard focus returns to the row of the same node.
    const was = box.contains(document.activeElement) ? nodes.get(document.activeElement.closest(".ex-row, summary")) : null;
    box.replaceChildren(...sections.filter(Boolean));
    if (was) { const h = [...box.querySelectorAll(".ex-row, summary")].find(x => nodes.get(x) === was); (h?.matches("summary") ? h : h?.firstChild)?.focus({ preventScroll: true }); }
    ExplorerSections.after();
    FolderItems.sync();
    ResultsTab.sync();
  }

  const render = () => { if (!raf) raf = requestAnimationFrame(draw); };
  // F5 reopens the folder: a link from localStorage, a local folder from its handle in IndexedDB (dropped folders have none).
  // transient (demo folder): F5 still reopens the folder saved before.
  function setRoot(node, transient = false) {
    GitStatus.reset(); root = node; saved = null; if (root) root.open = true;
    if (!NewWindow.active && !transient) {
      Prefs.set("cloudRoot", root?.link || null);
      NotesDb.putMeta("explorerRoot", root?.handle && !root.parent ? root.handle : null).catch(() => {});
    }
    render(); DiskSync.rewatch();
  }

  // Read access still granted ⇒ open at once; otherwise the browser needs a click (reopenSaved) to ask again.
  async function restoreLocal() {
    let h = null;
    try { h = await NotesDb.getMeta("explorerRoot"); } catch { return; }
    if (!h || root || typeof h.queryPermission !== "function") return;
    if (await h.queryPermission({ mode: "read" }).catch(() => "denied") === "granted") { setRoot(LocalFs.fromHandle(h)); return; }
    saved = h;
    render();
  }
  async function reopenSaved() {
    const h = saved;
    if (!h) { Actions.openFolder(); return; }
    try {
      if (!(await LocalFs.readable(h))) { StatusBar.msg(T("Trình duyệt chưa cho đọc lại “{name}”.", { name: h.name }), "warn"); return; }
      await h.keys().next();
      setRoot(LocalFs.fromHandle(h));
    } catch (e) {
      setRoot(null);
      StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: h.name, msg: e.message }), "bad");
    }
  }
  const restore = async () => { await restoreLocal(); await restoreCloud(); };

  async function restoreCloud() {
    const link = Prefs.get("cloudRoot", null);
    if (typeof link !== "string" || root) return;
    try {
      const node = await CloudDrive.open(link, false);
      if (node && !root) setRoot(node);
    } catch (e) { StatusBar.msg(T("Không mở lại được folder từ link: {msg}", { msg: e.message }), "warn"); }
  }

  // Open folders are listed again; known entries keep their node (open state, row buttons), closed folders are read when opened next.
  async function relist(node) {
    const key = c => c.name + (c.dir ? "/" : ""), old = new Map((node.children || []).map(c => [key(c), c]));
    node.children = (await node.list()).map(c => old.get(key(c)) || c);
    GitStatus.found(node);
    for (const c of node.children) {
      if (c.dir && c.open && c.children) await relist(c).catch(() => { c.children = null; });
      else if (c.dir) c.children = null;
    }
  }
  async function refresh() {
    if (!root || !(root.handle || root.remote) || !root.children) return;
    const sig = () => { const out = [], walk = n => { out.push(n.path); (n.children || []).forEach(walk); }; walk(root); return out.join("\n"); };
    const before = sig();
    DirSize.clear();
    try { await relist(root); } finally { if (sig() !== before) render(); GitStatus.rescan(); }
  }

  // Files of the folders already read (Quick Open does not walk the disk).
  function loadedFiles() {
    const out = [], walk = n => { if (!n.dir) out.push(n); else (n.children || []).forEach(walk); };
    if (root) walk(root);
    return out;
  }

  filter.addEventListener("input", render);
  TrashStore.onChange(render);
  return { render, setRoot, restore, reopenSaved, savedName: () => saved?.name || null, refresh, loadedFiles, openNode, openNote, loadKids, fileIcon, root: () => root, nodeOf: el => nodes.get(el) || null };
})();
