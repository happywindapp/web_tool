// Explorer: open tabs, notes (IndexedDB) and a local folder tree loaded lazily; every row is a button so touch and keyboard work like the mouse.
const Explorer = (() => {
  const box = $("explorer"), filter = $("exFilter");
  let root = null, raf = 0;
  const DATA = new Set(["JSON", "YAML", "XML", "CSV", "TSV", "TOML", "Properties files"]);

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (cls, text, title, onClick) => { const b = el("button", cls, text); b.title = title; b.onclick = onClick; return b; };
  const row = (label, title, onClick, extra = []) => { const r = el("div", "ex-row"); r.append(btn("ex-item", label, title, onClick), ...extra); return r; };
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
    if (!node.dir) return hit(node.name) ? row(fileIcon(node.name) + " " + node.name, node.path, () => openNode(node)) : null;
    const d = el("details", "ex-dir"), kids = el("div", "ex-kids"), sum = el("summary", "", "📁 " + node.name);
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

  function noteRow(d) {
    const del = () => {
      if (!confirm(T("Xoá ghi chú “{name}”? Không khôi phục được.", { name: d.name }))) return;
      Views.close(d.id, true);
      Docs.remove(d.id);
    };
    return row("📝 " + d.name, T("Mở ghi chú"), () => { Views.open(d, Views.where(d.id) >= 0 ? Views.where(d.id) : Views.focused); PhoneLayout.show(Views.where(d.id) + 1); },
      [btn("ex-act", "✎", T("Đổi tên"), () => TabStrip.rename(d)), btn("ex-act", "🗑", T("Xoá ghi chú"), del)]);
  }

  function draw() {
    raf = 0;
    const q = filter.value.trim().toLowerCase(), hit = s => !q || s.toLowerCase().includes(q);
    const open = Views.groups.flatMap(g => g.tabs.map(id => [g.i, Docs.get(id)])).filter(([, d]) => d && hit(d.name));
    const notes = Docs.notes().filter(d => hit(d.name)).sort((a, b) => b.updated - a.updated);
    const sections = [
      section(T("Đang mở"), open.length ? open.map(([gi, d]) => row(TabStrip.ICON[d.kind] + " " + d.name + (d.dirty ? " ●" : ""), T("View {n}", { n: gi + 1 }), () => { Views.activate(gi, d.id); PhoneLayout.show(gi + 1); }))
        : [el("p", "ex-empty", T("Chưa mở tab nào."))]),
      section(T("Ghi chú"), notes.length ? notes.map(noteRow) : [el("p", "ex-empty", NotesDb.ok ? T("Chưa có ghi chú — bấm + để tạo.") : T("Trình duyệt chặn IndexedDB — ghi chú không được lưu."))],
        [btn("ex-act", "+", T("Ghi chú mới (Alt+N)"), () => Actions.newNote(Views.focused))]),
    ];
    if (root) {
      const tree = treeNode(root, hit);
      sections.push(section(T("Folder"), [tree], [btn("ex-act", "✕", T("Đóng folder"), () => setRoot(null))]));
    } else {
      sections.push(section(T("Folder"), [el("p", "ex-empty", T("Chưa mở folder. Kéo folder vào đây hoặc bấm:")), btn("ex-open", T("📂 Mở folder…"), T("Mở folder trên máy"), () => Actions.openFolder())]));
    }
    box.replaceChildren(...sections);
  }

  const render = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function setRoot(node) { root = node; if (root) root.open = true; render(); }

  filter.addEventListener("input", render);
  return { render, setRoot };
})();
