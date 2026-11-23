// Folder sizes on request (Space on a folder row, "Calculate size", Alt+Shift+Enter = every folder shown): walked one folder at a time with progress in the size cell + status bar, Esc cancels, kept until the folder is read again.
const DirSize = (() => {
  const MAX = 100000, PAR = 16, TICK = 250;
  const queue = [], listeners = [];
  let busy = null, cache = new WeakMap(), cells = null;

  // "≥" when the walk stopped early or skipped what it could not read.
  const text = node => { const s = cache.get(node); return s ? (s.more || s.unknown ? "≥ " : "") + FolderFmt.size(s.size) : null; };
  const get = node => cache.get(node) || null;
  // A write inside a folder changes its size and every size above it; a walk already running over it starts again.
  function forget(node) {
    for (let n = node; n; n = n.parent) { cache.delete(n); if (busy?.node === n) busy.stale = true; }
  }
  const clear = () => { cache = new WeakMap(); if (busy) busy.stale = true; };

  // Size cells by folder node, read once per batch: a scan of every row per tick would stall a 5,000-row list.
  function cellsOf(node) {
    let list = cells?.get(node);
    if (!list || list.some(c => !c.isConnected)) {
      cells = new Map();
      for (const r of document.querySelectorAll(".fi-list > .fi-row")) {
        const n = FolderRows.nodeOf(r), c = r.querySelector(".fi-size");
        if (n?.dir && c) { if (!cells.has(n)) cells.set(n, []); cells.get(n).push(c); }
      }
      list = cells.get(node) || [];
      cells.set(node, list);
    }
    return list;
  }
  const paint = (node, value) => cellsOf(node).forEach(c => { c.textContent = value; });

  async function walk(node, acc, job) {
    const kids = node.children || await node.list();
    if (kids.length >= LocalFs.MAX_ENTRIES) acc.more = true;
    const files = [];
    for (const c of kids) {
      if (job.cancel) return;
      if (++acc.n > MAX) { acc.more = true; return; }
      if (!c.dir) { files.push(c); continue; }
      acc.dirs++;
      // An unreadable subfolder (no permission, junction) leaves the total short, not failed.
      try { await walk(c, acc, job); } catch { acc.unknown = true; }
    }
    for (let i = 0; i < files.length && !job.cancel; i += PAR) {
      const sizes = await Promise.all(files.slice(i, i + PAR).map(f => FolderFmt.stat(f).then(s => s.size, () => null)));
      for (const s of sizes) { acc.files++; if (s == null) acc.unknown = true; else acc.size += s; }
      if (Date.now() - acc.at > TICK) { acc.at = Date.now(); job.tick(acc); }
    }
  }

  async function one(node, job) {
    const acc = { n: 0, size: 0, files: 0, dirs: 0, more: false, unknown: false, at: Date.now() };
    job.tick = a => {
      paint(node, "… " + FolderFmt.size(a.size));
      StatusBar.msg(T("Đang tính dung lượng “{name}”: {n} mục · {size} — Esc để huỷ", { name: node.name, n: a.n.toLocaleString(I18n.lang), size: FolderFmt.size(a.size) }));
    };
    job.tick(acc);
    try { await walk(node, acc, job); } catch (e) { paint(node, text(node) || ""); StatusBar.msg(T("Không tính được dung lượng “{name}”: {msg}", { name: node.name, msg: e.message }), "bad"); return null; }
    if (job.cancel) { paint(node, text(node) || ""); return null; }
    if (job.stale && !job.again) { queue.unshift(node); return null; }
    cache.set(node, acc);
    paint(node, text(node));
    return acc;
  }

  // Folders join the queue; one walk at a time.
  async function measure(nodes) {
    const dirs = nodes.filter(n => n?.dir && !queue.includes(n) && busy?.node !== n);
    if (!dirs.length) return;
    queue.push(...dirs);
    if (busy) return;
    cells = null;
    let done = 0, last = null, lastNode = null, again = null;
    while (queue.length) {
      const node = queue.shift(), job = busy = { node, cancel: false, stale: false, again: again === node };
      again = null;
      last = await one(node, job);
      if (job.cancel) { queue.length = 0; busy = null; StatusBar.msg(T("Đã huỷ tính dung lượng."), "warn"); listeners.forEach(fn => fn()); return; }
      if (queue[0] === node) again = node;
      if (last) { done++; lastNode = node; }
    }
    busy = null;
    const note = last?.more ? " " + T("(dừng ở {n} mục)", { n: MAX.toLocaleString(I18n.lang) }) : last?.unknown ? " " + T("(chưa tính mục không rõ cỡ)") : "";
    if (done === 1) StatusBar.msg(T("Dung lượng: {size} — {files} file, {dirs} folder", { size: text(lastNode), files: last.files.toLocaleString(I18n.lang), dirs: last.dirs.toLocaleString(I18n.lang) }) + note, "good");
    else if (done > 1) StatusBar.msg(T("Đã tính dung lượng {n} folder.", { n: done }), "good");
    listeners.forEach(fn => fn());
  }

  // Esc anywhere stops a walk, as the status bar says; nothing else of the key is taken.
  addEventListener("keydown", e => { if (busy && e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.metaKey) busy.cancel = true; }, true);
  // Window capture while a folder tab has focus.
  function hotkey(e, shown) {
    if (e.key !== "Enter" || !e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return false;
    measure(shown());
    return true;
  }

  return { text, get, forget, clear, measure, hotkey, busy: () => !!busy, onChange: fn => listeners.push(fn) };
})();
