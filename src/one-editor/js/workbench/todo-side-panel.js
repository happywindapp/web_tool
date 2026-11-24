// TODO / FIXME side panel (☑): tags in open tabs, notes and the Explorer folder (same skip rules as Find in files), by file or by tag, Stop keeps what was found; tabs rescan after edits, the folder only on open / ↻.
const TodoPanel = (() => {
  const L = SidePanelList, el = L.el, box = $("tdList"), filter = $("tdFilter"), status = $("tdStatus"), folded = new Set(), MAX = 5000;
  let tabs = [], dirs = [], cur = null, gen = 0, byTag = false, dirty = false;
  const tags = () => TodoScan.tags(Prefs.get("todoTags", ""));
  // Folder hits of files that are open as tabs now (the tab part holds their live text).
  async function dropOpen(list, tabGroups) {
    const hs = tabGroups.map(g => g.doc.handle).filter(Boolean);
    const same = async g => g.node && g.node.handle && (await Promise.all(hs.map(h => h.isSameEntry(g.node.handle).catch(() => false)))).some(Boolean);
    return (await Promise.all(list.map(async g => (await same(g) ? null : g)))).filter(Boolean);
  }

  // folder: also walk the Explorer folder; without it only the tab / note part is replaced.
  async function scan(folder) {
    if (!folder && cur && !cur.done) { dirty = true; return; }
    const my = ++gen, re = TodoScan.regex(tags()), c = cur = { st: FindSources.stats(), done: false, stopped: false, count: 0, folder };
    const t = [], d = [];
    let drawn = 0;
    const take = () => { tabs = t; if (folder) dirs = d; };
    $("tdStop").hidden = false;
    try {
      await FindCore.sliced(FindSources.items({ folder: folder && $("tdFolder").checked, heavy: false }, c.st), ({ text, ...it }) => {
        const hits = TodoScan.scan(text, re, MAX - c.count);
        if (!hits.length) return;
        c.count += hits.length;
        (it.doc ? t : d).push({ ...it, hits });
      }, { stop: () => my !== gen || c.stopped || c.count >= MAX, progress: () => { if (my === gen && Date.now() - drawn > 250) { drawn = Date.now(); take(); render(); } } });
    } catch (e) { c.failed = e.message; }
    if (my !== gen) return;
    take();
    if (!folder) dirs = await dropOpen(dirs, t);
    c.done = true;
    $("tdStop").hidden = true;
    render();
    if (dirty) { dirty = false; if (L.visible("todo")) scan(false); }
  }

  const hitRow = (g, h, withName) => L.row([el("span", "todo-tag " + TodoScan.tone(h.tag), h.tag), " " + (h.note || "—"), el("small", "", "  " + (withName ? g.name + ":" : ":") + h.line)],
    { title: (g.path || g.name) + ":" + h.line, onclick: () => SideBar.jump(g, { line: h.line, col: h.col - 1, from: 0, to: h.tag.length }) });

  function render() {
    const all = [...tabs, ...dirs], n = all.reduce((k, g) => k + g.hits.length, 0);
    SidePanels.badge("todo", n, T("{n} mục TODO / FIXME", { n: I18n.num(n) }));
    if (!L.visible("todo")) return;
    const q = filter.value.trim().toLowerCase();
    const groups = all.map(g => !q || (g.path + "/" + g.name).toLowerCase().includes(q) ? g : { ...g, hits: g.hits.filter(h => h.note.toLowerCase().includes(q) || h.tag.toLowerCase().includes(q)) }).filter(g => g.hits.length);
    const files = new Set(all.map(g => g.key)).size, c = cur, notes = [];
    if (c && !c.done) notes.push(T("⏳ Đã quét {n} file…", { n: I18n.num(c.st.files) }));
    if (c && c.count >= MAX) notes.push(T("dừng ở {max} kết quả", { max: I18n.num(MAX) }));
    if (c && c.stopped) notes.push(T("đã dừng"));
    if (c && c.failed) notes.push(T("tìm bị ngắt vì lỗi: {msg}", { msg: c.failed }));
    status.textContent = T("{n} mục trong {files} file", { n: I18n.num(n), files: I18n.num(files) }) + (notes.length ? " — " + notes.join(" · ") : "");
    $("tdMode").setAttribute("aria-pressed", String(byTag));
    if (!groups.length) { box.replaceChildren(L.empty(n ? T("Không có mục khớp.") : c && !c.done ? "" : T("Không có TODO / FIXME. Tag đang tìm: {tags} — đổi ở ⚙ Cài đặt → Từ khoá TODO.", { tags: tags().join(", ") }))); return; }
    box.replaceChildren(...(byTag
      ? TodoScan.byTag(groups, tags()).map(x => L.group({ key: "tag:" + x.tag, label: x.tag, count: x.items.length, folded, cls: TodoScan.tone(x.tag), items: x.items.map(({ g, hit }) => hitRow(g, hit, true)) }))
      : groups.map(g => L.group({ key: g.key, label: g.icon + " " + g.name, path: g.path, count: g.hits.length, folded, items: g.hits.map(h => hitRow(g, h, false)) }))));
  }

  function show(arg, quiet) {
    scan(true);
    if (!quiet && !L.coarse()) filter.focus();
  }

  function init() {
    filter.addEventListener("input", L.later("todo", render, 200));
    $("tdMode").onclick = () => { byTag = !byTag; render(); };
    $("tdRefresh").onclick = () => scan(true);
    $("tdFolder").addEventListener("change", () => scan(true));
    $("tdStop").onclick = () => { if (cur) cur.stopped = true; };
    Docs.on(L.later("todo", () => scan(false), 800));
    I18n.onChange(render);
    SidePanels.register("todo", { show, hide: () => { if (cur && !cur.done) cur.stopped = true; } });
  }

  return { init, rescan: () => { if (L.visible("todo")) scan(true); } };
})();
