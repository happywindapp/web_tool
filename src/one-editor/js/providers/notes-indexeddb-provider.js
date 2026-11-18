// IndexedDB (ADR #20): "docs" holds notes + every open tab (hot exit), "meta" holds the layout. Blocked or failing storage ⇒ ok=false and the tool runs without saving.
const NotesDb = (() => {
  const NAME = "web_tool.one-editor", VERSION = 1;
  let db = null, ok = false, error = "";

  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = t => new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("abort")); });
  const fail = e => { ok = false; error = e?.message || String(e); console.warn("One Editor storage:", e); };

  async function open() {
    try {
      const r = indexedDB.open(NAME, VERSION);
      r.onupgradeneeded = () => { r.result.createObjectStore("docs", { keyPath: "id" }); r.result.createObjectStore("meta"); };
      db = await req(r);
      db.onversionchange = () => db.close();
      ok = true;
    } catch (e) { fail(e); }
    return ok;
  }

  async function loadAll() {
    if (!ok) return { docs: [], session: null };
    try {
      const t = db.transaction(["docs", "meta"], "readonly");
      const [docs, session] = await Promise.all([req(t.objectStore("docs").getAll()), req(t.objectStore("meta").get("session"))]);
      return { docs, session: session || null };
    } catch (e) { fail(e); return { docs: [], session: null }; }
  }

  // One transaction: put changed docs, delete closed ones, replace the layout.
  async function save(records, removedIds, session) {
    if (!ok) return false;
    const t = db.transaction(["docs", "meta"], "readwrite"), docs = t.objectStore("docs");
    for (const r of records) docs.put(r);
    for (const id of removedIds) docs.delete(id);
    if (session) t.objectStore("meta").put(session, "session");
    await done(t);
    return true;
  }

  async function clear() {
    if (!ok) return;
    const t = db.transaction(["docs", "meta"], "readwrite");
    t.objectStore("docs").clear(); t.objectStore("meta").clear();
    await done(t);
  }

  return { open, loadAll, save, clear, get ok() { return ok; }, get error() { return error; } };
})();
