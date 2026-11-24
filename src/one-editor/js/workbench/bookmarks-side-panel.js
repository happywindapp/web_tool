// Bookmarks side panel (activity bar 🔖): marked lines of open tabs, notes and closed files grouped per file, filter, click ⇒ that line, ✕ removes; Ctrl+F2 / ＋ / right-click toggle the cursor line.
const BookmarkList = (() => {
  const box = $("bmList"), filter = $("bmFilter"), folded = new Set();
  const L = SidePanelList, el = L.el, visible = () => L.visible("bookmarks");
  const canMark = d => !!d && !Docs.isList(d) && !PreviewPane.isPane(d) && !d.hex && !d.big && !d.stale && !d.sealed;
  const later = L.later("bookmarks", () => render());

  // A clone shares its original's marks: the whole family gets the same lines.
  function set(doc, lines) {
    const r = Docs.root(doc), list = BookmarkLines.clean(lines);
    r.marks = list;
    for (const d of Docs.family(r)) if (d.state && d.marksLive) Views.applyEffect(d, Bookmarks.effect(list));
    Docs.update(r, {}, "bookmark");
  }

  function toggle(doc) {
    if (!canMark(doc)) { StatusBar.msg(T("Tab này không đặt bookmark được."), "warn"); return; }
    const g = Views.groups.find(x => x.active === doc.id), st = g ? g.view.state : Docs.ensureState(doc);
    const n = st.doc.lineAt(st.selection.main.head).number, cur = Bookmarks.linesOf(doc), on = !cur.includes(n);
    set(doc, on ? [...cur, n] : cur.filter(x => x !== n));
    StatusBar.msg(T(on ? "🔖 Đã đánh dấu dòng {n} — xem mọi bookmark ở 🔖 thanh bên." : "Đã bỏ bookmark dòng {n}.", { n }), "good");
  }

  // Open tabs in view order first, then closed notes (latest first); a locked note shows line numbers only.
  function docGroups() {
    const shown = Views.groups.slice(0, Views.count).flatMap(g => g.tabs), seen = new Set(shown);
    const docs = [...shown.map(Docs.get).filter(Boolean), ...Docs.list().filter(d => !seen.has(d.id)).sort((a, b) => b.updated - a.updated)];
    return docs.filter(d => d.kind !== "clone").map(d => {
      const lines = Bookmarks.linesOf(d);
      if (!lines.length) return null;
      const texts = d.sealed ? lines.map(() => "") : d.state && d.marksLive ? lines.map(n => d.state.doc.line(n).text.slice(0, 200)) : BookmarkLines.texts(d.text, lines);
      return { key: d.id, icon: TabStrip.ICON[d.kind], name: d.name, items: lines.map((n, i) => ({ n, text: texts[i] })),
        // A clean file tab after F5 has no text yet: re-read it first (this click grants the read permission).
        open: async n => { if (d.stale) await FileOpen.reload(d, true); if (d.stale || !Docs.get(d.id)) return; Views.revealLine(d, n); PhoneLayout.show(Views.where(d.id) + 1); }, drop: n => set(d, lines.filter(x => x !== n)), dropAll: () => set(d, []) };
    }).filter(Boolean);
  }

  function fileGroups() {
    return BookmarkFiles.items().map(x => ({ key: "closed:" + x.at + ":" + x.name, icon: "📄", name: x.name, closed: true, items: x.lines.map((n, i) => ({ n, text: x.texts[i] || "" })),
      open: n => BookmarkFiles.open(x, n), drop: n => BookmarkFiles.drop(x, n), dropAll: () => BookmarkFiles.drop(x) }));
  }

  const row = (g, it) => L.row([el("small", "", it.n + ": "), it.text.trim()], { title: T("Dòng {n}", { n: it.n }), onclick: () => g.open(it.n), acts: [L.act("✕", T("Bỏ bookmark này"), () => g.drop(it.n))] });

  const groupEl = g => L.group({ key: g.key, label: g.icon + " " + g.name, path: g.closed ? T("đã đóng — bấm để mở lại") : "", count: g.items.length, title: g.name, folded,
    acts: [L.act("✕", T("Xoá mọi bookmark của mục này"), () => g.dropAll())], items: g.items.map(it => row(g, it)) });

  function render() {
    if (!visible()) return;
    const q = filter.value.trim().toLowerCase(), all = [...docGroups(), ...fileGroups()];
    const groups = q ? all.map(g => g.name.toLowerCase().includes(q) ? g : { ...g, items: g.items.filter(it => it.text.toLowerCase().includes(q)) }).filter(g => g.items.length) : all;
    if (groups.length) { box.replaceChildren(...groups.map(groupEl)); return; }
    box.replaceChildren(L.empty(all.length ? T("Không có bookmark khớp.") : T("Chưa có bookmark. Đặt con trỏ ở dòng cần nhớ rồi bấm ＋, Ctrl+F2 hoặc chuột phải → Bookmark.")));
  }

  function show(arg, quiet) {
    render();
    if (!quiet && !L.coarse()) filter.focus();
  }

  function clearAll() {
    const n = Docs.list().reduce((k, d) => k + (d.kind === "clone" ? 0 : Bookmarks.linesOf(d).length), 0) + BookmarkFiles.items().reduce((k, x) => k + x.lines.length, 0);
    if (!n) { StatusBar.msg(T("Chưa có bookmark nào."), "warn"); return; }
    if (!confirm(T("Xoá mọi bookmark ({n}) ở mọi tab, ghi chú và file đã đóng?", { n: I18n.num(n) }))) return;
    for (const d of Docs.list()) if (d.kind !== "clone" && Bookmarks.linesOf(d).length) set(d, []);
    BookmarkFiles.clear();
    StatusBar.msg(T("Đã xoá mọi bookmark."), "good");
  }

  function init() {
    filter.addEventListener("input", later);
    $("bmAdd").onclick = () => { const d = Views.activeDoc(); if (d) toggle(d); else StatusBar.msg(T("Chưa có tab nào đang chọn."), "warn"); };
    $("bmClear").onclick = clearAll;
    Docs.on(type => { if (type !== "lang") later(); });
    Views.onChange(later);
    I18n.onChange(render);
    SidePanels.register("bookmarks", { show });
  }

  return { init, show, render, set, toggle, clearAll };
})();
