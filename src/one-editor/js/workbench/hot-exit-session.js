// Hot exit (Notepad++ style): notes and every open tab go to IndexedDB shortly after each change and when the page is hidden; reopening restores tabs + layout.
const HotExit = (() => {
  let timer = 0, stopped = false, failed = false;
  const removed = new Set();
  const schedule = () => { if (stopped) return; clearTimeout(timer); timer = setTimeout(flush, 700); };

  const serialize = d => ({
    id: d.id, kind: d.kind, name: d.name, lang: d.lang, text: Docs.text(d), handle: d.handle || null, dirty: d.dirty, edited: d.edited,
    readOnly: d.readOnly, eol: d.eol, bom: d.bom, link: d.link, updated: d.updated,
  });

  async function flush() {
    clearTimeout(timer);
    if (stopped || !NotesDb.ok) return;
    const docs = Docs.list().filter(d => d.pending), gone = [...removed];
    docs.forEach(d => { d.pending = false; });
    removed.clear();
    try {
      await NotesDb.save(docs.map(serialize), gone, { v: 1, ...Views.snapshot(), wrap: CmSetup.settings.wrap });
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
    for (const r of docs) if (r && typeof r.id === "string" && typeof r.text === "string") Docs.create({ ...r, pending: false });
    const groups = session && Array.isArray(session.groups) ? session.groups.slice(0, 2) : [];
    if (session) CmSetup.settings.wrap = session.wrap === true;
    groups.forEach((g, gi) => (Array.isArray(g.tabs) ? g.tabs : []).forEach(id => { const d = Docs.get(id); if (d) Views.add(d, gi); }));
    // Tabs missing from the layout (another browser tab wrote it last, or a crash): unsaved work comes back in View 1, the rest is dropped.
    for (const d of Docs.list()) if (d.kind !== "note" && Views.where(d.id) < 0) {
      if (d.dirty || d.edited) Views.add(d, 0); else Docs.remove(d.id);
    }
    [0, 1].forEach(gi => {
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

  return { init, restore, flush, schedule, stop };
})();
