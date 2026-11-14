// ★ watchlist management: named saves (💾 / 📂 / 🗑, shared SavedSessions), ⬇ export JSON, ⬆ import JSON / TXT / CSV.
const WatchIO = (() => {
  const say = (msg, cls) => Controls.say(cls === "muted" ? "muted" : cls || "good", msg);

  function exportFile() {
    const watch = Watch.all();
    if (!watch.length) { Controls.say("warn", "Danh mục trống."); return; }
    const json = WatchFile.build({ watch, notes: Notes.entries(), alerts: Alerts.all() });
    Dom.download(json, `${T("danh-muc")}-${QuoteModel.vnDate()}.json`, "application/json;charset=utf-8");
  }

  // Imported notes / alerts are untrusted: Notes.set and Alerts.add re-validate every field.
  function importText(name, text) {
    if (text == null) { Controls.say("bad", "Không đọc được file."); return; }
    let r;
    try { r = WatchFile.parse(text); } catch { Controls.say("bad", "File không có mã chứng khoán nào."); return; }
    // Free text can contain ordinary words that look like tickers → keep only listed tickers once the directory is loaded.
    if (Universe.ready()) { r.bad = r.bad.concat(r.symbols.filter(x => !Universe.has(x))); r.symbols = r.symbols.filter(x => Universe.has(x)); }
    if (!r.symbols.length) { Controls.say("bad", "File không có mã chứng khoán nào."); return; }
    let notes = 0, alerts = 0;
    for (const [sym, n] of Object.entries(r.notes)) if (r.symbols.includes(sym) && n && typeof n === "object") { Notes.set(sym, String(n.text || ""), +n.target); notes++; }
    const have = new Set(Alerts.all().map(a => `${a.sym}|${a.type}|${a.value}`));
    for (const a of r.alerts) if (!have.has(`${a.sym}|${a.type}|${+a.value}`) && Alerts.add(a.sym, a.type, a.value)) alerts++;
    Watch.replace(r.symbols);
    Board.setBad(r.bad);
    Board.setTab("watch");
    Controls.say("good", "✔ Đã nhập {n} mã từ {f} ({x} ghi chú, {a} cảnh báo).", { n: r.symbols.length, f: name, x: notes, a: alerts });
  }

  function init() {
    const saved = SavedSessions({ select: $("savedLists"), saveBtn: $("saveList"), delBtn: $("delList"), store: Prefs, key: "lists",
      snapshot: () => ({ watch: Watch.all() }), isEmpty: p => !p.watch.length, note: say,
      suggestName: () => T("Danh mục {d}", { d: new Date().toLocaleDateString(I18n.lang) }),
      open: p => { Watch.replace(WatchParse.clean(p.watch)); Board.setTab("watch"); } });
    I18n.onChange(() => saved.fill());
    $("exportList").onclick = exportFile;
    $("importList").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) Dom.readFile(f, importText); };
  }

  return { init, importText };
})();
