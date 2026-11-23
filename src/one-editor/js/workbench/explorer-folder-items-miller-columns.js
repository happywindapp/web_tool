// Folder tab Columns view (9th mode, Ctrl+Shift+9 — Finder / Miller columns): a column per folder from the opened root down to the current one, the current folder's list in place, a selected subfolder's items in one more column; files show in the preview pane. ← → move between columns, ↑ ↓ inside one.
const FolderMiller = (() => {
  const { el } = FolderRows;
  let api = null;
  const init = a => { api = a; };
  const on = t => FolderView.mode() === "cols" && !t.flat;
  const kids = n => FolderFmt.order((n.children || []).filter(c => FolderView.shows(c.name)), "name", true, new Map());
  const toEnd = t => requestAnimationFrame(() => { if (t.ui.mill) t.ui.mill.scrollLeft = t.ui.mill.scrollWidth; });

  // A column of a folder's items; `mark` is highlighted, a click calls pick(item). Not in the Tab order: arrows drive the columns.
  function column(items, mark, pick) {
    const col = el("div", "fi-mcol");
    for (const n of items) {
      const r = FolderRows.row(n, n.name, [["name", FolderView.label(n)]]);
      r.tabIndex = -1;
      if (n === mark) r.classList.add("on");
      r.onclick = () => pick(n);
      col.append(r);
    }
    if (!items.length) col.append(el("p", "fi-empty", T("Folder trống.")));
    return col;
  }

  // After FolderItems.paint built ui.list: the columns go around it (or ui.list returns to its place when the mode changes).
  function paint(t) {
    const { ui } = t;
    if (!on(t)) { if (ui.mill) { ui.main.append(ui.list); ui.mill.remove(); ui.mill = null; } return; }
    if (!ui.mill) { ui.mill = el("div", "fi-mill"); ui.main.append(ui.mill); }
    const chain = FolderPaths.chain(t.node) || [t.node];
    const go = dir => n => { t.refocus = true; api.navigate(t, dir, n.name); };
    t.msub = el("div", "fi-mcol fi-msub");
    ui.mill.replaceChildren(...chain.slice(0, -1).map((dir, i) => column(kids(dir), chain[i + 1], go(dir))), ui.list);
    // The folder marked in each earlier column stays in sight (scrollTop: scrollIntoView would also move the phone carousel).
    for (const c of ui.mill.querySelectorAll(".fi-mcol")) { const r = c.querySelector(".fi-row.on"); if (r) c.scrollTop = r.offsetTop - (c.clientHeight - r.offsetHeight) / 2; }
    follow(t);
    toEnd(t);
  }

  // Selection changed: one selected folder ⇒ its items in the last column (read on demand).
  async function follow(t) {
    if (!on(t) || !t.ui.mill) return;
    const nodes = api.selected(t), n = nodes.length === 1 && nodes[0].dir ? nodes[0] : null, my = t.mgen = (t.mgen || 0) + 1, sub = t.msub;
    if (!n) { sub.remove(); return; }
    if (!n.children) {
      sub.replaceChildren(el("p", "fi-empty", T("Đang đọc…")));
      t.ui.mill.append(sub);
      // Arrows held down pass many folders: only the one stopped on is read.
      await new Promise(r => setTimeout(r, 120));
      if (my !== t.mgen) return;
      try { await Explorer.loadKids(n); } catch (e) { if (my === t.mgen) sub.replaceChildren(el("p", "fi-empty bad", T("Không đọc được folder: {msg}", { msg: e.message }))); return; }
    }
    if (my !== t.mgen || !t.ui.mill) return;
    sub.replaceChildren(...column(kids(n), null, x => { t.refocus = true; api.navigate(t, n, x.name); }).childNodes);
    t.ui.mill.append(sub);
    toEnd(t);
  }

  // → on the selected folder goes into it, ← back to the parent column (selecting the folder left).
  function key(t, e, row) {
    if (!on(t) || !row || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !/^Arrow(Left|Right)$/.test(e.key)) return false;
    const n = row && FolderRows.nodeOf(row);
    if (e.key === "ArrowRight" && n?.dir) { t.refocus = true; api.navigate(t, n); }
    if (e.key === "ArrowLeft" && t.node.path.includes("/")) { t.refocus = true; api.goUp(t); }
    return true;
  }

  return { init, on, paint, follow, key };
})();
