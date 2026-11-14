// ★ watchlist management: named saves (💾 / 📂 / 🗑, shared SavedSessions), ⬇ export JSON (with holdings + alerts), ⬆ import JSON / TXT / CSV.
const WatchIO = (() => {
  const say = (m, cls) => Controls.say(cls === "muted" ? "muted" : cls || "good", m);

  function exportFile() {
    const watch = Watch.all();
    if (!watch.length) { Controls.say("warn", "Danh mục trống."); return; }
    Dom.download(WatchFile.build({ watch, holdings: Holdings.entries(), alerts: Alerts.all() }), `${T("danh-muc-crypto")}-${new Date().toISOString().slice(0, 10)}.json`, "application/json;charset=utf-8");
  }

  // Imported holdings / alerts are untrusted: Holdings.merge and Alerts.merge re-validate every field.
  function importText(name, text) {
    if (text == null) { Controls.say("bad", "Không đọc được file."); return; }
    let r;
    try { r = WatchFile.parse(text); } catch { Controls.say("bad", "File không có mã coin nào."); return; }
    if (!r.symbols.length) { Controls.say("bad", "File không có mã coin nào."); return; }
    const hold = Object.fromEntries(Object.entries(r.holdings).filter(([s]) => r.symbols.includes(s)));
    Holdings.merge(hold);
    const before = Alerts.all().length;
    Alerts.merge(r.alerts.filter(a => r.symbols.includes(a.sym)));
    Watch.replace(r.symbols);
    Board.setBad(r.bad);
    Board.setTab("watch");
    Controls.say("good", "✔ Đã nhập {n} coin từ {f} ({x} vị thế, {a} cảnh báo).", { n: r.symbols.length, f: name, x: Object.keys(hold).length, a: Alerts.all().length - before });
  }

  function init() {
    const saved = SavedSessions({ select: $("savedLists"), saveBtn: $("saveList"), delBtn: $("delList"), store: Prefs, key: "lists",
      snapshot: () => ({ watch: Watch.all() }), isEmpty: p => !p.watch.length, note: say,
      suggestName: () => T("Danh mục {d}", { d: new Date().toLocaleDateString(I18n.lang) }),
      open: p => { Watch.replace(CoinParse.clean(p.watch)); Board.setTab("watch"); } });
    I18n.onChange(() => saved.fill());
    $("exportList").onclick = exportFile;
    $("importList").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) Dom.readFile(f, importText); };
  }

  return { init, importText };
})();
