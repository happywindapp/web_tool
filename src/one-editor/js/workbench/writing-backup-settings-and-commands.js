// Phase 14a in ⚙ Settings + Palette: sticky scroll, spellcheck defaults, typewriter, smart paste; profile backup (export / import live in the extras bundle) + the 14-day reminder.
const Backup = (() => {
  const DAY = 86400000, EVERY = 14, DONE = "web_tool.one-editor:profileImported";
  const exportNow = () => PowerTools.use(() => ProfileBackup.exportDialog());
  const importNow = () => PowerTools.use(() => ProfileBackup.pickAndImport());
  // After an import reload: say what came in; else the 14-day reminder when it is on.
  function remind() {
    let done = null;
    try { done = JSON.parse(sessionStorage.getItem(DONE) || "null"); sessionStorage.removeItem(DONE); } catch { /* blocked storage: no message */ }
    if (done) { StatusBar.msg(T("⬆ Đã nhập profile: {n} ghi chú, {s} cài đặt.", { n: I18n.num(+done.notes || 0), s: I18n.num(+done.prefs || 0) }), "good"); return; }
    if (Prefs.get("backupRemind", false) !== true) return;
    const last = +Prefs.get("backupLast", 0) || 0, days = Math.floor((Date.now() - last) / DAY);
    if (last && days < EVERY) return;
    StatusBar.msg(last ? T("Đã {d} ngày chưa sao lưu profile One Editor — bấm để xuất.", { d: days }) : T("Chưa sao lưu profile One Editor lần nào — bấm để xuất."), "warn", exportNow, T("Xuất profile…"));
  }
  return { exportNow, importNow, remind };
})();

(() => {
  const S = Settings.add, pref = (k, def) => () => Prefs.get(k, def) === !def ? !def : def;
  S({ id: "sticky", group: "editor", label: "Sticky scroll", hint: "Dòng mở hàm / class / tiêu đề đang bao màn hình dính ở đầu editor (≤ 5 dòng, bấm để tới) — tắt khi màn hình ≤ 640 px hoặc file > 1 MB",
    get: pref("sticky", true), set: v => Writing.setSticky(v), def: true });
  S({ id: "typewriter", group: "editor", label: "Typewriter scrolling", hint: "Dòng đang gõ luôn ở giữa màn hình", get: pref("typewriter", false), set: v => Writing.setTypewriter(v), def: false });
  for (const [id, label, hint] of [["spellText", "Kiểm chính tả English: Markdown / Text", "Mặc định cho tab Markdown và văn bản thường — bộ kiểm của trình duyệt"],
    ["spellNote", "Kiểm chính tả English: ghi chú", "Ghi chú thường viết tiếng Việt nên mặc định tắt"],
    ["spellCode", "Kiểm chính tả English: code", "Mỗi tab vẫn bật / tắt riêng được (chuột phải hoặc Palette)"]])
    S({ id, group: "editor", label, hint, get: () => Writing.typeDefault(id), set: v => { Prefs.set(id, !!v); Views.applySettings(); }, def: Writing.DEF[id] });
  S({ id: "smartPaste", group: "editor", label: "Dán thông minh", hint: "Dán JWT, cURL, cron, URL dài, Base64, PEM, FIX, epoch, JSON / XML 1 dòng vào tab trống ⇒ gợi ý phép ▶ phù hợp (không tự chạy)",
    get: pref("smartPaste", true), set: v => Prefs.set("smartPaste", !!v), def: true });
  S({ id: "profile", group: "data", type: "info", label: "Sao lưu / khôi phục profile", hint: "Cài đặt, phím tắt, group, ghim, nhãn màu, snippet / macro / bộ thay / recipe, ghi chú — 1 file .json.gz, có thể đặt mật khẩu",
    get: () => { const t = +Prefs.get("backupLast", 0); return t ? T("Lần xuất gần nhất: {date}", { date: new Date(t).toLocaleDateString(I18n.lang === "vi" ? "vi-VN" : "en-GB") }) : T("Chưa xuất lần nào"); },
    actions: () => [[T("⬇ Xuất profile…"), Backup.exportNow], [T("⬆ Nhập profile…"), Backup.importNow]] });
  S({ id: "backupRemind", group: "data", label: "Nhắc sao lưu mỗi 14 ngày", hint: "Lời nhắc ở thanh trạng thái khi mở One Editor", get: pref("backupRemind", false), set: v => Prefs.set("backupRemind", !!v), def: false });
})();

function registerWritingBackupCommands() {
  const C = Commands.add, hasDoc = () => !!Views.activeDoc();
  C("spellToggle", "Kiểm chính tả English: bật / tắt cho tab này", null, () => Writing.toggleSpell(), hasDoc);
  C("stickyToggle", "Sticky scroll: bật / tắt", null, () => Writing.setSticky(!Sticky.on()));
  C("typewriterToggle", "Typewriter scrolling: bật / tắt (dòng đang gõ ở giữa)", null, () => Writing.setTypewriter(!Writing.typewriter()));
  C("profileExport", "Sao lưu: xuất profile (cài đặt, thư viện, ghi chú…)…", null, Backup.exportNow);
  C("profileImport", "Sao lưu: nhập profile…", null, Backup.importNow);
}
