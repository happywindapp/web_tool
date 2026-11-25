// Explorer right-click / Menu key / long-press: a Windows-like menu per row (a page cannot show the OS shell menu), Properties, the browser menu on request, and Ctrl+X/C/V · F2 · Delete · Alt+Enter on a focused row (tree or folder tab).
const ExplorerMenu = (() => {
  const box = $("explorer");
  const VIEW_LAYOUT = { 2: "2c", 3: "3c", 4: "4g" };
  const E = (label, key, run) => TabMenu.entry(label, key, run);
  const headOf = t => t.closest(".ex-row, .ex-dir > summary");
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const sep = () => el("hr", "menu-sep");
  // No separator first, last or twice in a row.
  const isSep = n => n?.classList.contains("menu-sep");
  function tidy(list) {
    const out = [];
    for (const n of list) if (!isSep(n) || (out.length && !isSep(out.at(-1)))) out.push(n);
    if (isSep(out.at(-1))) out.pop();
    return out;
  }

  // One path per line for several items.
  async function copyPath(target) {
    const ok = await Dom.copy([].concat(target).map(n => LocalRoot.known(n) || n.path).join("\n"));
    StatusBar.msg(ok ? T("✔ Đã chép đường dẫn.") : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
  }

  // View k beyond the layout ⇒ the smallest layout holding it (3 ⇒ 3 columns, 4 ⇒ 2×2); a tab already open moves there.
  async function openIn(node, k) {
    if (k > Views.count) Actions.setLayout(VIEW_LAYOUT[k]);
    const [open] = node.handle ? await ExplorerDisk.openDocsOf(node.handle) : [];
    if (!open || Views.where(open.id) < 0) { Explorer.openNode(node, k - 1); return; }
    Views.move(open.id, k - 1);
    Views.open(open);
    PhoneLayout.show(k);
  }

  // A page cannot open the browser's own menu: the next right-click anywhere skips every page handler instead.
  let armed = false;
  function armNative() {
    if (!armed) { armed = true; addEventListener("contextmenu", e => { armed = false; e.stopImmediatePropagation(); }, { capture: true, once: true }); }
    StatusBar.msg(T("Chuột phải lần nữa để mở menu của trình duyệt (hoặc giữ Shift khi chuột phải)."));
  }
  const nativeEntry = () => E(T("Menu của trình duyệt"), T("Shift+chuột phải"), armNative);
  const wantsNative = e => e.shiftKey && !!(e.clientX || e.clientY);

  const newEntries = node => ExplorerNew.entries(node);
  const viewEntries = node => Array.from({ length: Layouts.MAX }, (_, i) => E(T("Mở ở View {n}", { n: i + 1 }), "", () => openIn(node, i + 1)));
  const folderTabEntry = node => E(T("Mở trong tab folder mới"), "", () => FolderItems.openNew(node));
  const tail = (node, head) => [...Groups.entries([Groups.ofNode(node)], head), ...OpenWith.entries(node, head), ...TortoiseCmd.entries(node, head), E(T("Sao chép đường dẫn"), "", () => copyPath(node)),
    E(T("Thuộc tính"), "Alt+Enter", () => properties(node, head)), sep(), nativeEntry()];

  function treeTop(node, head) {
    if (!node.dir) return [E(T("Mở"), "Enter", () => Explorer.openNode(node)), ...viewEntries(node)];
    const d = head.parentElement;
    return [E(T(d.open ? "Thu gọn" : "Mở rộng"), "Enter", () => { d.open = !d.open; }), folderTabEntry(node), ...newEntries(node), ...FileTools.entries(node)];
  }

  // top: the open / new entries of the place the menu comes from (tree row or folder tab row).
  function items(node, head, top) {
    const disk = ExplorerOps.writableNode(node), child = disk && !!node.parent, out = [...top, sep()];
    if (child) out.push(E(T("Cắt"), "Ctrl+X", () => ExplorerOps.setClip(node, true)), E(T("Sao chép"), "Ctrl+C", () => ExplorerOps.setClip(node, false)));
    if (disk && node.dir && ExplorerOps.canPaste()) out.push(E(T("Dán"), "Ctrl+V", () => ExplorerOps.paste(node)));
    if (child) out.push(E(T("Nhân bản"), "", () => ExplorerOps.duplicate(node)), sep(), E(T("Đổi tên…"), "F2", () => ExplorerDisk.rename(node)), E(T("Xoá"), "Delete", () => ExplorerDisk.remove(node)),
      E(T("Xoá vĩnh viễn…"), "Shift+Delete", () => ExplorerDisk.remove(node, { permanent: true })));
    out.push(sep(), E(T(node.dir ? "Tải xuống (ZIP)" : "Tải xuống"), "", () => ExplorerArchive.download(node)));
    if (child) out.push(...ExplorerArchive.menu([node], head));
    out.push(sep(), Tags.entry([node], head));
    if (node.handle) out.push(E(T("Ghim / bỏ ghim"), "", () => Pinned.toggleHandle(node.handle)));
    else if (node.remote && !node.parent && node.link) out.push(E(T("Ghim / bỏ ghim"), "", () => Pinned.toggleCloud(node)));
    if (node.webUrl) out.push(E(T("Mở trên OneDrive web"), "", () => window.open(node.webUrl, "_blank", "noopener")));
    out.push(...tail(node, head));
    return tidy(out);
  }

  // Folder tab empty area, like the Windows Explorer background menu: view, sort, refresh, paste, undo, new — then the folder's own tail.
  function backItems(node, head, at, refresh, extra = [], tab = null) {
    const paste = ExplorerOps.writableNode(node) && ExplorerOps.canPaste() ? [E(T("Dán"), "Ctrl+V", () => ExplorerOps.paste(node))] : [];
    const undo = ExplorerUndo.last() ? [E(T("Hoàn tác: {what}", { what: ExplorerUndo.last() }), "Ctrl+Z", () => ExplorerUndo.undo())] : [];
    return tidy([E(T("Xem") + " ▸", "", () => FolderView.viewMenu(...at, tab)), E(T("Sắp xếp theo") + " ▸", "", () => FolderView.sortMenu(...at)), E(T("Nhóm theo") + " ▸", "", () => FolderView.groupMenu(...at)),
      E(T("Làm mới"), "", refresh), ...extra, sep(), ...paste, ...undo, ...newEntries(node), sep(), ...tail(node, head)]);
  }

  // Several items selected in a folder tab: what Windows offers on a multiple selection.
  function groupItems(nodes, head, openAll, extra = []) {
    const disk = nodes.every(n => ExplorerOps.writableNode(n) && n.parent), files = nodes.filter(n => !n.dir).length;
    const out = [el("div", "menu-head", T("{n} mục đã chọn", { n: nodes.length }))];
    if (files) out.push(E(T("Mở {n} file thành tab", { n: files }), "Enter", openAll));
    out.push(...extra);
    out.push(sep());
    if (disk) out.push(E(T("Cắt"), "Ctrl+X", () => ExplorerOps.setClip(nodes, true)), E(T("Sao chép"), "Ctrl+C", () => ExplorerOps.setClip(nodes, false)), sep(),
      E(T("Xoá"), "Delete", () => ExplorerDisk.remove(nodes)), E(T("Xoá vĩnh viễn…"), "Shift+Delete", () => ExplorerDisk.remove(nodes, { permanent: true })));
    out.push(sep(), E(T("Tải xuống (ZIP)"), "", () => ExplorerArchive.download(nodes)));
    if (disk) out.push(...ExplorerArchive.menu(nodes, head));
    out.push(sep(), Tags.entry(nodes, head), ...Groups.entries(nodes.map(Groups.ofNode), head), E(T("Sao chép đường dẫn"), "", () => copyPath(nodes)), E(T("Thuộc tính"), "Alt+Enter", () => properties(nodes, head)), sep(), nativeEntry());
    return tidy(out);
  }

  // Rows outside the folder tree (pinned, open, notes, recent): their main action, row buttons and menu-only entries (row.menuExtra).
  function rowItems(head) {
    const label = b => (b.textContent + " " + b.title.split(/ — | \(/)[0]).trim();
    return [E(T("Mở"), "Enter", () => head.querySelector(".ex-item").click()), ...[...head.querySelectorAll(".ex-act")].map(b => E(label(b), "", () => b.click())),
      ...(head.menuExtra || []).map(([text, run]) => E(text, "", run)), ...Groups.entries([head.groupItem || null], head), sep(), nativeEntry()];
  }

  function fmtSize(n) {
    const units = ["KB", "MB", "GB", "TB"];
    let v = n, k = -1;
    while (v >= 1024 && k < units.length - 1) { v /= 1024; k++; }
    const exact = T("{n} byte", { n: n.toLocaleString(I18n.lang) });
    return k < 0 ? exact : v.toFixed(v < 10 ? 2 : 1) + " " + units[k] + " (" + exact + ")";
  }
  const fmtDate = t => t ? new Date(t).toLocaleString(I18n.lang) : "—";
  const fileOf = async node => node.handle ? node.handle.getFile() : node.remote ? null : (await node.read()).file;

  async function walk(node, acc) {
    for (const c of await node.list()) {
      if (acc.files + acc.dirs >= LocalFs.MAX_ENTRIES) { acc.more = true; return; }
      if (c.dir) { acc.dirs++; await walk(c, acc); continue; }
      acc.files++;
      const f = await fileOf(c).catch(() => null), size = f ? f.size : c.size;
      if (size == null) acc.unknown = true; else acc.size += size;
    }
  }

  // Properties: values that need the disk / network fill in after the panel shows; several items ⇒ their total.
  function properties(target, head) {
    const nodes = [].concat(target), node = nodes[0];
    const rows = [], put = (label, value) => { const r = el("div", "ex-prop"), v = el("b", "", value); r.append(el("span", "", label), v); rows.push(r); return v; };
    if (nodes.length > 1) { groupProperties(nodes, head, rows, put); return; }
    const ext = node.dir ? "" : (node.name.match(/\.([^.]+)$/) || [])[1], lang = node.dir ? "" : LangDetect.byName(node.name);
    put(T("Tên"), node.name);
    put(T("Kiểu"), node.dir ? T("Folder") : (ext ? T("File {ext}", { ext: ext.toUpperCase() }) : T("File")) + (lang ? " · " + lang : ""));
    const full = LocalRoot.known(node);
    put(T("Vị trí"), full ? OpenWith.dirOf(full) : node.parent ? node.parent.path : T("(folder gốc đã mở)"));
    put(T("Nguồn"), node.remote === "gdrive" ? "Google Drive" : node.remote === "onedrive" ? "OneDrive" : T(node.handle ? "Máy này (đọc + ghi)" : "Máy này (chỉ đọc)"));
    const git = GitStatus.label(node);
    if (git) put("Git", git);
    const size = put(T("Kích thước"), T("Đang tính…")), extra = node.dir ? put(T("Chứa"), T("Đang tính…")) : put(T("Ngày sửa"), T("Đang tính…"));
    const close = E(T("Đóng"), "Esc", () => {});
    const r = head.getBoundingClientRect();
    TabMenu.show([el("div", "menu-head", T("Thuộc tính")), ...rows, sep(), close], r.left + 16, r.bottom);
    (async () => {
      if (node.dir) {
        const acc = { files: 0, dirs: 0, size: 0 };
        await walk(node, acc);
        size.textContent = fmtSize(acc.size) + (acc.unknown ? " " + T("(chưa tính file không rõ cỡ)") : "");
        extra.textContent = T("{files} file, {dirs} folder", { files: acc.files, dirs: acc.dirs }) + (acc.more ? " " + T("(dừng ở {n} mục)", { n: LocalFs.MAX_ENTRIES }) : "");
      } else {
        const f = await fileOf(node);
        size.textContent = (f ? f.size : node.size) == null ? "—" : fmtSize(f ? f.size : node.size);
        extra.textContent = fmtDate(f ? f.lastModified : node.modified);
      }
    })().catch(e => { size.textContent = extra.textContent = T("Không đọc được: {msg}", { msg: e.message }); });
  }
  function groupProperties(nodes, head, rows, put) {
    const dirs = nodes.filter(n => n.dir).length;
    put(T("Đã chọn"), T("{files} file, {dirs} folder", { files: nodes.length - dirs, dirs }));
    put(T("Vị trí"), nodes[0].parent ? nodes[0].parent.path : "");
    const size = put(T("Kích thước"), T("Đang tính…")), extra = put(T("Chứa"), T("Đang tính…"));
    const r = head.getBoundingClientRect();
    TabMenu.show([el("div", "menu-head", T("Thuộc tính")), ...rows, sep(), E(T("Đóng"), "Esc", () => {})], r.left + 16, r.bottom);
    (async () => {
      const acc = { files: 0, dirs: 0, size: 0 };
      for (const n of nodes) {
        if (n.dir) { acc.dirs++; await walk(n, acc); continue; }
        acc.files++;
        const f = await fileOf(n).catch(() => null), s = f ? f.size : n.size;
        if (s == null) acc.unknown = true; else acc.size += s;
      }
      size.textContent = fmtSize(acc.size) + (acc.unknown ? " " + T("(chưa tính file không rõ cỡ)") : "");
      extra.textContent = T("{files} file, {dirs} folder", { files: acc.files, dirs: acc.dirs }) + (acc.more ? " " + T("(dừng ở {n} mục)", { n: LocalFs.MAX_ENTRIES }) : "");
    })().catch(e => { size.textContent = extra.textContent = T("Không đọc được: {msg}", { msg: e.message }); });
  }

  function onMenu(e) {
    const head = headOf(e.target);
    if (!head || wantsNative(e)) return;
    e.preventDefault();
    const node = Explorer.nodeOf(head), r = head.getBoundingClientRect(), byKey = !e.clientX && !e.clientY;
    TabMenu.show(node ? items(node, head, treeTop(node, head)) : rowItems(head), byKey ? r.left : e.clientX, byKey ? r.bottom : e.clientY);
  }

  // Tree rows and folder tab rows share the shortcuts.
  function onKey(e) {
    const head = e.target.closest && (box.contains(e.target) ? headOf(e.target) : e.target.closest(".fi-list > .fi-row"));
    const node = head && (Explorer.nodeOf(head) || FolderRows.nodeOf(head));
    if (!node) return;
    // A held key repeats: one delete / cut / paste per press.
    if (e.repeat && (e.key === "Delete" || e.key === "F2" || ((e.ctrlKey || e.metaKey) && /^[xcv]$/i.test(e.key)))) { e.preventDefault(); return; }
    // A list tab row inside the selection acts for the whole selection.
    const nodes = head.matches(".fi-row") ? FolderRows.selection(head) : [node];
    const ctrl = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey ? e.key.toLowerCase() : "", plain = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    const child = ExplorerOps.writableNode(node) && node.parent, all = nodes.every(n => ExplorerOps.writableNode(n) && n.parent);
    const run = ctrl === "x" && all ? () => ExplorerOps.setClip(nodes, true)
      : ctrl === "c" && all ? () => ExplorerOps.setClip(nodes, false)
      : ctrl === "v" && ExplorerOps.canPaste() ? () => ExplorerOps.paste(node)
      : e.key === "F2" && plain && child ? () => ExplorerDisk.rename(node)
      : e.key === "Delete" && !e.ctrlKey && !e.metaKey && !e.altKey && all ? () => ExplorerDisk.remove(nodes, { permanent: e.shiftKey })
      : e.key === "Enter" && e.altKey && !e.ctrlKey && !e.shiftKey ? () => properties(nodes, head) : null;
    if (!run) return;
    e.preventDefault();
    e.stopPropagation();
    run();
  }

  box.addEventListener("contextmenu", onMenu);
  // window capture: ahead of the app shortcuts on document (F2 = next bookmark there).
  addEventListener("keydown", onKey, true);
  return { properties, items, backItems, groupItems, newEntries, viewEntries, folderTabEntry, wantsNative, armNative };
})();
