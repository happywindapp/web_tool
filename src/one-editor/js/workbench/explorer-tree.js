// Explorer: pinned items, open tabs, notes (IndexedDB) and a local folder tree loaded lazily; every row is a button so touch and keyboard work like the mouse.
const Explorer = (() => {
  const box = $("explorer"), filter = $("exFilter");
  let root = null, raf = 0;
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
  function section(title, rows, tools = []) {
    const s = el("section", "ex-sec"), h = el("h3");
    h.append(el("span", "", title), ...tools);
    s.append(h, ...rows);
    return s;
  }
  function fileIcon(name) {
    const id = LangDetect.byName(name);
    if (/\.(png|jpe?g|gif|webp|bmp|ico)$/i.test(name)) return "🖼";
    return !id ? "📄" : DATA.has(id) ? "🧾" : id === "Markdown" ? "📘" : id === LangDetect.PLAIN || id === "Log" ? "📄" : "📜";
  }

  async function openNode(node) {
    try {
      const { file, handle } = await node.read();
      await FileOpen.openMany([{ file, handle }], Views.focused);
    } catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: node.name, msg: e.message }), "bad"); }
  }

  function treeNode(node, hit) {
    if (!node.dir) return hit(node.name) ? row(fileIcon(node.name) + " " + node.name, node.path, () => openNode(node), ExplorerDisk.buttons(node)) : null;
    const d = el("details", "ex-dir"), kids = el("div", "ex-kids"), sum = el("summary");
    sum.append(el("span", "ex-dname", "📁 " + node.name), ...ExplorerDisk.buttons(node));
    sum.title = node.path;
    d.append(sum, kids);
    const fill = () => kids.replaceChildren(...node.children.map(c => treeNode(c, hit)).filter(Boolean));
    d.addEventListener("toggle", async () => {
      node.open = d.open;
      if (!d.open || node.children) return;
      kids.replaceChildren(el("p", "ex-empty", T("Đang đọc…")));
      try { node.children = await node.list(); fill(); }
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
    return row("📝 " + d.name, T("Mở ghi chú"), () => openNote(d),
      [pinAct(Pinned.hasNote(d), T(PIN_ITEM), () => Pinned.toggleNote(d)), btn("ex-act", "✎", T("Đổi tên"), () => TabStrip.rename(d)), btn("ex-act", "🗑", T("Xoá ghi chú"), del)]);
  }

  function pinnedSection(hit) {
    const items = Pinned.items().filter(p => hit(Pinned.nameOf(p)));
    const icon = p => p.kind === "dir" ? "📁" : p.kind === "note" ? "📝" : fileIcon(p.name);
    const title = p => T(p.kind === "dir" ? "Mở folder này trong Explorer" : p.kind === "note" ? "Mở ghi chú" : "Mở file");
    return items.length ? section(T("Đã ghim"), items.map(p => row(icon(p) + " " + Pinned.nameOf(p), title(p), () => Pinned.open(p), [btn("ex-act", "✕", T("Bỏ ghim"), () => Pinned.remove(p))]))) : null;
  }

  function recentSection(hit) {
    const items = RecentFiles.list().filter(r => hit(r.name));
    const rows = items.map(r => row(fileIcon(r.name) + " " + r.name, T("Mở lại — lần mở trước: {at}", { at: new Date(r.at).toLocaleString(I18n.lang) }), () => RecentFiles.open(r),
      [pinAct(false, T(PIN_ITEM), () => Pinned.toggleHandle(r.handle)), btn("ex-act", "✕", T("Bỏ khỏi danh sách"), () => RecentFiles.remove(r))]));
    const empty = LocalFs.canPick ? T("Chưa có file nào mở gần đây.") : T("Trình duyệt này không giữ được file để mở lại (cần Chrome / Edge).");
    return section(T("Gần đây"), rows.length ? rows : [el("p", "ex-empty", empty)], items.length ? [btn("ex-act", "🗑", T("Xoá danh sách Gần đây"), () => RecentFiles.clear())] : []);
  }

  function draw() {
    raf = 0;
    const q = filter.value.trim().toLowerCase(), hit = s => !q || s.toLowerCase().includes(q);
    const open = Views.groups.flatMap(g => g.tabs.map(id => [g.i, Docs.get(id)])).filter(([, d]) => d && hit(d.name));
    const notes = Docs.notes().filter(d => hit(d.name)).sort((a, b) => Pinned.hasNote(b) - Pinned.hasNote(a) || b.updated - a.updated);
    const refreshBtn = () => btn("ex-act", "🔄", T("Làm mới từ đĩa: đọc lại folder và các file bị sửa bên ngoài"), () => DiskSync.checkAll());
    const tabPin = d => pinAct(d.pinned, T(d.pinned ? "Bỏ ghim tab" : "Ghim tab (luôn ở đầu view, hỏi lại trước khi đóng)"), () => Views.togglePin(d));
    const sections = [
      pinnedSection(hit),
      section(T("Đang mở"), open.length ? open.map(([gi, d]) => row(TabStrip.ICON[d.kind] + " " + d.name + (d.dirty ? " ●" : "") + (d.diskChanged ? " ⚠" : ""), T("View {n}", { n: gi + 1 }), () => { Views.activate(gi, d.id); PhoneLayout.show(gi + 1); }, [tabPin(d)]))
        : [el("p", "ex-empty", T("Chưa mở tab nào."))], Docs.list().some(d => d.kind === "file" && d.handle) ? [refreshBtn()] : []),
      section(T("Ghi chú"), notes.length ? notes.map(noteRow) : [el("p", "ex-empty", NotesDb.ok ? T("Chưa có ghi chú — bấm + để tạo.") : T("Trình duyệt chặn IndexedDB — ghi chú không được lưu."))],
        [btn("ex-act", "+", T("Ghi chú mới (Alt+N)"), () => Actions.newNote(Views.focused))]),
      recentSection(hit),
    ];
    if (root) {
      const tree = treeNode(root, hit);
      sections.push(section(T("Folder"), [tree], [...(root.handle ? [refreshBtn()] : []), btn("ex-act", "✕", T("Đóng folder"), () => setRoot(null))]));
    } else {
      sections.push(section(T("Folder"), [el("p", "ex-empty", T("Chưa mở folder. Kéo folder vào đây hoặc bấm:")), btn("ex-open", T("📂 Mở folder…"), T("Mở folder trên máy"), () => Actions.openFolder())]));
    }
    box.replaceChildren(...sections.filter(Boolean));
  }

  const render = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function setRoot(node) { root = node; if (root) root.open = true; render(); DiskSync.rewatch(); }

  // Open folders are listed again; known entries keep their node (open state, row buttons), closed folders are read when opened next.
  async function relist(node) {
    const key = c => c.name + (c.dir ? "/" : ""), old = new Map((node.children || []).map(c => [key(c), c]));
    node.children = (await node.list()).map(c => old.get(key(c)) || c);
    for (const c of node.children) {
      if (c.dir && c.open && c.children) await relist(c).catch(() => { c.children = null; });
      else if (c.dir) c.children = null;
    }
  }
  async function refresh() {
    if (!root || !root.handle || !root.children) return;
    const sig = () => { const out = [], walk = n => { out.push(n.path); (n.children || []).forEach(walk); }; walk(root); return out.join("\n"); };
    const before = sig();
    try { await relist(root); } finally { if (sig() !== before) render(); }
  }

  // Files of the folders already read (Quick Open does not walk the disk).
  function loadedFiles() {
    const out = [], walk = n => { if (!n.dir) out.push(n); else (n.children || []).forEach(walk); };
    if (root) walk(root);
    return out;
  }

  filter.addEventListener("input", render);
  return { render, setRoot, refresh, loadedFiles, openNode, openNote, root: () => root };
})();
