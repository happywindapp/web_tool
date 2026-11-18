// Documents behind the tabs. kind: note (kept in IndexedDB until deleted) | file (local disk) | temp (demo / shared link, kept while open) | output (OutputLink result).
const Docs = (() => {
  const all = new Map(), listeners = [];
  const KINDS = ["note", "file", "temp", "output"];
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const emit = (type, doc) => listeners.forEach(f => f(type, doc));

  function create(init) {
    const text = typeof init.text === "string" ? init.text : "";
    const doc = {
      id: typeof init.id === "string" ? init.id : newId(), kind: KINDS.includes(init.kind) ? init.kind : "temp",
      name: typeof init.name === "string" && init.name ? init.name : T("Chưa đặt tên"), lang: LangDetect.ids.includes(init.lang) ? init.lang : "",
      text, state: null, handle: init.handle || null, dirty: !!init.dirty, edited: !!init.edited, readOnly: !!init.readOnly,
      eol: init.eol === "\r\n" ? "\r\n" : "\n", bom: !!init.bom, link: init.link && typeof init.link.src === "string" ? { src: init.link.src, op: init.link.op } : null,
      updated: +init.updated || Date.now(), pending: init.pending ?? true, scrollTop: 0, langApplied: null,
      detected: LangDetect.detect(init.name, text),
    };
    all.set(doc.id, doc);
    emit("create", doc);
    return doc;
  }

  const get = id => all.get(id);
  const list = () => [...all.values()];
  const notes = () => list().filter(d => d.kind === "note");
  const text = doc => doc.state ? doc.state.doc.toString() : doc.text;
  const effectiveLang = doc => doc.lang || doc.detected.id;

  // The live text moves into an EditorState while the tab is open; the plain copy is dropped to halve memory.
  function ensureState(doc) {
    if (doc.state) return doc.state;
    doc.state = CmSetup.makeState(doc.text, doc.readOnly);
    doc.text = "";
    doc.langApplied = null;
    return doc.state;
  }
  function release(doc) {
    if (!doc.state) return;
    doc.text = doc.state.doc.toString();
    doc.state = null;
  }

  // Content-detected languages are re-checked after typing pauses (a new note becomes JSON once JSON is pasted).
  const redetect = Dom.debounce(doc => {
    if (!all.has(doc.id)) return;
    const d = LangDetect.detect(doc.name, text(doc).slice(0, 20000));
    if (d.id !== doc.detected.id) { doc.detected = d; emit("lang", doc); }
  }, 800);

  function edited(doc) {
    doc.updated = Date.now();
    doc.pending = true;
    if (doc.kind === "temp") doc.edited = true;
    const flip = doc.kind === "file" && !doc.dirty;
    if (flip) doc.dirty = true;
    emit(flip ? "dirty" : "edit", doc);
    if (!doc.lang && doc.detected.by !== "ext") redetect(doc);
  }

  function rename(doc, name) {
    doc.name = name;
    doc.detected = LangDetect.detect(name, text(doc).slice(0, 20000));
    doc.pending = true;
    emit("rename", doc);
  }

  function update(doc, fields, type = "meta") {
    Object.assign(doc, fields, { pending: true });
    emit(type, doc);
  }

  // Closing a tab: notes stay, an edited temp tab is kept as a note, everything else is dropped.
  function closed(doc) {
    if (doc.kind === "temp" && doc.edited) { doc.kind = "note"; emit("kept", doc); }
    if (doc.kind === "note") { release(doc); doc.pending = true; emit("meta", doc); }
    else remove(doc.id);
  }

  function remove(id) {
    const doc = all.get(id);
    if (!doc) return;
    all.delete(id);
    emit("remove", doc);
  }

  return { create, get, list, notes, text, effectiveLang, ensureState, release, edited, rename, update, closed, remove, on: f => listeners.push(f) };
})();
