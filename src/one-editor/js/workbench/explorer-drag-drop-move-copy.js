// Explorer drag & drop (mouse / pen; touch uses Cut / Paste): folder tab or tree rows onto a folder (row, tree, breadcrumb, another folder tab) move, Ctrl copies, another root copies; onto an editor view they open. OS files / folders dropped on a folder tab with a handle are copied into it. One undo step per drop.
const ExplorerDnd = (() => {
  const TYPE = "application/x-one-editor-items";
  let drag = null, over = null;
  const headOf = el => el?.closest?.(".fi-list > .fi-row, #explorer .ex-row, #explorer .ex-dir > summary") || null;
  const listTab = h => !!h.closest(".fi.tr, .fi.st, .fi.rs");
  const nodeOf = h => (h.matches(".fi-row") ? FolderRows.nodeOf(h) : Explorer.nodeOf(h));
  const rootOf = p => p.split("/")[0];
  const writable = nodes => nodes.every(n => ExplorerOps.writableNode(n) && n.parent);
  const mark = el => { if (over === el) return; over?.classList.remove("dnd-over"); over = el; over?.classList.add("dnd-over"); };
  const end = () => { drag = null; mark(null); };
  const run = p => p.catch(e => StatusBar.msg(T("Kéo-thả lỗi: {msg}", { msg: e.message }), "bad"));

  // → { node | path (breadcrumb), el to light, t (folder tab) } for a folder; { open: view, el } for an editor view; null elsewhere.
  function target(el) {
    const h = headOf(el), g = el?.closest?.(".group"), gi = g ? +g.dataset.group : -1, t = gi >= 0 ? FolderItems.tabIn(gi) : null;
    const tab = t?.node && !t.ui.root.hidden && t.ui.root.contains(el) ? t : null;
    if (h && !h.matches(".fi-row")) { const n = nodeOf(h); return n?.dir ? { node: n, el: h } : null; }
    if (!tab) return g && !g.classList.contains("is-folder") ? { open: gi, el: g } : null;
    const crumb = el.closest(".fi-crumb");
    if (crumb) return { path: crumb.title, el: crumb, t: tab };
    const m = el.closest(".fi-mcol > .fi-row"), n = h ? nodeOf(h) : m && FolderRows.nodeOf(m);
    if (n?.dir) return { node: n, el: h || m, t: tab };
    return el.closest(".fi-body") ? { node: tab.node, el: tab.ui.list, t: tab } : null;
  }
  const destPath = tg => (tg.node ? tg.node.path : tg.path);
  const destWritable = tg => ExplorerOps.writableNode(tg.node || tg.t.node);

  // → "move" | "copy" | null (nothing would happen: read-only, a folder into itself, a move into the same folder).
  function effect(tg, nodes, ctrl) {
    if (!tg) return null;
    if (tg.open != null) return nodes.some(n => !n.dir) ? "copy" : null;
    if (!destWritable(tg) || !writable(nodes)) return null;
    const p = destPath(tg), cut = !ctrl && nodes.every(n => rootOf(n.path) === rootOf(p));
    return nodes.some(n => !(n.dir && (p === n.path || p.startsWith(n.path + "/"))) && !(cut && n.parent.path === p)) ? (cut ? "move" : "copy") : null;
  }

  async function openFiles(nodes, gi) {
    const files = nodes.filter(n => !n.dir);
    await FileOpen.openMany(await Promise.all(files.map(n => n.read())), gi);
    PhoneLayout.show(gi + 1);
  }

  // Several items: a small "n items" picture instead of one row.
  function ghost(e, n) {
    const g = Object.assign(document.createElement("div"), { className: "dnd-ghost", textContent: T("{n} mục", { n }) });
    document.body.append(g);
    e.dataTransfer.setDragImage(g, -10, -10);
    requestAnimationFrame(() => g.remove());
  }

  // Draggable only under a mouse / pen: a touch long-press keeps its menu.
  document.addEventListener("pointerdown", e => { const h = headOf(e.target); if (h && !listTab(h) && nodeOf(h)) h.draggable = e.pointerType !== "touch"; }, true);
  document.addEventListener("dragstart", e => {
    const h = headOf(e.target), n = h && !listTab(h) && nodeOf(h);
    if (!n || !e.dataTransfer) return;
    const nodes = h.matches(".fi-row") ? FolderRows.selection(h) : [n];
    drag = { nodes };
    e.dataTransfer.setData(TYPE, String(nodes.length));
    e.dataTransfer.effectAllowed = "copyMove";
    if (nodes.length > 1) ghost(e, nodes.length);
  }, true);
  document.addEventListener("dragover", e => {
    const types = [...(e.dataTransfer?.types || [])];
    if (drag && types.includes(TYPE)) {
      // Immediate: FileDrop listens on document too, and a dragged picture can also carry "Files".
      e.stopImmediatePropagation();
      const grp = Groups.dropSec(e.target);
      if (grp) { mark(grp); e.preventDefault(); e.dataTransfer.dropEffect = "copy"; return; }
      const tg = target(e.target), eff = effect(tg, drag.nodes, e.ctrlKey || e.metaKey);
      mark(eff && tg.open == null ? tg.el : null);
      if (!eff) { e.dataTransfer.dropEffect = "none"; return; }
      e.preventDefault();
      e.dataTransfer.dropEffect = eff;
    } else if (types.includes("Files")) mark(osTarget(e.target)?.el || null);
  }, true);
  document.addEventListener("dragleave", e => { if (!e.relatedTarget) mark(null); }, true);
  document.addEventListener("dragend", end, true);
  document.addEventListener("drop", e => {
    if (!drag || ![...(e.dataTransfer?.types || [])].includes(TYPE)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const nodes = drag.nodes, grp = Groups.dropSec(e.target), tg = grp ? null : target(e.target), eff = tg && effect(tg, nodes, e.ctrlKey || e.metaKey);
    end();
    if (grp) { Groups.dropNodes(grp, nodes); return; }
    if (!eff) return;
    if (tg.open != null) { run(openFiles(nodes, tg.open)); return; }
    run((async () => { const dest = tg.node || await FolderPaths.resolve(tg.path); if (dest) await ExplorerOps.copyTo(nodes, dest, { cut: eff === "move" }); })());
  }, true);

  // OS drops: only a folder tab (row, breadcrumb or its list) of a folder that can be written.
  function osTarget(el) {
    const tg = target(el);
    return tg?.t && destWritable(tg) ? tg : null;
  }

  async function writeNode(node, dirHandle, name) {
    if (!node.dir) { const h = await dirHandle.getFileHandle(name, { create: true }); await (await node.read()).file.stream().pipeTo(await h.createWritable()); return h; }
    const d = await dirHandle.getDirectoryHandle(name, { create: true });
    for (const c of await node.list()) await writeNode(c, d, ShareState.cleanName(c.name) || "file");
    return d;
  }
  // items from FileDrop.takeItems: a handle (Chrome / Edge) is copied as is, else the entry tree / the file; a taken name keeps both ("a - Copy.txt").
  async function copyIn(items, dest) {
    await LocalFs.writable(dest.handle);
    StatusBar.msg(T("Đang chép vào “{dest}”…", { dest: dest.name }));
    const made = [], failed = [];
    for (const it of items) {
      const h = it.handle ? await it.handle.catch(() => null) : null;
      const src = h ? null : it.entry?.isDirectory ? LocalFs.fromEntry(it.entry) : it.file ? { name: it.file.name, dir: false, read: async () => ({ file: it.file }) } : null;
      if (!h && !src) continue;
      const raw = h ? h.name : src.name;
      if (h?.kind === "directory" && await h.resolve(dest.handle).catch(() => null)) { failed.push(T("“{name}”: không dán folder vào chính nó", { name: raw })); continue; }
      try {
        const name = await ExplorerOps.freeName(dest.handle, ShareState.cleanName(raw) || "file", h ? h.kind === "directory" : src.dir);
        made.push({ handle: h ? await ExplorerOps.copyHandle(h, dest.handle, name) : await writeNode(src, dest.handle, name), parent: dest.handle, path: dest.path });
      } catch (e) { failed.push("“" + raw + "”: " + e.message); }
    }
    ExplorerDisk.reload(dest);
    const what = made.length === 1 ? "“" + made[0].handle.name + "”" : T("{n} mục", { n: made.length });
    if (made.length) ExplorerUndo.created(T("Chép {what} vào “{dest}”", { what, dest: dest.name }), made);
    StatusBar.msg([made.length ? T("Đã chép {what} vào “{dest}”.", { what, dest: dest.name }) : "", failed.length ? T("Không chép được: {list}", { list: failed.join(" · ") }) : ""].filter(Boolean).join(" "), failed.length ? "warn" : "good");
  }
  // FileDrop asks first; → true when the drop was taken (the items are read during the drop event).
  function dropFiles(el, items) {
    const tg = osTarget(el);
    if (!tg) return false;
    mark(null);
    run((async () => { const dest = tg.node || await FolderPaths.resolve(tg.path); if (dest) await copyIn(items, dest); })());
    return true;
  }

  return { dropFiles, takesFiles: el => !!osTarget(el) };
})();
