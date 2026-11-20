// Named sessions: save / open / delete the open tabs + layout under a name (SavedSessions UI), kept in IndexedDB meta "sessions" so big sessions fit; clean file tabs keep only their handle.
const Sessions = (() => {
  let cache = [], ui = null;
  const store = { get: (k, d) => cache || d, set: (k, v) => { cache = v; NotesDb.putMeta("sessions", v).catch(e => StatusBar.msg(T("Không lưu được phiên: {msg}", { msg: e.message }), "bad")); return NotesDb.ok; } };

  // Tabs per view; a clean file with a handle is re-read on open, notes are linked by id, everything else carries its text.
  function snapshot() {
    const rec = d => {
      const base = { kind: d.kind, name: d.name, lang: d.lang, id: d.id };
      if (d.kind === "file" && d.handle && !d.dirty && !d.big && !d.hex) return { ...base, handle: d.handle };
      if (d.crypt || d.sealed) return { ...base, kind: "note" };
      if (HotExit.secret(d.link && Docs.get(d.link.src))) return null;
      return { ...base, text: Docs.text(d) };
    };
    const groups = Views.groups.slice(0, Views.count).map(g => ({ tabs: g.tabs.map(Docs.get).filter(d => d && d.kind !== "clone" && !PreviewPane.isPane(d)).map(rec).filter(Boolean), active: g.active }));
    return { v: 1, layout: Views.layout, focused: Views.focused, groups };
  }

  // Untrusted shape: known fields only; nothing already open is replaced.
  function open(p) {
    if (!p || !Array.isArray(p.groups)) return;
    if (Layouts.get(p.layout) && Layouts.get(p.layout).n > Views.count) Actions.setLayout(p.layout);
    let first = null;
    p.groups.slice(0, Views.count).forEach((g, gi) => (Array.isArray(g.tabs) ? g.tabs : []).forEach(r => {
      if (!r || typeof r.name !== "string") return;
      let d = typeof r.id === "string" && Docs.get(r.id);
      if (!d && r.kind === "file" && r.handle) d = Docs.create({ kind: "file", name: r.name, lang: r.lang, handle: r.handle, stale: true, text: "" });
      else if (!d && typeof r.text === "string") d = Docs.create({ kind: r.kind === "note" ? "note" : "temp", name: r.name, lang: r.lang, text: r.text });
      if (!d) return;
      Views.add(d, gi);
      if (r.id === g.active || !first) first = first || d;
      if (r.id === g.active) Views.activate(Views.where(d.id), d.id, false);
    }));
    Views.groups.slice(0, Views.count).forEach(g => { if (g.tabs.length && !g.tabs.includes(g.active)) Views.activate(g.i, g.tabs[0], false); });
    Views.renderAll();
    if (first) Views.focus(Views.where(first.id));
    HotExit.schedule();
  }

  async function init() {
    try { const v = await NotesDb.getMeta("sessions"); cache = Array.isArray(v) ? v : []; } catch { cache = []; }
    ui = SavedSessions({ select: $("ssSel"), saveBtn: $("ssSave"), delBtn: $("ssDel"), store, key: "sessions", snapshot, open,
      suggestName: () => T("Phiên {date}", { date: new Date().toLocaleString(I18n.lang) }), isEmpty: p => !p.groups.some(g => g.tabs.length), note: (m, cls) => StatusBar.msg(m, cls) });
    I18n.onChange(() => ui.fill());
  }

  const save = () => $("ssSave").click();
  function pick() {
    if (!cache.length) { StatusBar.msg(T("Chưa có phiên nào — “Phiên: lưu…” hoặc 💾 trong Explorer."), "warn"); return; }
    QuickPick.pick(cache.map(a => ({ label: "🗂 " + a.name, detail: new Date(a.t).toLocaleString(I18n.lang), run: () => { $("ssSel").value = a.id; $("ssSel").onchange(); } })), T("Chọn phiên để mở (tab của phiên được thêm, tab đang mở giữ nguyên)"));
  }

  return { init, save, pick, snapshot, open };
})();
