// Explorer section headers like VS Code: ▾ fold one section or all of them, the ⋯ menu to show / hide sections; both kept in localStorage.
const ExplorerSections = (() => {
  const box = $("explorer"), foldAllBtn = $("exFoldAll");
  const BUILT_IN = [["pinned", "Đã ghim"], ["open", "Đang mở"], ["notes", "Ghi chú"], ["recent", "Gần đây"], ["trash", "Thùng rác"], ["folder", "Folder"]];
  const map = k => { const v = Prefs.get(k, {}); return v && typeof v === "object" ? v : {}; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let filtering = false;

  function save(k, keys, on) {
    const m = { ...map(k) };
    keys.forEach(key => { if (on) m[key] = true; else delete m[key]; });
    Prefs.set(k, m);
  }
  function paint(s, folded) { s.classList.toggle("folded", folded); s.querySelector(".ex-fold").setAttribute("aria-expanded", !folded); }
  const secs = () => [...box.querySelectorAll(".ex-sec")];

  function sync() {
    const open = secs().some(s => !s.classList.contains("folded"));
    foldAllBtn.textContent = open ? "⊟" : "⊞";
    foldAllBtn.title = T(open ? "Thu gọn tất cả mục" : "Mở rộng tất cả mục");
  }

  // null when hidden from the ⋯ menu; folding toggles a class in place (no redraw ⇒ keyboard focus stays); a filter in use unfolds every section.
  function section(key, title, rows, tools = []) {
    if (map("exHidden")[key]) return null;
    const s = el("section", "ex-sec"), h = el("h3"), fold = el("button", "ex-fold", title);
    s.dataset.key = key;
    fold.title = T("Thu gọn / mở rộng mục");
    fold.onclick = () => { const on = !s.classList.contains("folded"); save("exFolded", [key], on); paint(s, on); sync(); };
    h.append(fold, ...tools);
    s.append(h, ...rows);
    paint(s, !filtering && !!map("exFolded")[key]);
    return s;
  }

  function toggleAll() {
    const all = secs(), fold = all.some(s => !s.classList.contains("folded"));
    if (fold) save("exFolded", all.map(s => s.dataset.key), true); else Prefs.set("exFolded", {});
    all.forEach(s => paint(s, fold));
    sync();
  }

  function check(on, label, run) {
    const b = TabMenu.entry((on ? "☑ " : "☐ ") + label, "", run);
    b.setAttribute("role", "menuitemcheckbox");
    b.setAttribute("aria-checked", on);
    return b;
  }
  function viewsMenu(anchor) {
    const hid = map("exHidden"), r = anchor.getBoundingClientRect();
    const all = [...BUILT_IN.map(([k, t]) => [k, T(t)]), ...Groups.list().map(g => ["g:" + g.id, "🗂 " + g.name])];
    TabMenu.show([el("div", "menu-head", T("Hiện / ẩn mục")), ...all.map(([k, label]) => check(!hid[k], label, () => { save("exHidden", [k], !hid[k]); Explorer.render(); })),
      el("hr", "menu-sep"), TabMenu.entry(T("Hiện tất cả mục"), "", () => { Prefs.set("exHidden", {}); Explorer.render(); })], r.left, r.bottom + 2);
  }

  // A deleted group leaves no fold / hidden key behind.
  function forget(key) { save("exFolded", [key], false); save("exHidden", [key], false); }

  // Every section hidden ⇒ a hint where to bring them back.
  function after() {
    if (!secs().length) box.append(el("p", "ex-empty", T("Mọi mục đang ẩn — bấm ⋯ (Hiện / ẩn mục) để hiện lại.")));
    sync();
  }

  foldAllBtn.onclick = toggleAll;
  $("exViews").onclick = e => viewsMenu(e.currentTarget);
  return { section, after, forget, setFiltering: on => { filtering = on; } };
})();
