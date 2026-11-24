// Clipboard history list (pure): newest first, a repeat moves to the top, ≤ 50 unpinned + ≤ 50 pinned, empty / > 256 KB skipped; stored lists are cleaned before use.
const ClipList = (() => {
  const MAX = 50, MAX_CHARS = 256 * 1024;
  let seq = 0;

  // → { items, skipped: "" | "empty" | "big" }.
  function add(items, text, src = "", now = Date.now()) {
    if (typeof text !== "string" || !text.trim()) return { items, skipped: "empty" };
    if (text.length > MAX_CHARS) return { items, skipped: "big" };
    const old = items.find(x => x.text === text);
    const it = { id: old ? old.id : now.toString(36) + "-" + (++seq).toString(36), text, t: now, src: String(src || "").slice(0, 120), pin: !!(old && old.pin) };
    return { items: trim([it, ...items.filter(x => x !== old)]), skipped: "" };
  }

  // Keeps the newest MAX of each kind, order unchanged.
  function trim(items) {
    let p = 0, u = 0;
    return items.filter(x => (x.pin ? ++p : ++u) <= MAX);
  }

  // Pinned first, then newest first.
  const order = items => [...items].sort((a, b) => (b.pin - a.pin) || (b.t - a.t));
  const pin = (items, id, on) => trim(items.map(x => (x.id === id ? { ...x, pin: !!on } : x)));
  const remove = (items, id) => items.filter(x => x.id !== id);
  const clearUnpinned = items => items.filter(x => x.pin);

  // First lines for the list row, each cut at width.
  function preview(text, lines = 2, width = 120) {
    const all = text.split("\n"), out = all.slice(0, lines).map(l => (l.length > width ? l.slice(0, width) + "…" : l));
    return out.join("\n") + (all.length > lines ? " …" : "");
  }

  // IndexedDB value → valid items (pin forced when it comes from the pinned store).
  function clean(raw, pinned = false) {
    return trim((Array.isArray(raw) ? raw : []).filter(x => x && typeof x.text === "string" && x.text.trim() && x.text.length <= MAX_CHARS && Number.isFinite(x.t))
      .map(x => ({ id: typeof x.id === "string" ? x.id.slice(0, 40) : x.t.toString(36) + "-" + (++seq).toString(36), text: x.text, t: x.t, src: typeof x.src === "string" ? x.src.slice(0, 120) : "", pin: pinned || x.pin === true })));
  }

  return { MAX, MAX_CHARS, add, order, pin, remove, clearUnpinned, preview, clean };
})();
