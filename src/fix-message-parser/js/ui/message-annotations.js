// Annotations: one note per message (timeline marker, CSV/JSON, share links, saved analyses).
const Notes = (() => {
  let notes = {};
  const get = i => notes[i] || "";
  const set = (i, text) => { if (text.trim()) notes[i] = text; else delete notes[i]; };
  // Payload values are untrusted: only "index → string" pairs are kept.
  function load(obj) {
    notes = {};
    if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) if (/^\d+$/.test(k) && typeof v === "string" && v.trim()) notes[k] = v.slice(0, 2000);
  }
  return { get, set, load, all: () => ({ ...notes }), count: () => Object.keys(notes).length };
})();
