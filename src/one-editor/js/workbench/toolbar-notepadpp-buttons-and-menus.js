// Notepad++-style toolbar buttons: undo / redo, zoom, show all characters, Encoding menu (reopen with / convert to / EOL), one Open menu (file / folder), Function List toggle.
const ToolbarButtons = (() => {
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text || "" });
  const below = (btn, nodes) => { const r = btn.getBoundingClientRect(); TabMenu.show(nodes, r.left, r.bottom + 2); };
  const check = (b, on) => { b.classList.add("chk"); b.setAttribute("role", "menuitemradio"); b.setAttribute("aria-checked", on); return b; };
  const encName = (enc, bom) => Encoding.label(enc) + (bom ? " BOM" : "");
  const activeRoot = () => { const d = Views.activeDoc(); return d ? Docs.root(d) : (StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"), null); };

  const REOPEN = ["utf-8", "utf-16le", "utf-16be", "windows-1252", "windows-1258"];
  const CONVERT = [["utf-8", false], ["utf-8", true], ["utf-16le", true], ["utf-16be", true], ["windows-1252", false], ["windows-1258", false]];

  function encodingMenu(btn) {
    const doc = activeRoot();
    if (!doc) return;
    if (doc.hex) { StatusBar.msg(T("Tab HEX — không có bảng mã."), "warn"); return; }
    const E = EncodingActions, enc = doc.enc || "utf-8", bom = !!doc.bom, eol = doc.eol || "\n";
    const nodes = [el("div", "menu-head", T("Bảng mã: {enc} · {eol}", { enc: encName(enc, bom), eol: Encoding.EOL_NAME[eol] }))];
    // Reinterpreting needs the original bytes, so only tabs read from disk get it.
    if (doc.kind === "file" && (doc.file || doc.handle)) {
      nodes.push(el("hr", "menu-sep"), el("div", "menu-head", T("Đọc lại file với bảng mã")));
      for (const e of REOPEN) nodes.push(check(TabMenu.entry(Encoding.label(e), "", () => E.reopen(e)), e === enc));
    }
    nodes.push(el("hr", "menu-sep"), el("div", "menu-head", T("Chuyển sang (ghi khi lưu)")));
    for (const [e, b] of CONVERT) nodes.push(check(TabMenu.entry(T("Chuyển sang {enc}", { enc: encName(e, b) }), "", () => E.convert(e, b)), e === enc && b === bom));
    nodes.push(el("hr", "menu-sep"), el("div", "menu-head", T("Kiểu xuống dòng (EOL)")));
    for (const e of ["\r\n", "\n", "\r"]) nodes.push(check(TabMenu.entry(Encoding.EOL_NAME[e], "", () => E.setEol(e)), !doc.eolMixed && e === eol));
    nodes.push(el("hr", "menu-sep"), TabMenu.entry(T("Bảng mã khác… (Shift-JIS, GBK, Big5, Windows-125x)"), "", E.pick));
    below(btn, nodes);
  }

  function openMenu(btn) {
    const all = Commands.all();
    below(btn, ["openFiles", "openFolder", "openCloudFolder"].map(id => TabMenu.item(all.find(c => c.id === id))));
  }

  // Toggles like Notepad++: a second press hides the side bar when Function List is already showing.
  function functionList() {
    const shown = !document.body.classList.contains("no-explorer") && !document.querySelector('[data-side-panel="outline"]').hidden;
    if (shown && !matchMedia("(max-width: 640px)").matches) Actions.toggleExplorer();
    else SideBar.show("outline");
  }

  const edit = id => () => { if (activeRoot()) CM.commands[id](Views.activeView()); };

  function sync() {
    const d = Views.activeDoc(), doc = d && Docs.root(d), b = $("btnEnc");
    b.textContent = !doc ? "—" : doc.hex ? "HEX" : encName(doc.enc || "utf-8", doc.bom);
    b.disabled = !doc;
  }

  function init() {
    const on = (id, fn) => $(id).addEventListener("click", fn);
    on("btnUndo", edit("undo"));
    on("btnRedo", edit("redo"));
    on("btnZoomIn", () => Actions.zoom(1));
    on("btnZoomOut", () => Actions.zoom(-1));
    on("btnHidden", EncodingActions.toggleHidden);
    on("btnEnc", e => encodingMenu(e.currentTarget));
    on("btnOpen", e => openMenu(e.currentTarget));
    on("btnFnList", functionList);
    // Act on the editor without taking focus, so the caret and selection stay put.
    for (const id of ["btnUndo", "btnRedo", "btnZoomIn", "btnZoomOut", "btnHidden"]) $(id).addEventListener("mousedown", e => e.preventDefault());
    $("btnHidden").setAttribute("aria-pressed", CmSetup.settings.hidden);
  }

  return { init, sync };
})();
