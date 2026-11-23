// Folder tab View / Sort by / Group by like the Windows Explorer ribbon (icons · list · details · tiles · content · columns, Ctrl+Shift+1…9), kept across reloads; arrow keys follow the layout.
const FolderView = (() => {
  const MODES = [["xl", "Biểu tượng rất lớn"], ["lg", "Biểu tượng lớn"], ["md", "Biểu tượng vừa"], ["sm", "Biểu tượng nhỏ"],
    ["list", "Danh sách"], ["details", "Chi tiết"], ["tiles", "Ô xếp"], ["content", "Nội dung"], ["cols", "Cột"]];
  const COLS = [["name", "Tên"], ["mod", "Ngày sửa"], ["type", "Kiểu"], ["size", "Kích thước"]];
  const GROUPS = [["none", "Không nhóm"], ["type", "Kiểu"], ["date", "Ngày sửa"], ["size", "Kích thước"]];
  const GRID = new Set(["xl", "lg", "md", "sm", "tiles"]), listeners = [];
  const valid = m => MODES.some(x => x[0] === m);
  // Display options of every list tab and the tree: hidden files (".x"), extensions, thumbnails, colour by age / type ([Prefs key, default]).
  const FLAGS = { hidden: ["fiHidden", true], ext: ["fiExt", true], thumbs: ["fiThumbs", true], age: ["fiAge", false], kind: ["fiKind", false], flatSkip: ["fiFlatSkip", true] }, flags = {};
  let view = null, sort = null, pv = false, det = false, checks = false, grp = "none";
  // Read on first use: Prefs is defined later in the bundle.
  function load() {
    if (view) return;
    const m = Prefs.get("fiView"), s = Prefs.get("fiSort");
    view = valid(m) ? m : "details";
    sort = COLS.some(c => c[0] === s?.key) ? { key: s.key, asc: s.asc !== false } : { key: "name", asc: true };
    pv = Prefs.get("fiPreview", false) === true;
    det = !pv && Prefs.get("fiDetails", false) === true;
    checks = Prefs.get("fiChecks", false) === true;
    grp = GROUPS.some(g => g[0] === Prefs.get("fiGroup")) ? Prefs.get("fiGroup") : "none";
    for (const [k, [key, def]] of Object.entries(FLAGS)) flags[k] = Prefs.get(key, def) === !def ? !def : def;
    paintBody();
  }
  // Colours are a body class: a switch changes no row.
  const paintBody = () => { document.body.classList.toggle("fi-c-age", flags.age); document.body.classList.toggle("fi-c-kind", flags.kind); };
  const changed = () => listeners.forEach(fn => fn());
  // Preview pane (Alt+P) and item check boxes, like the Windows View menu: a class change, the rows are not rebuilt.
  const togglers = [], toggled = () => togglers.forEach(fn => fn());
  // Preview and details share the pane, like Windows Alt+P / Alt+Shift+P: one turns the other off.
  const togglePreview = () => { load(); pv = !pv; if (pv && det) { det = false; Prefs.set("fiDetails", false); } Prefs.set("fiPreview", pv); toggled(); };
  const toggleDetails = () => { load(); det = !det; if (det && pv) { pv = false; Prefs.set("fiPreview", false); } Prefs.set("fiDetails", det); toggled(); };
  const flag = k => (load(), flags[k]);
  function setFlag(k, v) {
    load();
    if (flags[k] === v) return;
    flags[k] = v;
    Prefs.set(FLAGS[k][0], v);
    if (k === "age" || k === "kind") { paintBody(); return; }
    changed();
    if (k !== "thumbs") Explorer.render();
  }
  // Shown name ("README" with extensions off) and whether a name is listed (hidden files off ⇒ no ".x"); filters and type-to-select keep the full name.
  const label = n => flag("ext") || n.dir ? n.name : n.name.replace(/(?!^)\.[^.]*$/, "");
  const shows = name => flag("hidden") || !name.startsWith(".");
  const toggleChecks = () => { load(); checks = !checks; Prefs.set("fiChecks", checks); toggled(); };

  function setMode(m) { load(); if (!valid(m) || m === view) return; view = m; Prefs.set("fiView", m); changed(); }
  function setSort(key, asc) { sort = { key, asc }; Prefs.set("fiSort", sort); changed(); }
  function setGroup(g) { load(); if (!GROUPS.some(x => x[0] === g) || g === grp) return; grp = g; Prefs.set("fiGroup", g); changed(); }
  // Column header click: same column flips the order.
  const sortBy = key => { load(); setSort(key, sort.key === key ? !sort.asc : true); };

  const radio = (on, label, keys, run) => { const b = TabMenu.entry((on ? "● " : "○ ") + label, keys, run); b.setAttribute("role", "menuitemradio"); b.setAttribute("aria-checked", on); return b; };
  const head = text => Object.assign(document.createElement("div"), { className: "menu-head", textContent: text });
  const check = (on, label, keys, run) => { const b = TabMenu.entry((on ? "☑ " : "☐ ") + label, keys, run); b.setAttribute("role", "menuitemcheckbox"); b.setAttribute("aria-checked", on); return b; };
  const SHOW = [["ext", "Hiện đuôi file"], ["hidden", "Hiện file ẩn (.xxx)"], ["thumbs", "Ảnh thu nhỏ"], ["age", "Tô màu theo tuổi"], ["kind", "Tô màu theo loại"]];
  const sep = () => Object.assign(document.createElement("hr"), { className: "menu-sep" });
  // t: the folder tab the menu belongs to (flat view is per tab).
  function viewMenu(x, y, t = null) {
    load();
    const tab = t?.node ? [check(FolderFlat.on(t), T("Xem phẳng (mọi file trong folder con)"), "Ctrl+Alt+B", () => FolderFlat.toggle(t)),
      check(flags.flatSkip, T("Bỏ .git / node_modules khi xem phẳng"), "", () => setFlag("flatSkip", !flags.flatSkip)), check(DualPanel.isOn(), T("2 panel kiểu Commander"), "", () => DualPanel.toggle()), sep()] : [];
    TabMenu.show([head(T("Xem")), ...MODES.map(([m, label], i) => radio(m === view, T(label), "Ctrl+Shift+" + (i + 1), () => setMode(m))), sep(),
      check(pv, T("Khung xem trước"), "Alt+P", togglePreview), check(det, T("Khung chi tiết"), "Alt+Shift+P", toggleDetails), check(checks, T("Ô chọn mục"), "", toggleChecks), sep(), ...tab,
      ...SHOW.map(([k, text]) => check(flags[k], T(text), "", () => setFlag(k, !flags[k]))), sep(), TabMenu.entry(T("Sắp xếp theo") + " ▸", "", () => sortMenu(x, y)),
      TabMenu.entry(T("Nhóm theo") + " ▸", "", () => groupMenu(x, y))], x, y);
  }
  function groupMenu(x, y) {
    load();
    TabMenu.show([head(T("Nhóm theo")), ...GROUPS.map(([g, label]) => radio(g === grp, T(label), "", () => setGroup(g)))], x, y);
  }
  function sortMenu(x, y) {
    load();
    TabMenu.show([head(T("Sắp xếp theo")), ...COLS.map(([k, label]) => radio(k === sort.key, T(label), "", () => setSort(k, sort.asc))),
      Object.assign(document.createElement("hr"), { className: "menu-sep" }), radio(sort.asc, T("Tăng dần"), "", () => setSort(sort.key, true)), radio(!sort.asc, T("Giảm dần"), "", () => setSort(sort.key, false))], x, y);
  }

  // Ctrl+Shift+1…9 (e.code, so the layout's shifted digits do not matter) ⇒ that mode.
  const byKey = e => MODES[/^Digit([1-9])$/.exec(e.code)?.[1] - 1]?.[0] || null;
  // Grid columns of the list as laid out (groups and List view with groups flow across too).
  const across = list => { const n = getComputedStyle(list).gridTemplateColumns.split(" ").filter(Boolean).length; return n > 0 && n < 1000 ? n : 1; };
  const flowsAcross = list => GRID.has(view) || (view === "list" && !!list?.closest(".grouped"));

  // Arrow key ⇒ index to focus: grids move by a row of columns, List flows down columns, Details / Content are one column.
  function step(rows, k, key) {
    if (!/^Arrow(Up|Down|Left|Right)$/.test(key)) return null;
    load();
    const list = rows[0]?.parentElement, down = r => r.offsetLeft === rows[0].offsetLeft, grid = list && flowsAcross(list);
    const cols = grid ? across(list) : 1, per = view === "list" && !grid ? rows.filter(down).length : 0;
    const d = { ArrowDown: per ? 1 : cols, ArrowUp: per ? -1 : -cols, ArrowRight: per || (cols > 1 ? 1 : 0), ArrowLeft: -(per || (cols > 1 ? 1 : 0)) }[key];
    if (!d) return null;
    // Past the first / last item ⇒ stay, like Windows.
    return k < 0 ? 0 : k + d < 0 || k + d >= rows.length ? k : k + d;
  }
  // PageUp / PageDown size in items: a screen of rows times the columns.
  function page(list, rows) {
    load();
    if (!rows.length) return 1;
    const grid = flowsAcross(list);
    if (view === "list" && !grid) return rows.filter(r => r.offsetLeft === rows[0].offsetLeft).length;
    const cols = grid ? across(list) : 1;
    return Math.max(1, Math.floor(list.clientHeight / rows[0].offsetHeight) - 1) * cols;
  }

  return { MODES, COLS, GROUPS, mode: () => (load(), view), sort: () => (load(), sort), group: () => (load(), grp), setGroup, groupMenu, check, radio, preview: () => (load(), pv), details: () => (load(), det), checks: () => (load(), checks), togglePreview, toggleDetails, toggleChecks, flag, setFlag, label, shows,
    setMode, setSort: (key, asc) => { load(); setSort(key, asc); }, sortBy, viewMenu, sortMenu, byKey, step, page, onChange: fn => listeners.push(fn), onToggle: fn => togglers.push(fn) };
})();
