// Local history: a snapshot of the tab on every successful Ctrl+S (or on demand) in IndexedDB — ≤ 50 per file, ≤ 100 MB in all, oldest first out; compare with any snapshot, restore it (Ctrl+Z works).
const LocalHistory = (() => {
  const PER_KEY = 50, TOTAL = 100 * 1024 * 1024, MAX_TEXT = 5 * 1024 * 1024, listeners = [];
  const changed = () => listeners.forEach(f => f());

  // FNV-1a: same sum + size as the newest snapshot of the file ⇒ unchanged, no new snapshot.
  function sum(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(36);
  }

  // records: [{ id, key, t, size, sum }] + a new snapshot rec → { skip, drop: ids to delete } (pure).
  function plan(records, rec, perKey = PER_KEY, total = TOTAL) {
    const same = records.filter(r => r.key === rec.key).sort((a, b) => b.t - a.t);
    if (same[0] && same[0].sum === rec.sum && same[0].size === rec.size) return { skip: true, drop: [] };
    const drop = new Set(same.slice(perKey - 1).map(r => r.id));
    let used = rec.size + records.reduce((s, r) => s + (drop.has(r.id) ? 0 : r.size), 0);
    for (const r of [...records].sort((a, b) => a.t - b.t)) {
      if (used <= total) break;
      if (!drop.has(r.id)) { drop.add(r.id); used -= r.size; }
    }
    return { skip: false, drop: [...drop] };
  }

  // Notes by id; files by their disk entry (same name + isSameEntry), so two "config.json" from two folders keep separate histories.
  async function keyOf(doc, records) {
    if (doc.histKey && doc.histKey.handle === doc.handle) return doc.histKey.key;
    let key = doc.kind === "note" ? "note:" + doc.id : "tab:" + doc.id;
    if (doc.kind === "file" && doc.handle) {
      key = "";
      const seen = new Set();
      for (const r of records) if (r.handle && r.name === doc.name && !seen.has(r.key)) {
        seen.add(r.key);
        try { if (await r.handle.isSameEntry(doc.handle)) { key = r.key; break; } } catch { /* stale handle: not this file */ }
      }
      key ||= "file:" + doc.name + ":" + Date.now().toString(36);
    }
    doc.histKey = { key, handle: doc.handle };
    return key;
  }

  // Password notes never get a plain-text snapshot.
  const usable = doc => !!doc && !doc.hex && !doc.big && !doc.hist && !doc.crypt && !doc.sealed && !PreviewPane.isPane(doc);

  // quiet: after Ctrl+S — only a failure is reported (the save itself already said ✔).
  async function snap(doc, quiet = true, text = null) {
    doc = doc && Docs.root(doc);
    if (!usable(doc) || !NotesDb.ok) { if (!quiet) StatusBar.msg(NotesDb.ok ? T("Tab này không có lịch sử cục bộ.") : T("⚠ Không lưu được — trình duyệt chặn IndexedDB"), "warn"); return false; }
    text ??= Docs.text(doc);
    if (text.length > MAX_TEXT) { if (!quiet) StatusBar.msg(T("Tab lớn hơn 5 MB — không chụp lịch sử cục bộ."), "warn"); return false; }
    try {
      const records = await NotesDb.histList(), key = await keyOf(doc, records);
      const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), key, name: doc.name, t: Date.now(), size: text.length, sum: sum(text), handle: doc.kind === "file" ? doc.handle : null };
      const p = plan(records, rec);
      if (p.skip) { if (!quiet) StatusBar.msg(T("Không đổi so với bản lịch sử gần nhất — không chụp thêm."), "warn"); return false; }
      await NotesDb.histWrite(rec, text, p.drop);
      changed();
      if (!quiet) StatusBar.msg(T("✔ Đã chụp bản lịch sử của “{name}”.", { name: doc.name }), "good");
      return true;
    } catch (e) {
      console.warn("One Editor local history:", e);
      StatusBar.msg(T("Không ghi được lịch sử cục bộ: {msg}", { msg: e.message }), "warn");
      return false;
    }
  }

  const when = t => new Date(t).toLocaleString(I18n.lang);
  const kb = n => I18n.num(Math.max(1, Math.round(n / 1024))) + " KB";
  const sourceOf = doc => doc && doc.hist ? Docs.get(doc.hist.src) : doc && Docs.root(doc);

  // Snapshots of one tab, newest first.
  async function list(src) {
    const records = await NotesDb.histList(), key = await keyOf(src, records);
    return records.filter(r => r.key === key).sort((a, b) => b.t - a.t);
  }

  async function pick() {
    const src = sourceOf(Views.activeDoc());
    if (!usable(src)) { StatusBar.msg(T("Tab này không có lịch sử cục bộ."), "warn"); return; }
    let mine;
    try { mine = await list(src); }
    catch (e) { StatusBar.msg(T("Không đọc được lịch sử cục bộ: {msg}", { msg: e.message }), "bad"); return; }
    if (!mine.length) { StatusBar.msg(T("“{name}” chưa có bản lịch sử — bản được chụp mỗi lần Ctrl+S, hoặc dùng lệnh “Lịch sử cục bộ: chụp bản ngay”.", { name: src.name }), "warn"); return; }
    QuickPick.pick(mine.map((r, i) => ({ label: "🕘 " + when(r.t) + " · " + kb(r.size), detail: DevNum.ago(r.t) + (i ? "" : " · " + T("mới nhất")), run: () => open(src, r) })),
      T("Chọn bản lịch sử để so sánh với “{name}”", { name: src.name }));
  }

  // The snapshot opens read-only in the other view and the two are compared side by side.
  async function open(src, r) {
    let text;
    try { text = await NotesDb.histText(r.id); } catch (e) { text = null; console.warn("One Editor local history:", e); }
    if (typeof text !== "string" || !Docs.get(src.id)) { StatusBar.msg(T("Không đọc được bản lịch sử này."), "bad"); return; }
    ReadOnlyCompare.open(src, src.name + " @ " + when(r.t), text, { hist: { src: src.id, t: r.t } });
    StatusBar.msg(T("So sánh “{name}” với bản lúc {time} — lệnh “Lịch sử cục bộ: khôi phục…” để ghi bản đó vào tab gốc (Ctrl+Z được).", { name: src.name, time: when(r.t) }), "good");
  }

  const viewing = () => { const d = Views.activeDoc(); return d && d.hist ? d : d && Docs.list().find(x => x.hist && x.hist.src === Docs.root(d).id) || null; };

  function apply(src, t, text) {
    if (src.readOnly || src.stale) { StatusBar.msg(T("Tab gốc đang chỉ đọc — đọc lại file (Ctrl+S) rồi khôi phục."), "warn"); return; }
    if (!confirm(T("Thay toàn bộ nội dung “{name}” bằng bản lúc {time}? Ctrl+Z để hoàn tác.", { name: src.name, time: when(t) }))) return;
    Views.replaceText(src, text);
    StatusBar.msg(T("✔ Đã khôi phục bản lúc {time} vào “{name}” — chưa ghi đĩa, Ctrl+S để lưu.", { name: src.name, time: when(t) }), "good");
  }

  function restore() {
    const snapDoc = viewing(), src = snapDoc && Docs.get(snapDoc.hist.src);
    if (!src) { StatusBar.msg(T("Tab gốc của bản lịch sử này đã đóng."), "warn"); return; }
    apply(src, snapDoc.hist.t, Docs.text(snapDoc));
  }

  // Timeline ↺: a stored snapshot straight into its tab.
  async function restoreFrom(src, r) {
    let text;
    try { text = await NotesDb.histText(r.id); } catch (e) { text = null; console.warn("One Editor local history:", e); }
    if (typeof text !== "string" || !Docs.get(src.id)) { StatusBar.msg(T("Không đọc được bản lịch sử này."), "bad"); return; }
    apply(src, r.t, text);
  }

  async function clear(src = sourceOf(Views.activeDoc())) {
    if (!usable(src)) { StatusBar.msg(T("Tab này không có lịch sử cục bộ."), "warn"); return; }
    try {
      const ids = (await list(src)).map(r => r.id);
      if (!ids.length) { StatusBar.msg(T("“{name}” chưa có bản lịch sử.", { name: src.name }), "warn"); return; }
      if (!confirm(T("Xoá {n} bản lịch sử của “{name}”?", { n: ids.length, name: src.name }))) return;
      await NotesDb.histWrite(null, "", ids);
      changed();
      StatusBar.msg(T("✔ Đã xoá {n} bản lịch sử.", { n: ids.length }), "good");
    } catch (e) { StatusBar.msg(T("Không xoá được lịch sử cục bộ: {msg}", { msg: e.message }), "bad"); }
  }

  return { plan, sum, snap, snapNow: () => snap(Views.activeDoc(), false), pick, restore, restoreFrom, clear, viewing, list, open, usable, sourceOf, when, kb, onChange: f => listeners.push(f) };
})();
