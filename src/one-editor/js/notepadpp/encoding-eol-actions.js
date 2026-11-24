// Status-bar encoding / EOL actions: reopen with another encoding (from the original bytes), save with an encoding, convert EOL, toggle BOM, show hidden characters.
const EncodingActions = (() => {
  const PICK = "Bảng mã & EOL";
  const active = () => { const d = Views.activeDoc(); return d && Docs.root(d); };
  const pick = () => QuickPick.open(">" + T(PICK));

  // After opening: a guessed or read-only encoding is said once, clickable to choose another.
  function announce(doc, r) {
    if (r.guessed) StatusBar.msg(T("“{name}” không phải UTF-8 — đang mở bằng {enc} (đoán). Bấm để mở lại với bảng mã khác.", { name: doc.name, enc: Encoding.label(r.enc) }), "warn", pick, T(PICK));
    else if (r.readOnly) StatusBar.msg(T("“{name}” mở chỉ đọc: bảng mã {enc} không ghi lại được.", { name: doc.name, enc: r.enc }), "warn");
  }

  async function reopen(enc) {
    const doc = active();
    if (!doc || doc.kind !== "file" || doc.hex || !(doc.file || doc.handle)) { StatusBar.msg(T("Chỉ mở lại được tab file đọc từ đĩa."), "warn"); return; }
    if (doc.dirty && !confirm(T("“{name}” chưa lưu. Mở lại sẽ bỏ thay đổi — tiếp tục?", { name: doc.name }))) return;
    try {
      const file = doc.file || await doc.handle.getFile(), r = await LocalFs.readText(file, enc);
      Object.assign(doc, { text: r.text, state: null, marks: Bookmarks.linesOf(doc), eol: r.eol, eolMixed: r.eolMixed, eolList: r.eolList, bom: r.bom, enc: r.enc, readOnly: r.readOnly, dirty: false, langApplied: null });
      const gi = Views.where(doc.id);
      if (gi >= 0) { Views.groups[gi].active = null; Views.activate(gi, doc.id, false); }
      Docs.update(doc, {}, "dirty");
      StatusBar.msg(T("Đã mở lại “{name}” với {enc}.", { name: doc.name, enc: Encoding.label(enc) }) + (r.readOnly ? " " + T("(chỉ đọc)") : ""), "good");
    } catch (e) { StatusBar.msg(T("Không mở lại được: {msg}", { msg: e.message }), "bad"); }
  }

  // Changes what the next save writes; nothing is written until Save (a file with a handle is saved right away).
  function change(patch, what) {
    const doc = active();
    if (!doc) return;
    if (doc.readOnly || doc.hex) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return; }
    Docs.update(doc, { ...patch, dirty: doc.kind === "file" ? true : doc.dirty }, "dirty");
    StatusBar.msg(T("{what} — lưu (Ctrl+S) để ghi ra file.", { what }), "good");
  }

  // Notepad++ "Convert to": same text, written with enc (+ BOM) by the next save; false when the text does not fit enc.
  function convert(enc, bom) {
    const doc = active();
    if (!doc) return false;
    if (doc.readOnly || doc.hex) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return false; }
    const before = doc.enc;
    doc.enc = enc;
    try { LocalFs.encode(Docs.text(doc), doc); }
    catch (e) { doc.enc = before; StatusBar.msg(e.message, "bad", e.line ? () => Views.revealLine(doc, e.line) : null); return false; }
    change({ enc, bom }, T("Bảng mã khi lưu: {enc}", { enc: Encoding.label(enc) + (bom ? " BOM" : "") }));
    return true;
  }

  function saveWith(enc) {
    const doc = active();
    if (doc && convert(enc, enc.startsWith("utf-16") ? true : doc.bom && enc === "utf-8")) Actions.save(!(doc.kind === "file" && doc.handle));
  }

  const setEol = eol => change({ eol, eolMixed: false, eolList: null }, T("Xuống dòng: {eol}", { eol: Encoding.EOL_NAME[eol] }));
  const toggleBom = () => { const d = active(); if (d) change({ bom: !d.bom }, T(d.bom ? "Bỏ BOM" : "Thêm BOM")); };

  function toggleHidden() {
    CmSetup.settings.hidden = !CmSetup.settings.hidden;
    Prefs.set("hidden", CmSetup.settings.hidden);
    $("btnHidden").setAttribute("aria-pressed", CmSetup.settings.hidden);
    Views.applySettings();
  }

  return { announce, reopen, convert, saveWith, setEol, toggleBom, toggleHidden, pick, PICK };
})();
