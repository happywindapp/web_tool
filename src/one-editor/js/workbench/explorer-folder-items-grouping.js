// Folder tab Group by (Xem ▸ Nhóm theo: type · date modified · size — headers fold, show counts) and the Windows column filter (▾ on the Type / Date modified / Size headers in Details, combined with the quick filter); per tab, cleared with the folder.
const FolderGrouping = (() => {
  const { el, btn } = FolderRows;
  const BY = { type: "type", mod: "date", size: "size" };
  const DATE = { today: "Hôm nay", yesterday: "Hôm qua", week: "Tuần này", month: "Tháng này", older: "Trước đó" };
  const SIZE = { empty: "Trống (0 byte)", tiny: "< 16 KB", small: "16 KB – 1 MB", medium: "1 – 128 MB", large: "Lớn hơn 128 MB" };
  const info = t => n => ({ name: n.name, dir: n.dir, ...(t.stats.get(n) || {}) });
  function label(by, key) {
    if (key === "folder") return T("Folder");
    if (key === "none") return T("Không rõ");
    if (by === "type") return key ? T("File {ext}", { ext: key.toUpperCase() }) : T("File");
    return T((by === "date" ? DATE : SIZE)[key] || key);
  }
  // Columns view has no groups.
  const by = t => (t.ui.root.dataset.view === "cols" ? "none" : FolderView.group());
  const picked = t => Object.entries(t.picks || {}).filter(([, s]) => s.size);
  // Dates / sizes come after the list shows: a repaint is due once they are read.
  const needsStats = t => /^(date|size)$/.test(by(t)) || picked(t).some(([c]) => c !== "type");
  const clear = t => { t.picks = {}; t.folded = new Set(); };

  // → predicate of the column filter, or null.
  function test(t) {
    const picks = picked(t);
    if (!picks.length) return null;
    const get = info(t), map = Object.fromEntries(picks), stat = picks.some(([c]) => c !== "type");
    // A row whose date / size is not read yet stays until fill() reads it (else a re-read folder would filter to nothing).
    return n => (stat && !n.dir && !t.stats.has(n)) || FolderGroups.passes(n, map, (x, col) => FolderGroups.bucket(BY[col], get(x)));
  }

  // Details headers: ▾ next to Type / Date modified / Size (lit while that column filters).
  function head(t, cols, sort, onSort, repaint) {
    return FolderRows.head(cols, sort, onSort).map((b, i) => {
      const k = cols[i][0];
      if (!BY[k]) return b;
      const cell = el("span", "fi-" + k + " fi-hcell"), f = btn("fi-hflt" + (t.picks?.[k]?.size ? " on" : ""), "▾", e => { const r = e.currentTarget.getBoundingClientRect(); menu(t, k, r.left, r.bottom + 2, repaint); });
      b.className = "fi-hsort";
      f.title = T("Lọc theo cột này");
      f.setAttribute("aria-label", T("Lọc theo cột này"));
      cell.append(b, f);
      return cell;
    });
  }

  // The values of the column in this folder with counts, each a check box; the menu opens again after a click so several can be ticked.
  function menu(t, col, x, y, repaint) {
    const get = info(t), counts = new Map(), set = (t.picks ||= {})[col] ||= new Set();
    for (const n of t.all || []) { const k = FolderGroups.bucket(BY[col], get(n)); counts.set(k, (counts.get(k) || 0) + 1); }
    const flip = k => { if (set.has(k)) set.delete(k); else set.add(k); repaint(t); menu(t, col, x, y, repaint); };
    const items = FolderGroups.orderKeys(BY[col], [...new Set([...counts.keys(), ...set])]).map(k => FolderView.check(set.has(k), label(BY[col], k) + " (" + (counts.get(k) || 0) + ")", "", () => flip(k)));
    const head = el("div", "menu-head", T("Lọc: {col}", { col: T(FolderView.COLS.find(c => c[0] === col)[1]) }));
    TabMenu.show([head, ...items, ...(set.size ? [el("hr", "menu-sep"), TabMenu.entry(T("Bỏ lọc cột này"), "", () => { set.clear(); repaint(t); })] : [])], x, y);
  }

  // [node, row] pairs → the list children: group headers (click folds) and the rows of open groups.
  function layout(t, pairs, repaint) {
    const g = by(t);
    t.ui.root.classList.toggle("grouped", g !== "none");
    if (g === "none") return pairs.map(p => p[1]);
    const get = info(t), out = [];
    for (const grp of FolderGroups.groupBy(pairs, g, p => get(p[0]))) {
      const id = g + ":" + grp.key, shut = t.folded.has(id);
      const h = btn("rs-grp", (shut ? "▸ " : "▾ ") + label(g, grp.key) + " · " + T("{n} mục", { n: grp.items.length }), () => {
        if (t.folded.has(id)) t.folded.delete(id); else t.folded.add(id);
        repaint(t);
      });
      h.setAttribute("aria-expanded", !shut);
      out.push(h);
      if (!shut) out.push(...grp.items.map(p => p[1]));
    }
    return out;
  }

  return { needsStats, clear, test, head, layout };
})();
