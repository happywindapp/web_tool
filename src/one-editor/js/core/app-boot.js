// Boot: load the CodeMirror core, wire controls and listeners, restore the hot-exit session, then open ?demo= / ?data= / a share link.
const Prefs = (() => {
  const P = "web_tool.one-editor.";
  const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  // Every write tells the ⚙ Settings tab, so a switch flipped elsewhere shows there at once.
  const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { /* storage blocked → not remembered */ } Settings.changed(); };
  return { get, set };
})();

const Toolbar = (() => {
  const opt = (v, text) => { const o = document.createElement("option"); o.value = v; o.textContent = text; return o; };

  function sync() {
    const doc = Views.activeDoc() && Docs.root(Views.activeDoc()), sel = $("langSel");
    if (sel.options.length !== LangDetect.ids.length + 1) sel.replaceChildren(opt("", ""), ...LangDetect.ids.map(id => opt(id, id)));
    sel.options[0].textContent = T("Auto ({lang})",{ lang: doc ? doc.detected.id : "—" });
    sel.value = doc ? doc.lang : "";
    sel.disabled = !doc;
    if (Views.activeDoc()) $("opSel").value = RunOp.of(Views.activeDoc());
    $("layoutSel").value = Views.layout;
    ToolbarButtons.sync();
  }

  function fill() {
    $("demo").replaceChildren(opt("", "Samples"), ...Object.entries(DEMOS).map(([k, d]) => opt(k, T(d.label))));
    $("layoutSel").replaceChildren(...Layouts.LIST.map(l => opt(l.id, T(l.label))));
    $("splitSel").replaceChildren(opt("", T("◫ Tỷ lệ…")), ...["50:50", "25:75", "75:25"].map(r => opt(r, r)));
    const op = $("opSel").value;
    const groups = {};
    for (const id of OutputOps.ids) {
      const op = OutputOps.get(id);
      (groups[op.group] ??= Object.assign(document.createElement("optgroup"), { label: T(op.group) })).append(opt(id, T(op.label) + " ⇢"));
    }
    $("opSel").replaceChildren(...Object.values(groups));
    if (op) $("opSel").value = op;
    sync();
  }

  return { fill, sync };
})();

