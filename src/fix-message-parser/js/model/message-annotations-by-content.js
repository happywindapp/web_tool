// Annotations keyed by message content (hash of its tag=value pairs + occurrence), so they stay on their message when lines are added or removed above it.
const Notes = (() => {
  const MAX = 1000;
  let notes = {}, keys = [], legacy = null;

  // FNV-1a over the delimiter-independent text of the message.
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };

  // Called after every parse; identical messages get .1, .2 … in input order. Legacy index keys (old links) resolve here once.
  function bind(msgs) {
    const seen = new Map();
    keys = msgs.map(m => {
      const h = hash(m.fields.map(f => f.tag === null ? f.value : `${f.tag}=${f.value}`).join("\x01"));
      const n = (seen.get(h) || 0) + 1;
      seen.set(h, n);
      return `${h}.${n}`;
    });
    if (legacy) { for (const [i, v] of Object.entries(legacy)) if (keys[i] && !notes[keys[i]]) notes[keys[i]] = v; legacy = null; }
  }

  const get = i => notes[keys[i]] || "";
  function set(i, text) { const k = keys[i]; if (!k) return; if (text.trim()) notes[k] = text.slice(0, 2000); else delete notes[k]; }

  // Payload values are untrusted: content keys "<hash>.<n>" or legacy message indexes, string notes only.
  function load(obj) {
    notes = {}; legacy = null;
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj).slice(0, MAX)) {
      if (typeof v !== "string" || !v.trim()) continue;
      if (/^[0-9a-z]+\.\d+$/.test(k)) notes[k] = v.slice(0, 2000);
      else if (/^\d+$/.test(k)) (legacy ||= {})[k] = v.slice(0, 2000);
    }
  }

  // Edits that rewrite message content but keep the order (anonymizing) carry notes over by position.
  const byIndex = () => keys.map((_, i) => get(i));
  const setByIndex = list => list.forEach((t, i) => { if (t) set(i, t); });

  return { bind, get, set, load, byIndex, setByIndex, all: () => ({ ...notes }), count: () => keys.filter(k => notes[k]).length };
})();
