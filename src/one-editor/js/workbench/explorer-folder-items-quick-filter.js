// Folder tab quick filter (🔍 / Ctrl+F / F3: text = contains, "*.js;*.md" = wildcards, "tag:red" / "tag:đỏ" = colour tag, cleared when the folder changes) and Windows type-to-select (letters typed within 1 s jump to the next matching name).
const FolderFilter = (() => {
  const TYPE_MS = 1000;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const firstRow = t => t.ui.list.querySelector(".fi-row.on") || t.ui.list.querySelector(".fi-row");
  // A tag filter shows other rows when a tag changes.
  const tabs = new Map();
  Tags.onChange(() => { for (const [t, repaint] of tabs) if (t.closed) tabs.delete(t); else if (!t.ui.root.hidden && t.node?.children && TagMap.query(t.filter).colors) repaint(t); });

  // repaint(t): the list redraws with the new filter.
  function build(t, repaint) {
    const ui = t.ui, b = el("button", "fi-nav", "🔍"), input = el("input", "fi-find");
    Object.assign(b, { type: "button", onclick: () => (input.hidden ? open(t) : clear(t, repaint)) });
    Object.assign(input, { type: "search", spellcheck: false, autocomplete: "off", hidden: true });
    input.oninput = () => { t.filter = input.value; repaint(t); };
    input.onkeydown = e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); clear(t, repaint); firstRow(t)?.focus(); }
      else if (e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); firstRow(t)?.focus(); }
    };
    Object.assign(ui, { findBtn: b, find: input });
    Object.assign(t, { filter: "", typed: "", typedAt: 0 });
    tabs.set(t, repaint);
    labels(t);
    return [b, input];
  }
  function labels(t) {
    t.ui.findBtn.title = T("Lọc mục trong folder này (Ctrl+F / F3)");
    t.ui.find.placeholder = T("Lọc: chữ, *.js;*.md hoặc tag:đỏ");
  }

  function open(t) {
    t.ui.find.hidden = false;
    t.ui.findBtn.classList.add("on");
    t.ui.find.focus();
    t.ui.find.select();
  }
  function clear(t, repaint) {
    const had = !!t.filter;
    t.filter = "";
    t.ui.find.value = "";
    t.ui.find.hidden = true;
    t.ui.findBtn.classList.remove("on");
    if (had && repaint) repaint(t);
  }

  // → predicate on a node, or null when nothing is filtered.
  function test(t) {
    if (!t.filter) return null;
    const q = TagMap.query(t.filter), name = q.rest ? NameMatch.filter(q.rest) : null;
    if (!q.colors && !name) return null;
    return n => (!q.colors || TagMap.hits(q.colors, Tags.of(n))) && (!name || name(n.name));
  }
  function hotkey(t, e) {
    const none = !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    if (((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "f") || (e.key === "F3" && none)) { open(t); return true; }
    return false;
  }

  // Printable key → the row to focus (undefined: typed but no match); null = not a typing key.
  function type(t, e, rows, k) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1 || (e.key === " " && !t.typed)) return null;
    const now = Date.now();
    t.typed = (now - t.typedAt > TYPE_MS ? "" : t.typed) + e.key;
    t.typedAt = now;
    const i = NameMatch.seek(rows.map(r => FolderRows.nodeOf(r)?.name ?? r.dataset.key), t.typed, k);
    return i >= 0 ? rows[i] : undefined;
  }

  return { build, labels, open, clear, test, hotkey, type };
})();
