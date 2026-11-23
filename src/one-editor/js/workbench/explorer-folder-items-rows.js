// Rows of the list tabs (folder, results): a button per item (check box, icon, cells, colour tag, type / age class), column headers, sizes / dates filled in after the list shows; row → node and the owner's selection for the Explorer shortcuts.
const FolderRows = (() => {
  const rowNode = new WeakMap(), owners = new WeakMap();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (cls, text, onClick) => { const b = el("button", cls, text); b.type = "button"; b.onclick = onClick; return b; };

  // cells: [[class suffix, text]] after the check box and the icon.
  function row(node, key, cells, title = node.path) {
    const r = btn("fi-row", null);
    r.dataset.key = key;
    r.title = title;
    r.className += " k-" + FolderGroups.family(node.name, node.dir);
    r.append(el("i", "fi-chk"), el("i", "fi-ico", node.dir ? "📁" : Explorer.fileIcon(node.name)), ...cells.map(([k, v]) => el("span", "fi-" + k, v ?? "")));
    rowNode.set(r, node);
    retag(r);
    const size = node.dir && DirSize.text(node), cell = size && r.querySelector(".fi-size");
    if (cell) cell.textContent = size;
    return r;
  }

  // Sortable column headers: the sorted one shows ▲ / ▼.
  function head(cols, sort, onSort) {
    return cols.map(([k, label]) => {
      const b = btn("fi-" + k, T(label) + (sort?.key === k ? (sort.asc ? " ▲" : " ▼") : ""), () => onSort(k));
      b.title = T("Sắp xếp theo cột này");
      return b;
    });
  }

  function setCells(r, s) {
    r.querySelector(".fi-mod").textContent = FolderFmt.date(s.mod);
    r.querySelector(".fi-size").textContent = FolderFmt.size(s.size);
    r.dataset.age = FolderGroups.age(s.mod);
  }
  // The colour dot before the name follows Tags without rebuilding the row.
  function retag(r) {
    const name = r.querySelector(".fi-name"), dot = Tags.dot(rowNode.get(r));
    name?.querySelector(".tag-dot")?.remove();
    if (name && dot) name.prepend(dot);
  }

  // Sizes / dates of [node, row] pairs into t.stats; a newer paint (t.gen) stops the old fill. → true when something was read.
  async function fill(t, my, pairs) {
    const todo = pairs.filter(([n]) => !n.dir && !t.stats.has(n));
    let i = 0;
    const worker = async () => {
      while (i < todo.length && my === t.gen) {
        const [n, r] = todo[i++];
        const s = await FolderFmt.stat(n).catch(() => ({ size: null, mod: null }));
        t.stats.set(n, s);
        if (my === t.gen) setCells(r, s);
      }
    };
    await Promise.all(Array.from({ length: 8 }, worker));
    return my === t.gen && todo.length > 0;
  }

  // A list tab hands its selection to the Explorer shortcuts (Delete, Ctrl+X/C, Alt+Enter) of a selected row.
  const own = (list, picked) => owners.set(list, picked);
  const nodeOf = r => rowNode.get(r) || null;
  function selection(r) {
    const n = nodeOf(r), picked = owners.get(r.parentElement);
    if (!n) return [];
    return picked && r.classList.contains("on") ? picked() : [n];
  }

  return { el, btn, row, head, setCells, retag, fill, own, nodeOf, selection };
})();
