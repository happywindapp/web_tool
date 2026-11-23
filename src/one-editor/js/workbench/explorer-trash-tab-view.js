// Recycle bin tab (kind "trash", 🗑): items deleted in the Explorer, kept in IndexedDB by TrashStore — restore, download, delete for good; one tab at most, rows and multi-selection as in a folder tab.
const TrashTab = (() => {
  let t = null;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (cls, text, run) => { const b = el("button", cls, text); b.type = "button"; b.onclick = run; return b; };
  const visible = () => !!t && Views.groups.some(g => g.i < Views.count && g.active === t.doc.id);
  const picked = () => { const ids = FolderSel.keys(t); return (ids.length ? ids : t.selName ? [t.selName] : []).map(id => t.recs.get(id)).filter(Boolean); };

  function build(doc) {
    t = { doc, recs: new Map(), selName: null, ui: { root: el("div", "fi tr"), count: el("span", "fi-count"), head: el("div", "fi-row fi-head"), list: el("div", "fi-list"), body: el("div", "fi-body"), selbar: el("div", "fi-selbar") } };
    const { ui } = t, bar = el("div", "fi-bar"), main = el("div", "fi-main");
    ui.title = el("b", "tr-title");
    ui.acts = [["♻", restore], ["⬇", download], ["✖", purge], ["🧹", empty]].map(([text, run]) => btn("fi-nav", text, run));
    bar.append(ui.title, ui.count, ...ui.acts);
    ui.note = el("p", "tr-note");
    main.append(ui.head, ui.list, ui.note);
    ui.body.append(main);
    ui.selbar.hidden = true;
    ui.root.dataset.view = "details";
    ui.root.dataset.i18nSkip = "";
    ui.root.hidden = true;
    ui.root.append(bar, ui.selbar, ui.body);
    FolderSel.wire(t);
    ui.list.addEventListener("contextmenu", onMenu);
    ui.root.addEventListener("keydown", onKey);
    Object.assign(t, { sizeOf: id => t.recs.get(id)?.size ?? null, barActions: () => [["♻", T("Khôi phục"), restore], ["✖", T("Xoá vĩnh viễn"), purge]] });
    FolderSel.init(t);
  }

  function labels() {
    const { ui } = t;
    ui.title.textContent = "🗑 " + T("Thùng rác");
    [T("Khôi phục mục đã chọn về chỗ cũ (Enter)"), T("Tải xuống mục đã chọn (nhiều mục ⇒ ZIP)"), T("Xoá vĩnh viễn mục đã chọn (Delete)"), T("Dọn sạch thùng rác")].forEach((s, k) => { ui.acts[k].title = s; });
    ui.head.replaceChildren(...[["name", "Tên"], ["mod", "Ngày xoá"], ["type", "Vị trí gốc"], ["size", "Kích thước"]].map(([k, label]) => el("span", "fi-" + k, T(label))));
    ui.note.textContent = T("Giữ tối đa {days} ngày, tổng {mb} MB — đầy thì mục cũ nhất tự bỏ. File khôi phục mang ngày sửa mới. Nút 🗑 Xoá dữ liệu đã lưu cũng xoá thùng rác.", { days: TrashQuota.DAYS, mb: TrashQuota.TOTAL / TrashQuota.MB });
  }

  async function paint() {
    if (!t) return;
    labels();
    const list = await TrashStore.list(), { ui } = t;
    t.recs = new Map(list.map(r => [r.id, r]));
    FolderSel.prune(t, id => t.recs.has(id));
    const rows = list.map(r => {
      const row = btn("fi-row", null, e => { FolderSel.click(t, row, e); });
      row.dataset.key = r.id;
      row.title = (r.from ? r.from + "/" : "") + r.name;
      row.ondblclick = e => { if (!t.selMode && !e.target.closest(".fi-chk")) restore(); };
      row.append(el("i", "fi-chk"), el("i", "fi-ico", r.dir ? "📁" : Explorer.fileIcon(r.name)), el("span", "fi-name", r.name), el("span", "fi-mod", FolderFmt.date(r.at)),
        el("span", "fi-type", r.from || "—"), el("span", "fi-size", FolderFmt.size(r.size)));
      return row;
    });
    ui.list.replaceChildren(...rows);
    if (!rows.length) ui.list.append(el("p", "fi-empty", T("Thùng rác trống.")));
    ui.root.classList.toggle("checks", FolderSel.showChecks());
    FolderSel.sync(t);
  }

  async function restore() {
    const recs = picked();
    if (!recs.length) return;
    try {
      await TrashStore.restoreIds(recs.map(r => r.id));
      StatusBar.msg(T("Đã khôi phục {n} mục.", { n: recs.length }), "good");
    } catch (e) { StatusBar.msg(T("Không khôi phục được: {msg}", { msg: e.message }), "bad"); }
  }
  async function download() {
    const recs = picked();
    if (recs.length) await TrashStore.download(recs).catch(e => StatusBar.msg(T("Không tải được: {msg}", { msg: e.message }), "bad"));
  }
  async function purge() {
    const recs = picked();
    if (!recs.length || !confirm(T("Xoá vĩnh viễn {n} mục khỏi thùng rác? Không khôi phục được.", { n: recs.length }))) return;
    await TrashStore.purge(recs.map(r => r.id));
  }
  async function empty() {
    if (!t.recs.size || !confirm(T("Dọn sạch thùng rác ({n} mục)? Không khôi phục được.", { n: t.recs.size }))) return;
    await TrashStore.purge([...t.recs.keys()]);
  }

  function onKey(e) {
    if (e.target.matches("input")) return;
    const rows = [...t.ui.list.querySelectorAll(".fi-row")], k = rows.indexOf(document.activeElement), plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    const to = i => { const r = rows[Math.max(0, Math.min(i, rows.length - 1))]; if (r) { r.focus(); FolderSel.moved(t, r, e); } };
    if (!FolderSel.hotkey(t, e)) {
      if (plain && e.key === "ArrowDown") to(k + 1);
      else if (plain && e.key === "ArrowUp") to(k - 1);
      else if (plain && e.key === "Home") to(0);
      else if (plain && e.key === "End") to(rows.length - 1);
      else if (plain && !e.shiftKey && e.key === "Enter") restore();
      else if (plain && e.key === "Delete") purge();
      else return;
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function onMenu(e) {
    const r = e.target.closest(".fi-row");
    if (!r || ExplorerMenu.wantsNative(e)) return;
    e.preventDefault();
    if (!t.sel.has(r.dataset.key)) FolderSel.single(t, r);
    const E = TabMenu.entry, box = r.getBoundingClientRect(), at = e.clientX || e.clientY ? [e.clientX, e.clientY] : [box.left, box.bottom];
    TabMenu.show([E(T("Khôi phục"), "Enter", restore), E(T("Tải xuống"), "", download), Object.assign(el("hr"), { className: "menu-sep" }), E(T("Xoá vĩnh viễn…"), "Delete", purge)], ...at);
  }

  // Called by Views.refresh after FolderItems.mount: the active bin tab replaces the editor of that view.
  function mount(g) {
    if (!t) return;
    const on = g.active === t.doc.id;
    if (on) { g.el.classList.add("is-folder"); if (t.ui.root.parentNode !== g.el) g.el.append(t.ui.root); t.ui.root.hidden = false; paint(); }
    else if (t.ui.root.parentNode === g.el) t.ui.root.hidden = true;
  }

  function open(gi = Views.focused) {
    if (t && Views.where(t.doc.id) >= 0) { const w = Views.where(t.doc.id); Views.activate(w, t.doc.id); PhoneLayout.show(w + 1); return; }
    if (!t) build(Docs.create({ kind: "trash", name: T("Thùng rác"), readOnly: true }));
    Views.open(t.doc, gi, true);
    PhoneLayout.show(gi + 1);
  }

  Docs.on((type, doc) => { if (type === "remove" && t?.doc.id === doc.id) { t.ui.root.remove(); t = null; } });
  TrashStore.onChange(() => { if (visible()) paint(); });
  I18n.onChange(() => { if (visible()) paint(); });
  FolderView.onToggle(() => { if (t) t.ui.root.classList.toggle("checks", FolderSel.showChecks()); });
  return { open, mount, adopt: doc => { if (!t) build(doc); } };
})();
