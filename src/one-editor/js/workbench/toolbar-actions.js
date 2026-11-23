// User actions behind the toolbar, header, tab "+" buttons and shortcuts: new note, open/save local files, run an OutputLink op, layout toggles.
const Actions = (() => {
  const activeOrWarn = () => Views.activeDoc() || (StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"), null);

  function newNote(gi = Views.focused) {
    const used = new Set(Docs.list().map(d => d.name));
    let n = Docs.notes().length + 1;
    while (used.has(T("Ghi chú {n}", { n }))) n++;
    const doc = Docs.create({ kind: "note", name: T("Ghi chú {n}", { n }) });
    Views.open(doc, gi);
    PhoneLayout.show(gi + 1);
    return doc;
  }

  async function openFiles() {
    try { await FileOpen.openMany(await LocalFs.pickFiles(), Views.focused); }
    catch (e) { StatusBar.msg(T("Không mở được file: {msg}", { msg: e.message }), "bad"); }
  }

  // Starts in the folder of the active file when the browser knows its handle.
  async function openFolder() {
    const doc = Views.activeDoc(), startIn = doc && doc.kind === "file" && doc.handle ? doc.handle : undefined;
    try {
      const node = await LocalFs.pickDirectory(startIn);
      if (node) showFolder(node, T("Đã mở folder “{name}”.", { name: node.name }));
    } catch (e) { StatusBar.msg(T("Không mở được folder: {msg}", { msg: e.message }), "bad"); }
  }

  function showFolder(node, msg) {
    Explorer.setRoot(node);
    document.body.classList.remove("no-explorer");
    PhoneLayout.show(0);
    StatusBar.msg(msg, "good");
  }

  // Public Google Drive / OneDrive link → read-only folder; the first listing runs before the tree changes, so a bad link fails early.
  // saved: a pinned link (a string — handlers pass an event here otherwise).
  async function openCloudFolder(saved) {
    const link = typeof saved === "string" ? saved : prompt(T("Dán link folder công khai Google Drive hoặc OneDrive cá nhân:"));
    if (!link || !link.trim()) return;
    StatusBar.msg(T("Đang đọc folder…"));
    try {
      const node = await CloudDrive.open(link);
      if (!node) { StatusBar.msg(""); return; }
      showFolder(node, T(node.remote === "onedrive" ? "Đã mở folder “{name}” từ OneDrive — Ctrl+S lưu thẳng lên OneDrive nếu link cho sửa." : "Đã mở folder “{name}” từ Google Drive (chỉ đọc — Lưu sẽ hỏi chỗ lưu trên máy).", { name: node.name }));
    } catch (e) { StatusBar.msg(T("Không mở được folder: {msg}", { msg: e.message }), "bad"); }
  }

  const suggestName = doc => {
    const base = doc.name.replace(/\s*⇢\s*/g, "-").replace(/[\p{Cc}\\/:*?"<>|]+/gu, "_");
    return /\.[\w-]+$/.test(base) ? base : base + "." + LangDetect.extOf(Docs.effectiveLang(doc));
  };

  async function save(asNew = false) {
    const active = activeOrWarn();
    if (!active) return;
    const doc = Docs.root(active);
    if (doc.stale) { FileOpen.reload(doc, true); return; }
    if (doc.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không lưu."), "warn"); return; }
    const fmtError = await FormatActions.beforeSave(doc);
    let data;
    const savedText = Docs.text(doc);
    try { data = LocalFs.encode(MixedEol.textOf(doc), MixedEol.optsOf(doc)); }
    catch (e) { StatusBar.msg(e.message, "bad", e.line ? () => Views.revealLine(doc, e.line) : null); return; }
    const before = doc.state;
    // Typing during the (possibly slow or permission-prompting) write keeps the tab dirty.
    const dirtyAfter = () => doc.state !== before;
    try {
      if (!asNew && doc.kind === "file" && doc.handle) {
        if (!await DiskSync.guard(doc)) return;
        await DiskSync.write(doc, data);
        Docs.update(doc, { dirty: dirtyAfter() }, "dirty");
        StatusBar.msg(T("✔ Đã lưu “{name}”.", { name: doc.name }), "good");
        EditorExtras.use(() => LocalHistory.snap(doc, true, savedText));
        Tail.sync(doc);
        return;
      }
      if (!asNew && doc.remote?.kind === "onedrive") {
        StatusBar.msg(T("Đang lưu lên OneDrive…"));
        const remote = await CloudDrive.save(doc, data);
        Docs.update(doc, { remote, dirty: dirtyAfter() }, "dirty");
        StatusBar.msg(T("✔ Đã lưu “{name}” lên OneDrive.", { name: doc.name }), "good");
        EditorExtras.use(() => LocalHistory.snap(doc, true, savedText));
        return;
      }
      if (!asNew && doc.remote?.kind === "gdrive" && !confirm(T("File Google Drive chỉ đọc được qua API key (ghi ngược cần đăng nhập Google — chưa hỗ trợ). Lưu bản sao trên máy?"))) return;
      if (!asNew && doc.kind === "note") {
        await HotExit.flush();
        StatusBar.msg(NotesDb.ok ? T("✔ Ghi chú tự lưu trong trình duyệt. Muốn ra file thì dùng “Lưu thành…”.") : T("⚠ Trình duyệt chặn IndexedDB — dùng “Lưu thành…” để giữ nội dung."), NotesDb.ok ? "good" : "warn");
        EditorExtras.use(() => LocalHistory.snap(doc, true, savedText));
        return;
      }
      const r = await LocalFs.saveAs(suggestName(doc), data);
      if (!r) return;
      if (r.handle) RecentFiles.add(r.handle);
      // A note stays a note (the file is a copy); other tabs now point at the saved file.
      if (r.handle && doc.kind !== "note") { Docs.update(doc, { kind: "file", handle: r.handle, dirty: dirtyAfter(), link: null, remote: null }); if (r.name !== doc.name) Docs.rename(doc, r.name); await DiskSync.mark(doc); }
      StatusBar.msg(r.downloaded ? T("✔ Đã tải xuống “{name}”.", { name: r.name }) : T("✔ Đã lưu “{name}”.", { name: r.name }), "good");
      EditorExtras.use(() => LocalHistory.snap(doc, true, savedText));
    } catch (e) { StatusBar.msg(T("Không lưu được: {msg}", { msg: e.message }), "bad"); }
    finally { if (fmtError) FormatActions.saveFormatFailed(doc, fmtError); }
  }

  function run() {
    const doc = activeOrWarn();
    if (!doc) return;
    // Typed just now: settle the language first so an unpicked op follows it (re-detection otherwise waits for a typing pause).
    Docs.recheck(Docs.root(doc));
    OutputLink.run(doc, $("opSel").value);
  }

  function closeTab() { const doc = Views.activeDoc(); if (doc) Views.close(doc.id); }

  function setWrap(on) {
    CmSetup.settings.wrap = !!on;
    $("chkWrap").checked = !!on;
    Views.applySettings();
    HotExit.schedule();
    Settings.changed();
  }

  function setWords(on) {
    CmSetup.settings.words = !!on;
    Prefs.set("words", !!on);
    Views.applySettings();
    StatusBar.msg(on ? T("Gợi ý từ trong file khi gõ: bật.") : T("Gợi ý từ trong file khi gõ: tắt."));
  }

  function setLang(value) {
    const doc = activeOrWarn();
    if (!doc) return;
    Docs.update(Docs.root(doc), { lang: LangDetect.ids.includes(value) ? value : "" }, "lang");
  }

  // ⇥ / drag target on touch: the active tab of view gi goes to "the other" view (a second view is opened when there is only one).
  function moveTab(gi = Views.focused) {
    const doc = Views.activeDoc(gi);
    if (!doc) return;
    if (Views.count < 2) Views.setLayout("2c");
    const to = Views.other(gi);
    Views.move(doc.id, to);
    PhoneLayout.show(to + 1);
  }

  function cloneTab() {
    const doc = activeOrWarn();
    if (!doc) return;
    if (Views.count < 2) Views.setLayout("2c");
    const to = Views.other(Views.focused);
    CloneSync.cloneTo(doc, to);
    PhoneLayout.show(to + 1);
  }

  function setLayout(id) {
    Views.setLayout(id);
    $("layoutSel").value = Views.layout;
    HotExit.schedule();
  }

  function setSplit(pair) {
    if (Views.count < 2) setLayout("2c");
    Split.preset(pair);
    StatusBar.msg(T("Tỷ lệ view: {r}", { r: pair }));
  }

  // Editor font size (also what Ctrl+= / Ctrl+- / Ctrl+0 change instead of the browser zoom).
  function zoom(step) {
    const px = step ? Math.min(28, Math.max(9, (Prefs.get("font", 13) | 0) + step)) : 13;
    Prefs.set("font", px);
    $("work").style.setProperty("--ed-font", px + "px");
    Views.groups.forEach(g => g.view.requestMeasure());
    StatusBar.msg(T("Cỡ chữ editor: {px}px", { px }));
  }

  // The minimap bundle (~17 KB) loads the first time it is turned on; the choice is remembered in this browser.
  async function setMinimap(on) {
    $("chkMinimap").checked = !!on;
    if (on && !CM.minimap) {
      try { await VendorPaths.load("cmMinimap"); }
      catch (e) { $("chkMinimap").checked = false; StatusBar.msg(T("Không nạp được minimap ({file}).", { file: e.message }), "bad"); return; }
    }
    if (on) CmSetup.enableMinimap();
    CmSetup.settings.minimap = !!on;
    Prefs.set("minimap", !!on);
    Views.applySettings();
  }

  // Indent guides (~5 KB bundle) are on by default; loaded after the editor is ready so they never delay typing.
  async function setGuides(on) {
    if (on && !CM.indentMarkers) {
      try { await VendorPaths.load("cmIndentMarkers"); }
      catch (e) { StatusBar.msg(T("Không nạp được đường thụt lề ({file}).", { file: e.message }), "bad"); return; }
    }
    if (on) CmSetup.enableGuides();
    CmSetup.settings.guides = !!on;
    Prefs.set("guides", !!on);
    Views.applySettings();
  }

  function toggleZen() {
    const on = document.body.classList.toggle("zen");
    $("btnZenExit").hidden = !on;
    StatusBar.msg(on ? T("Chế độ Zen — Alt+Shift+Z hoặc nút ✕ để thoát.") : "");
  }

  function toggleExplorer() {
    if (matchMedia("(max-width: 640px)").matches) { PhoneLayout.show(0); return; }
    Prefs.set("explorer", !document.body.classList.toggle("no-explorer"));
  }

  async function clearData() {
    if (!confirm(T("Xoá mọi ghi chú, tab đã lưu và lịch sử cục bộ trong trình duyệt này? Không khôi phục được."))) return;
    HotExit.stop();
    try { await NotesDb.clear(); } catch (e) { StatusBar.msg(T("Không xoá được: {msg}", { msg: e.message }), "bad"); return; }
    Prefs.set("fiRecentDirs", []);
    location.replace(location.pathname);
  }

  return { newNote, openFiles, openFolder, openCloudFolder, save, suggestName, run, closeTab, setWrap, setWords, setLang, moveTab, cloneTab, setLayout, setSplit, zoom, setMinimap, setGuides, toggleZen, toggleExplorer, clearData };
})();
