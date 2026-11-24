// A read-only temp tab next to a source tab with Compare on (local history snapshot, Git HEAD); opening another one for the same source replaces it.
const ReadOnlyCompare = (() => {
  function open(src, name, text, extra = {}) {
    Docs.list().filter(d => d.cmpOf === src.id).forEach(d => Views.close(d.id, true));
    if (Views.where(src.id) < 0) Views.open(src, Views.focused, false);
    if (Views.count < 2) Views.setLayout("2c");
    const at = Views.where(src.id), d = Docs.create({ kind: "temp", name, lang: Docs.effectiveLang(src), text, readOnly: true });
    Object.assign(d, extra, { cmpOf: src.id });
    Views.activate(at, src.id, false);
    Views.open(d, Views.other(at), false);
    Compare.start(at);
    return d;
  }

  // Just the read-only tab (no source to compare with, e.g. a file deleted on disk).
  function alone(name, lang, text) {
    const d = Docs.create({ kind: "temp", name, lang, text, readOnly: true });
    Views.open(d, Views.focused, true);
    return d;
  }

  return { open, alone };
})();
