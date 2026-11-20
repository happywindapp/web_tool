// IndexedDB (ADR #20): "docs" holds notes + every open tab (hot exit), "meta" holds the layout, "history" + "historyText" the local history. Blocked or failing storage ⇒ ok=false and the tool runs without saving.
const NotesDb = (() => {
  const NAME = "web_tool.one-editor", VERSION = 2, STORES = ["docs", "meta", "history", "historyText"];
  let db = null, ok = false, error = "";

  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = t => new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("abort")); });
  const fail = e => { ok = false; error = e?.message || String(e); console.warn("One Editor storage:", e); };

  async function open() {
    try {
      const r = indexedDB.open(NAME, VERSION);
      r.onupgradeneeded = () => {
        const d = r.result, has = n => d.objectStoreNames.contains(n);
        if (!has("docs")) d.createObjectStore("docs", { keyPath: "id" });
        if (!has("meta")) d.createObjectStore("meta");
        if (!has("history")) d.createObjectStore("history", { keyPath: "id" });
        if (!has("historyText")) d.createObjectStore("historyText");
      };
      db = await req(r);
      db.onversionchange = () => { db.close(); fail(new Error(T("Một tab mới hơn của One Editor đã nâng cấp dữ liệu — tải lại trang này (F5) để lưu tiếp."))); StatusBar.msg(error, "warn"); };
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

  async function getMeta(key) {
    if (!ok) return undefined;
    try { return await req(db.transaction("meta", "readonly").objectStore("meta").get(key)); } catch (e) { fail(e); return undefined; }
  }

  async function putMeta(key, value) {
    if (!ok) return false;
    const t = db.transaction("meta", "readwrite");
    t.objectStore("meta").put(value, key);
    await done(t);
    return true;
  }

  async function clear() {
    if (!ok) return;
    const t = db.transaction(STORES, "readwrite");
    STORES.forEach(n => t.objectStore(n).clear());
    await done(t);
  }

  // Local history: "history" keeps { id, key, name, t, size, sum, handle? } (cheap to list), "historyText" the text under the same id.
  const histList = async () => ok ? req(db.transaction("history", "readonly").objectStore("history").getAll()) : [];
  const histText = async id => ok ? req(db.transaction("historyText", "readonly").objectStore("historyText").get(id)) : undefined;
  async function histWrite(rec, text, dropIds) {
    if (!ok) return false;
    const t = db.transaction(["history", "historyText"], "readwrite"), h = t.objectStore("history"), x = t.objectStore("historyText");
    for (const id of dropIds) { h.delete(id); x.delete(id); }
    if (rec) { h.put(rec); x.put(text, rec.id); }
    await done(t);
    return true;
  }

  return { open, loadAll, save, getMeta, putMeta, clear, histList, histText, histWrite, get ok() { return ok; }, get error() { return error; } };
})();
