// Folder tab flat view (⇣ Phẳng, Ctrl+Alt+B, Xem ▸): every file below the folder in one list with a Folder column; subfolders are read a few at a time with progress, .git / node_modules skipped (Xem ▸ / ⚙), ≤ 20,000 files; Esc or ⇣ stops; another folder turns it off.
const FolderFlat = (() => {
  const MAX = 20000, PAR = 8, HEAVY = new Set([".git", "node_modules"]);
  let api = null;
  const init = a => { api = a; };
  const on = t => !!t?.flat;

  // Files below t.node among the folders read so far (sync): lists = the children arrays seen (a re-read replaces one), missing = folders not read yet.
  function collect(t) {
    const files = [], lists = [], missing = [], stack = [t.node], heavy = FolderView.flag("flatSkip");
    let more = false;
    while (stack.length) {
      const n = stack.pop();
      if (!n.children) { if (!t.flat.failed.has(n)) missing.push(n); continue; }
      lists.push(n.children);
      for (const c of n.children) {
        if (!FolderView.shows(c.name)) continue;
        if (c.dir) { if (!heavy || !HEAVY.has(c.name)) stack.push(c); } else if (files.length < MAX) files.push(c); else more = true;
      }
    }
    return { files, lists, missing, more };
  }

  const key = (t, n) => n.path.slice(t.node.path.length + 1);
  const dir = (t, n) => { const k = key(t, n), i = k.lastIndexOf("/"); return i < 0 ? "" : k.slice(0, i); };

  // The files to list; folders still unread start a scan (unless stopped or at the cap).
  function files(t) {
    const c = collect(t);
    t.flat.lists = c.lists;
    t.flat.more = c.more;
    if (c.missing.length && !c.more && !t.flat.job && !t.flat.stopped && !t.flat.capped) scan(t);
    return c.files;
  }
  // After an Explorer draw: a folder below was read again (or dropped) ⇒ repaint; a running scan paints by itself.
  function stale(t) {
    if (t.flat.job) return false;
    const c = collect(t), old = t.flat.lists || [];
    return (c.missing.length > 0 && !c.more && !t.flat.stopped && !t.flat.capped) || c.lists.length !== old.length || c.lists.some((l, i) => l !== old[i]);
  }

  async function scan(t) {
    const my = t.flat, job = my.job = { stop: false };
    let read = 0, at = Date.now();
    const live = () => t.flat === my && !job.stop;
    while (live()) {
      const c = collect(t);
      if (!c.missing.length || c.more) break;
      if (read >= MAX) { my.capped = true; break; }
      const batch = c.missing.slice(0, PAR);
      // An unreadable folder (no permission, junction) is skipped, not retried.
      await Promise.all(batch.map(n => Explorer.loadKids(n).catch(() => { my.failed.add(n); })));
      read += batch.length;
      if (live() && Date.now() - at > 1000 + c.files.length / 10) {
        at = Date.now();
        StatusBar.msg(T("Xem phẳng “{name}”: đã đọc {d} folder · {n} file — Esc để dừng", { name: t.node.name, d: read.toLocaleString(I18n.lang), n: c.files.length.toLocaleString(I18n.lang) }));
        api.paint(t);
      }
    }
    if (t.flat !== my) return;
    my.job = null;
    if (job.stop) my.stopped = true;
    api.paint(t);
    const n = (t.total ?? 0).toLocaleString(I18n.lang);
    StatusBar.msg(job.stop ? T("Đã dừng xem phẳng — hiện {n} file đã đọc.", { n }) : my.more || my.capped ? T("Xem phẳng: {n} file (dừng ở {max} file / folder).", { n, max: MAX.toLocaleString(I18n.lang) }) : T("Xem phẳng: {n} file.", { n }), job.stop || my.more || my.capped ? "warn" : "good");
  }

  function toggle(t) {
    if (!t?.node) return;
    if (t.flat) off(t); else t.flat = { job: null, failed: new WeakSet(), lists: null, stopped: false, more: false };
    api.paint(t);
  }
  // → true when it was on. Keys become plain names again: a path key left focused is dropped.
  function off(t) {
    if (!t.flat) return false;
    if (t.flat.job) t.flat.job.stop = true;
    t.flat = null;
    if (t.selName?.includes("/")) t.selName = null;
    return true;
  }
  // The Folder column sorts inside the flat tab only; another column goes back to the shared sort.
  const sort = t => t.flat?.sort || FolderView.sort();
  function sortBy(t, k) {
    if (k === "dir" && t.flat) { t.flat.sort = { key: "dir", asc: t.flat.sort ? !t.flat.sort.asc : true }; api.paint(t); return; }
    if (t.flat?.sort) { t.flat.sort = null; FolderView.setSort(k, true); } else FolderView.sortBy(k);
  }
  const stop = t => { if (!t.flat?.job) return false; t.flat.job.stop = true; return true; };

  function button(t) {
    const b = FolderRows.btn("fi-nav fi-flat", null, () => toggle(t));
    b.append(FolderRows.el("span", "", "⇣"), FolderRows.el("span", "fi-lbl", ""));
    return b;
  }
  function labels(t) {
    const b = t.ui.flat, x = on(t);
    b.lastChild.textContent = T("Phẳng");
    b.title = T("Xem phẳng: mọi file trong folder con (Ctrl+Alt+B)") + (t.flat?.job ? " — " + T("đang đọc, bấm để dừng") : "");
    b.classList.toggle("on", x);
    b.setAttribute("aria-pressed", x);
    t.ui.root.classList.toggle("flat", x);
  }

  // Window capture while a folder tab has focus: Ctrl+Alt+B toggles, Esc stops a scan.
  function hotkey(t, e) {
    if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey && e.code === "KeyB") { toggle(t); return true; }
    return e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.metaKey && stop(t);
  }
  // Palette: the folder tab of the focused view, else View 1's.
  function toggleShown() {
    const t = api.tabIn(Views.focused) || api.tabIn(0);
    if (t) toggle(t); else StatusBar.msg(T("Chưa có tab folder — bấm 1 folder trong Explorer trước."), "warn");
  }

  return { MAX, init, on, files, stale, key, dir, sort, sortBy, toggle, off, stop, button, labels, hotkey, toggleShown };
})();