function wireOneEditor() {
  const on = (id, ev, fn) => $(id).addEventListener(ev, fn);
  on("btnNew", "click", () => Actions.newNote());
  on("btnSave", "click", () => Actions.save(false));
  on("btnSaveAs", "click", () => Actions.save(true));
  on("btnRun", "click", Actions.run);
  on("btnRunTop", "click", Actions.run);
  on("opSel", "change", e => RunOp.pick(Views.activeDoc(), e.target.value));
  on("btnSwap", "click", () => Views.swap());
  on("btnShare", "click", () => ShareLoader.share());
  on("btnOpenIn", "click", e => OpenInTool.menu(e.currentTarget));
  on("btnClear", "click", Actions.clearData);
  on("btnSettings", "click", () => SettingsTab.open());
  on("btnToolbar", "click", Actions.toggleToolbar);
  on("chkWrap", "change", e => Actions.setWrap(e.target.checked));
  on("langSel", "change", e => Actions.setLang(e.target.value));
  on("demo", "change", e => { const k = e.target.value; e.target.value = ""; ShareLoader.loadDemo(k); });
  on("uiTheme", "change", () => Views.applySettings());
  on("btnPalette", "click", () => QuickPick.open(">"));
  on("layoutSel", "change", e => Actions.setLayout(e.target.value));
  on("splitSel", "change", e => { const v = e.target.value; e.target.value = ""; if (v) Actions.setSplit(v); });
  on("btnZenExit", "click", Actions.toggleZen);
  on("chkMinimap", "change", e => Actions.setMinimap(e.target.checked));
  on("btnFind", "click", () => Commands.run("find"));
  on("btnRefresh", "click", () => DiskSync.checkAll());
  on("btnFormat", "click", () => Commands.run("formatOut"));
  on("btnCompare", "click", Compare.toggle);
  PreviewPane.init();
  Speech.init();
  FormatActions.load();
  Compare.init();
  Macro.init();
  CmSetup.settings.hidden = Prefs.get("hidden", false) === true;
  ToolbarButtons.init();
  CmSetup.settings.numHover = Prefs.get("numhover", true) !== false;
  CmSetup.settings.lint = Prefs.get("lint", true) !== false;
  CmSetup.settings.words = Prefs.get("words", true) !== false;
  on("btnKeys", "click", () => QuickPick.open(">" + T("Bộ phím")));
  on("btnStyle", "click", e => EditorMenu.openFromButton(e.currentTarget));
  EditorMenu.init();
  on("stLint", "click", () => Commands.run("problems"));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => Views.applySettings());
  registerOneEditorCommands();
  document.addEventListener("keydown", Commands.onKey, true);
  $("work").style.setProperty("--ed-font", (Prefs.get("font", 13) | 0 || 13) + "px");
  // Phone carousel: the view swiped into sight becomes the focused one (new tabs, status bar, ▶ Run follow it).
  const work = $("work");
  work.addEventListener("scroll", Dom.debounce(() => {
    const page = work.clientWidth && matchMedia("(max-width: 640px)").matches ? Math.round(work.scrollLeft / work.clientWidth) : 0;
    if (page > 0) Views.focus(page - 1);
  }, 150), { passive: true });
  Split.init();
  SideBar.init();
  BookmarkList.init();
  ProblemsPanel.init();
  GitPanel.init();
  TodoPanel.init();
  TimelinePanel.init();
  ClipHistory.init();
  LibraryPanel.init();
  SidePanels.init();
  ExportActions.init();
  DiskSync.init();

  Docs.on((type, doc) => {
    if (type === "edit" || type === "dirty") OutputLink.sourceEdited(doc);
    if (type === "lang" || type === "rename") Docs.family(doc).forEach(LangLoader.apply);
    if (type === "kept") StatusBar.msg(T("Đã giữ “{name}” trong Ghi chú.", { name: doc.name }), "good");
    if (type === "handEdited") StatusBar.msg(T("“{name}” đã sửa tay: tab không tự cập nhật theo nguồn nữa, ▶ Chạy sẽ hỏi trước khi ghi đè.", { name: doc.name }), "warn");
    if (type === "edit") return;
    const ids = Docs.family(doc).map(d => d.id);
    Views.groups.forEach(g => { if (g.tabs.some(id => ids.includes(id))) TabStrip.render(g); });
    Explorer.render();
    Toolbar.sync();
    StatusBar.refresh();
  });
  Views.onChange(() => { Explorer.render(); Toolbar.sync(); });
  I18n.onChange(() => { Toolbar.fill(); Views.renderAll(); Explorer.render(); Views.applySettings(); StatusBar.redraw(); });
}

(async function bootOneEditor() {
  I18n.init();
  ThemePicker.bind($("uiTheme"), Prefs);
  if (Prefs.get("explorer", true) === false) document.body.classList.add("no-explorer");
  if (Prefs.get("toolbar", true) === false) Actions.toggleToolbar();
  Toolbar.fill();
  StatusBar.msg(T("Đang nạp trình soạn thảo…"));
  try { await VendorPaths.load("cmCore"); }
  catch (e) { StatusBar.msg(T("Không nạp được CodeMirror ({file}) — cần thư mục vendor/ nằm cạnh file này.", { file: e.message }), "bad"); return; }
  CmSetup.init();
  Views.init();
  TabStrip.init();
  FileDrop.init();
  wireOneEditor();
  await NotesDb.open();
  HotExit.init();
  await ClipHistory.load();
  await Macro.load();
  // Before restore: tabs it drops keep their bookmarks.
  await BookmarkFiles.init();
  if (!NewWindow.active) await HotExit.restore();
  $("chkWrap").checked = CmSetup.settings.wrap;
  Views.applySettings();
  if (Prefs.get("minimap", false) === true) Actions.setMinimap(true);
  if (Prefs.get("guides", true) !== false) Actions.setGuides(true);
  await RecentFiles.load();
  await Pinned.init();
  await Groups.init();
  Tags.load();
  if (!NewWindow.active) Explorer.restore();
  // Extras (breadcrumbs, bracket colours, snippets, key profile, sessions) load after the editor is usable.
  EditorExtras.use(async () => { KeyProfiles.init(); Aids.apply(); await Snippets.load(); await Sessions.init(); });
  StatusBar.storage(NotesDb.ok, NotesDb.error);
  StatusBar.msg(T("Sẵn sàng. Kéo-thả file / folder vào View 1 hoặc View 2, hoặc bấm + để tạo ghi chú."));
  if (NewWindow.active) await NewWindow.take();
  await ShareLoader.fromUrl();
  addEventListener("hashchange", () => ShareLoader.fromUrl());
  Explorer.render();
  Toolbar.sync();
  StatusBar.refresh();
  document.body.classList.add("ready");
})();
