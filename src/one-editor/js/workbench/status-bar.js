// Status bar: cursor, selections, counts, language, EOL/encoding, tab source, storage state; msg() shows the last action and can jump to a line when clicked.
const StatusBar = (() => {
  let raf = 0, storageNote = "";
  const SHORT = { note: "Ghi chú", file: "File", temp: "Tab tạm", output: "Kết quả liên kết", folder: "Folder", trash: "Thùng rác", results: "Kết quả", settings: "Cài đặt" };
  const set = (id, text) => { $(id).textContent = text; };
  const words = s => (s.match(/[\p{L}\p{N}_]+/gu) || []).length;

  function draw() {
    raf = 0;
    const doc = Views.activeDoc(), st = doc && Views.activeView().state;
    set("stKeys", "⌨ " + KeyProfiles.label());
    if (!doc) { ["stPos", "stCount", "stLang", "stEol", "stIndent", "stLint", "stSrc"].forEach(id => set(id, "")); return; }
    const main = st.selection.main, line = st.doc.lineAt(main.head), n = st.selection.ranges.length;
    // Code point under the cursor.
    const cp = main.empty && main.head < line.to ? st.sliceDoc(main.head, main.head + 2).codePointAt(0) : -1;
    set("stPos", T("Dòng {l}, Cột {c}", { l: I18n.num(line.number), c: I18n.num(main.head - line.from + 1) }) + (cp >= 0 ? " · U+" + cp.toString(16).toUpperCase().padStart(4, "0") : "")
      + (n > 1 ? " · " + T("{n} vùng chọn", { n }) : main.empty ? "" : " · " + T("chọn {n}", { n: I18n.num(main.to - main.from) })));
    const len = st.doc.length;
    set("stCount", T("{l} dòng · {c} ký tự", { l: I18n.num(st.doc.lines), c: I18n.num(len) }) + (len <= 200000 ? " · " + T("{w} từ", { w: I18n.num(words(st.doc.toString())) }) : ""));
    set("stLang", Docs.effectiveLang(doc) + (doc.lang ? "" : " · " + T("tự nhận")) + (doc.readOnly ? " · " + T("chỉ đọc") : ""));
    set("stEol", doc.hex ? "HEX" : Encoding.EOL_NAME[doc.eol || "\n"] + (doc.eolMixed ? " " + T("(hỗn hợp)") : "") + " · " + Encoding.label(doc.enc || "utf-8") + (doc.bom ? " BOM" : ""));
    const unit = st.facet(CM.language.indentUnit);
    set("stIndent", unit === "\t" ? T("Thụt lề: Tab") : T("Thụt lề: {n} dấu cách", { n: unit.length }));
    const nl = CM.lint.diagnosticCount(st);
    set("stLint", nl ? "⚠ " + I18n.num(nl) : "");
    set("stSrc", TabStrip.ICON[doc.kind] + " " + T(SHORT[doc.kind]) + (doc.kind === "output" && doc.edited ? " ✎" : "") + (doc.stale ? " · " + T("chưa đọc lại") : "") + (Docs.root(doc).diskChanged ? " · ⚠ " + T("đổi trên đĩa") : "") + (Tail.on(Docs.root(doc).id) ? " · 🔁 " + T("theo dõi") : ""));
    $("stSrc").title = T(TabStrip.sourceOf(doc));
  }

  const refresh = () => { if (!raf) raf = requestAnimationFrame(draw); };

  function msg(text, cls = "", onClick = null, tip = "") {
    const s = $("status");
    s.textContent = text;
    s.className = cls + (onClick ? " jump" : "");
    s.onclick = onClick;
    s.title = onClick ? tip || T("Bấm để tới dòng lỗi") : "";
  }

  function storage(ok, detail = "") {
    storageNote = detail;
    const s = $("stStore");
    s.textContent = ok ? T("💾 Lưu trong trình duyệt (IndexedDB)") : NotesDb.ok ? T("⚠ Lưu vào trình duyệt lỗi: {msg}", { msg: detail }) : T("⚠ Không lưu được — trình duyệt chặn IndexedDB");
    s.className = ok ? "" : "bad";
    s.title = ok ? T("Ghi chú và tab đang mở được lưu tự động trên máy này, không gửi đi đâu.") : storageNote;
  }

  return { refresh, msg, storage, redraw: () => { draw(); storage(NotesDb.ok, storageNote); } };
})();
