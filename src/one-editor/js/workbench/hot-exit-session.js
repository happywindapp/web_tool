// Hot exit (Notepad++ style): notes and every open tab go to IndexedDB shortly after each change and when the page is hidden; reopening restores tabs + layout.
const HotExit = (() => {
  let timer = 0, stopped = false, failed = false;
  const removed = new Set();
  const schedule = () => { if (stopped) return; clearTimeout(timer); timer = setTimeout(flush, 700); };

  // A clean file with a handle is re-read from disk on reopen, so only the handle is stored.
  const handleOnly = d => d.kind === "file" && !d.dirty && !!d.handle;
  // A large-file tab keeps only its handle + chunk; without a handle (dropped file) a note says to open the file again.
  const bigText = d => d.handle ? "" : T("Tab file lớn “{name}”: trình duyệt không giữ file kéo-thả qua F5 — mở lại file để xem tiếp.", { name: d.big.file.name });
  // A password note is written only encrypted; a result tab of one never keeps its text.
  const secret = d => !!(d && (d.crypt || d.sealed));
  const serialize = (d, sealed) => ({
    id: d.id, kind: d.kind, name: d.name, lang: d.lang, text: secret(d) || secret(d.link && Docs.get(d.link.src)) ? "" : d.big ? bigText(d) : handleOnly(d) ? "" : Docs.text(d), stale: d.big ? !!d.handle : handleOnly(d), sealed: sealed || d.sealed || undefined,
    bigStart: d.big && d.handle ? d.big.start : null, handle: d.handle || null, dirty: d.dirty, edited: d.edited,
    readOnly: d.readOnly, eol: d.eol, eolMixed: d.eolMixed, eolList: d.eolMixed ? (d.state ? MixedEol.codesOf(d.state) : d.eolList) : null, bom: d.bom, enc: d.enc, link: d.link, updated: d.updated, pinned: d.pinned, hex: d.hex,
  });

  async function flush() {
    clearTimeout(timer);
    if (stopped || !NotesDb.ok) return;
    // Clones are views of another tab: their text lives in the original.
    const docs = Docs.list().filter(d => d.pending && d.kind !== "clone" && !d.hist), gone = [...removed];
    docs.forEach(d => { d.pending = false; });
    removed.clear();
    try {
      const sealed = new Map();
      for (const d of docs) if (d.crypt) sealed.set(d, await Locks.sealDoc(d));
      await NotesDb.save(docs.map(d => serialize(d, sealed.get(d))), gone, { v: 1, ...Views.snapshot(), wrap: CmSetup.settings.wrap });
      failed = false;
      StatusBar.storage(true);
    } catch (e) {
      failed = true;
      docs.forEach(d => { d.pending = true; });
      gone.forEach(id => removed.add(id));
      console.warn("One Editor hot exit:", e);
      StatusBar.storage(false, e.message);
    }
  }

  async function restore() {
    const { docs, session } = await NotesDb.loadAll();
    for (const r of docs) if (r && typeof r.id === "string" && typeof r.text === "string" && r.kind !== "clone") {
      const d = Docs.create({ ...r, pending: false });
      const s = r.sealed;
      if (r.kind === "note" && s && typeof s.salt === "string" && typeof s.iv === "string" && typeof s.ct === "string") Object.assign(d, { sealed: { salt: s.salt, iv: s.iv, ct: s.ct, it: Number.isInteger(s.it) ? s.it : 310000 }, readOnly: true, text: T("🔒 Ghi chú đã khoá — Command Palette → “Ghi chú: mở khoá…” để nhập mật khẩu.") });
    }
    const groups = session && Array.isArray(session.groups) ? session.groups.slice(0, Layouts.MAX) : [];
    if (session) CmSetup.settings.wrap = session.wrap === true;
    Views.setLayout(session && Layouts.get(session.layout) ? session.layout : groups.length > 2 ? Layouts.forCount(groups.length) : "2c");
    groups.forEach((g, gi) => (Array.isArray(g.tabs) ? g.tabs : []).forEach(id => { const d = Docs.get(id); if (d) Views.add(d, gi); }));
    // Tabs missing from the layout (another browser tab wrote it last, or a crash): unsaved work comes back in View 1, the rest is dropped.
    for (const d of Docs.list()) if (d.kind !== "note" && Views.where(d.id) < 0) {
      if (d.dirty || d.edited) Views.add(d, 0); else Docs.remove(d.id);
    }
    Views.groups.slice(0, Views.count).forEach((g0, gi) => {
      const tabs = Views.tabsOf(gi), id = tabs.includes(groups[gi]?.active) ? groups[gi].active : tabs[0];
      if (id) Views.activate(gi, id, false);
    });
    if (session) Views.focus(session.focused);
  }

  function init() {
    Docs.on((type, doc) => { if (type === "remove") removed.add(doc.id); schedule(); });
    Views.onChange(schedule);
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    addEventListener("pagehide", flush);
    // Without IndexedDB nothing survives a reload: warn while there is unsaved work.
    addEventListener("beforeunload", e => {
      if (!stopped && (!NotesDb.ok || failed) && Docs.list().some(d => d.dirty || d.kind === "note" || d.edited)) e.preventDefault();
    });
  }

  // Before wiping storage: no more writes from this page.
  const stop = () => { stopped = true; clearTimeout(timer); };

  return { init, restore, flush, schedule, stop, secret };
})();
