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
      if (!node) return;
      Explorer.setRoot(node);
      document.body.classList.remove("no-explorer");
      PhoneLayout.show(0);
      StatusBar.msg(T("Đã mở folder “{name}”.", { name: node.name }), "good");
    } catch (e) { StatusBar.msg(T("Không mở được folder: {msg}", { msg: e.message }), "bad"); }
  }

  const suggestName = doc => {
    const base = doc.name.replace(/\s*⇢\s*/g, "-").replace(/[\p{Cc}\\/:*?"<>|]+/gu, "_");
    return /\.[\w-]+$/.test(base) ? base : base + "." + LangDetect.extOf(Docs.effectiveLang(doc));
  };

  async function save(asNew = false) {
    const doc = activeOrWarn();
    if (!doc) return;
    if (doc.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không lưu."), "warn"); return; }
    const data = LocalFs.encode(Docs.text(doc), doc), before = doc.state;
    // Typing during the (possibly slow or permission-prompting) write keeps the tab dirty.
    const dirtyAfter = () => doc.state !== before;
    try {
      if (!asNew && doc.kind === "file" && doc.handle) {
        await LocalFs.writeHandle(doc.handle, data);
        Docs.update(doc, { dirty: dirtyAfter() }, "dirty");
        StatusBar.msg(T("✔ Đã lưu “{name}”.", { name: doc.name }), "good");
        return;
      }
      if (!asNew && doc.kind === "note") {
        await HotExit.flush();
        StatusBar.msg(NotesDb.ok ? T("✔ Ghi chú tự lưu trong trình duyệt. Muốn ra file thì dùng “Lưu thành…”.") : T("⚠ Trình duyệt chặn IndexedDB — dùng “Lưu thành…” để giữ nội dung."), NotesDb.ok ? "good" : "warn");
        return;
      }
      const r = await LocalFs.saveAs(suggestName(doc), data);
      if (!r) return;
      // A note stays a note (the file is a copy); other tabs now point at the saved file.
      if (r.handle && doc.kind !== "note") { Docs.update(doc, { kind: "file", handle: r.handle, dirty: dirtyAfter(), link: null }); if (r.name !== doc.name) Docs.rename(doc, r.name); }
      StatusBar.msg(r.downloaded ? T("✔ Đã tải xuống “{name}”.", { name: r.name }) : T("✔ Đã lưu “{name}”.", { name: r.name }), "good");
    } catch (e) { StatusBar.msg(T("Không lưu được: {msg}", { msg: e.message }), "bad"); }
  }

  function run() {
    const doc = activeOrWarn();
    if (doc) OutputLink.run(doc, $("opSel").value);
  }

  function closeTab() { const doc = Views.activeDoc(); if (doc) Views.close(doc.id); }

  function setWrap(on) {
    CmSetup.settings.wrap = !!on;
    $("chkWrap").checked = !!on;
    Views.applySettings();
    HotExit.schedule();
  }

  function setLang(value) {
    const doc = activeOrWarn();
    if (!doc) return;
    Docs.update(doc, { lang: LangDetect.ids.includes(value) ? value : "" }, "lang");
  }

  function toggleExplorer() {
    if (matchMedia("(max-width: 640px)").matches) { PhoneLayout.show(0); return; }
    Prefs.set("explorer", !document.body.classList.toggle("no-explorer"));
  }

  async function clearData() {
    if (!confirm(T("Xoá mọi ghi chú và tab đã lưu trong trình duyệt này? Không khôi phục được."))) return;
    HotExit.stop();
    try { await NotesDb.clear(); } catch (e) { StatusBar.msg(T("Không xoá được: {msg}", { msg: e.message }), "bad"); return; }
    location.replace(location.pathname);
  }

  // Shortcuts the browser lets a page take (Ctrl+N/T/W are reserved, hence Alt+N / Alt+W).
  const KEYS = {
    "Alt+n": () => newNote(), "Ctrl+o": openFiles, "Ctrl+s": () => save(false), "Ctrl+Shift+s": () => save(true),
    "Ctrl+Enter": run, "Ctrl+b": toggleExplorer, "Alt+z": () => setWrap(!CmSetup.settings.wrap), "Alt+w": closeTab,
  };
  function onKey(e) {
    const key = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.key;
    const fn = KEYS[(e.ctrlKey || e.metaKey ? "Ctrl+" : "") + (e.altKey ? "Alt+" : "") + (e.shiftKey ? "Shift+" : "") + key];
    if (fn) { e.preventDefault(); e.stopPropagation(); fn(); }
  }

  return { newNote, openFiles, openFolder, save, run, closeTab, setWrap, setLang, toggleExplorer, clearData, onKey };
})();
