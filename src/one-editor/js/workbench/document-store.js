// Documents behind the tabs. kind: note (kept in IndexedDB until deleted) | file (local disk) | temp (demo / shared link, kept while open) | output (OutputLink result) | clone (second view of another tab, never stored).
const Docs = (() => {
  const all = new Map(), listeners = [];
  const KINDS = ["note", "file", "temp", "output", "clone"];
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const emit = (type, doc) => listeners.forEach(f => f(type, doc));

  function create(init) {
    const text = typeof init.text === "string" ? init.text : "";
    const doc = {
      id: typeof init.id === "string" ? init.id : newId(), kind: KINDS.includes(init.kind) ? init.kind : "temp",
      name: typeof init.name === "string" && init.name ? init.name : T("Chưa đặt tên"), lang: LangDetect.ids.includes(init.lang) ? init.lang : "",
      text, state: null, handle: init.handle || null, dirty: !!init.dirty, edited: !!init.edited, readOnly: !!init.readOnly, stale: !!init.stale && !!init.handle,
      eol: init.eol === "\r\n" || init.eol === "\r" ? init.eol : "\n", eolMixed: !!init.eolMixed, eolList: typeof init.eolList === "string" ? init.eolList : null, bom: !!init.bom,
      bigStart: Number.isFinite(init.bigStart) ? init.bigStart : null,
      disk: init.disk && Number.isFinite(init.disk.size) && Number.isFinite(init.disk.mod) ? { size: init.disk.size, mod: init.disk.mod } : null,
      enc: [...Encoding.WRITABLE, ...Encoding.READ_ONLY].includes(init.enc) ? init.enc : "utf-8", link: init.link && typeof init.link.src === "string" ? { src: init.link.src, op: init.link.op, ...(init.link.opts && typeof init.link.opts === "object" ? { opts: init.link.opts } : {}) } : null,
      updated: +init.updated || Date.now(), pending: init.pending ?? true, scrollTop: 0, langApplied: null, pinned: !!init.pinned, hex: !!init.hex,
      cloneOf: init.kind === "clone" ? init.cloneOf : null,
      // File opened from a Drive / OneDrive link: where Save writes back (CloudDrive.save).
      remote: init.remote && typeof init.remote.kind === "string" ? { ...init.remote } : null,
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
  // A clone acts for its original: saving, running, language and the dirty mark all go through root().
  const root = doc => doc.kind === "clone" ? all.get(doc.cloneOf) || doc : doc;
  const family = doc => { const r = root(doc); return [r, ...list().filter(d => d.kind === "clone" && d.cloneOf === r.id)]; };
  const effectiveLang = doc => { const r = root(doc); return r.lang || r.detected.id; };

  // The live text moves into an EditorState while the tab is open; the plain copy is dropped to halve memory.
  function ensureState(doc) {
    if (doc.state) return doc.state;
    doc.state = CmSetup.makeState(doc.text, doc.readOnly || doc.stale, LangDetect.indentOf(doc.text));
    if (doc.eolMixed && doc.eolList) doc.state = doc.state.update({ effects: MixedEol.effect(doc.state.doc, doc.eolList) }).state;
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
  function recheck(doc) {
    if (!all.has(doc.id) || doc.lang || doc.detected.by === "ext") return;
    const d = LangDetect.detect(doc.name, text(doc).slice(0, 20000));
    if (d.id !== doc.detected.id) { doc.detected = d; emit("lang", doc); }
  }
  const redetect = Dom.debounce(recheck, 800);

  // byUser: typing / paste / undo, as opposed to an OutputLink re-run writing into the tab.
  function edited(doc, byUser = true) {
    doc.updated = Date.now();
    doc.pending = true;
    if (doc.kind === "temp") doc.edited = true;
    const handEdited = doc.kind === "output" && byUser && !doc.edited;
    if (handEdited) doc.edited = true;
    const flip = doc.kind === "file" && !doc.dirty;
    if (flip) doc.dirty = true;
    emit(handEdited ? "handEdited" : flip ? "dirty" : "edit", doc);
    if (!doc.lang && doc.detected.by !== "ext") redetect(doc);
  }

  function rename(doc, name) {
    const r = root(doc);
    for (const d of family(r)) d.name = name;
    r.detected = LangDetect.detect(name, text(r).slice(0, 20000));
    r.pending = true;
    emit("rename", r);
  }

  function update(doc, fields, type = "meta") {
    Object.assign(doc, fields, { pending: true });
    emit(type, doc);
  }

  // Closing a tab: notes stay, an edited temp tab or hand-edited output is kept as a note, everything else is dropped.
  function closed(doc) {
    if ((doc.kind === "temp" || doc.kind === "output") && doc.edited) { doc.kind = "note"; doc.link = null; emit("kept", doc); }
    if (doc.kind === "note") { release(doc); doc.pending = true; emit("meta", doc); }
    else remove(doc.id);
  }

  function remove(id) {
    const doc = all.get(id);
    if (!doc) return;
    all.delete(id);
    emit("remove", doc);
  }

  return { create, get, list, notes, text, root, family, effectiveLang, ensureState, release, edited, recheck, rename, update, closed, remove, on: f => listeners.push(f) };
})();
