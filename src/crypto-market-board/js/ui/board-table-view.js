// Price table: rows keyed by ticker, per-cell updates that flash only the cells whose text changed, header sort cycle, ★ toggle.
const BoardView = (() => {
  let table, h = {}, cols = [], sig = "", members = "", rows = new Map(), sel = "", sort = { key: "", dir: 0 };

  const arrow = c => sort.key === c.k ? (sort.dir > 0 ? " ▲" : " ▼") : "";
  const th = c => `<th class="${[c.cls, c.k === "coin" ? "l" : "", "so"].filter(Boolean).join(" ")}" data-sort="${c.k}">${Dom.esc(T(c.h))}${arrow(c)}</th>`;
  const head = () => `<thead><tr><th class="st" title="${Dom.esc(T("Thêm / bỏ khỏi danh mục"))}">★</th>${ordered().map(c => c.k === "spark" ? `<th class="sp">${Dom.esc(T(c.h))}</th>` : th(c)).join("")}</tr></thead>`;
  const ordered = () => cols;

  function star(sym) {
    const on = Watch.has(sym);
    return `<button class="star${on ? " on" : ""}" title="${Dom.esc(on ? T("Bỏ khỏi danh mục") : T("Thêm vào danh mục"))}">${on ? "★" : "☆"}</button>`;
  }
  function cell(c, x) {
    if (c.k === "coin") return `<td class="coin"><b>${Dom.esc(x.cell.t)}</b><span>${Dom.esc(x.row.name || "")}</span></td>`;
    if (c.k === "spark") return `<td class="sp">${x.cell.svg}</td>`;
    return `<td class="${[c.cls, x.cell.c].filter(Boolean).join(" ")}">${Dom.esc(x.cell.t)}</td>`;
  }
  function rowHtml(r) {
    const oc = ordered(), cells = BoardCols.rowCells(r, oc);
    return `<tr data-sym="${Dom.esc(r.sym)}"${r.sym === sel ? ' class="sel"' : ""}><td class="st">${star(r.sym)}</td>${oc.map((c, i) => cell(c, { cell: cells[i], row: r })).join("")}</tr>`;
  }

  function rebuild(list) {
    table.innerHTML = head() + `<tbody>${list.map(rowHtml).join("")}</tbody>`;
    rows = new Map([...table.tBodies[0].rows].map(tr => [tr.dataset.sym, tr]));
  }

  function update(list) {
    const body = table.tBodies[0], flashed = [], oc = ordered(), now = { now: Date.now() };
    if ([...body.rows].some((tr, i) => tr.dataset.sym !== list[i].sym)) body.append(...list.map(r => rows.get(r.sym)));
    for (const r of list) {
      const tr = rows.get(r.sym), cells = BoardCols.rowCells(r, oc, now);
      oc.forEach((c, i) => {
        const td = tr.cells[i + 1], v = cells[i];
        if (c.k === "coin") { const sp = td.lastChild; if (sp && sp.textContent !== (r.name || "")) sp.textContent = r.name || ""; return; }
        if (c.k === "spark") { if (td.dataset.n !== String((r.spark || []).length)) { td.innerHTML = v.svg; td.dataset.n = (r.spark || []).length; } return; }
        const cls = [c.cls, v.c].filter(Boolean).join(" ");
        if (td.textContent !== v.t) { td.textContent = v.t; td.className = cls; if (v.t && c.k !== "next") flashed.push(td); }
        else if (td.className !== cls && !td.classList.contains("fl")) td.className = cls;
      });
    }
    flashed.forEach(td => td.classList.add("fl"));
    if (flashed.length) setTimeout(() => flashed.forEach(td => td.classList.remove("fl")), 800);
  }

  // force: columns / language / currency changed → new header + rows.
  function render(list, newCols, force = false) {
    const s = newCols.map(c => c.k).join(), m = list.map(r => r.sym).sort().join();
    const sorted = BoardCols.sort(list, newCols, sort.key, sort.dir);
    if (force || s !== sig || m !== members) { cols = newCols; sig = s; members = m; rebuild(sorted); }
    else update(sorted);
  }

  function message(text) { members = ""; rows = new Map(); table.innerHTML = `<tbody><tr><td class="empty">${Dom.esc(text)}</td></tr></tbody>`; }
  function select(sym) {
    sel = sym;
    for (const [s, tr] of rows) tr.classList.toggle("sel", s === sym);
    const tr = rows.get(sym);
    if (tr) tr.scrollIntoView({ block: "nearest" });
  }
  const refreshStars = () => { for (const [s, tr] of rows) tr.cells[0].innerHTML = star(s); };
  const order = () => [...(table.tBodies[0]?.rows || [])].map(tr => tr.dataset.sym).filter(Boolean);
  // Descending first (biggest movers / caps on top), then ascending, then source order; coin column starts A→Z.
  function cycleSort(key) {
    const first = key === "coin" ? 1 : -1;
    sort = sort.key !== key ? { key, dir: first } : sort.dir === first ? { key, dir: -first } : { key: "", dir: 0 };
  }

  function init(el, handlers) {
    table = el; h = handlers;
    table.addEventListener("click", e => {
      const s = e.target.closest("th[data-sort]");
      if (s) { cycleSort(s.dataset.sort); h.onSort(); return; }
      const tr = e.target.closest("tr[data-sym]");
      if (!tr) return;
      if (e.target.closest("button.star")) h.onStar(tr.dataset.sym); else h.onSelect(tr.dataset.sym, true);
    });
  }

  return { init, render, message, select, refreshStars, order, cols: () => cols, getSort: () => ({ ...sort }), setSort: s => { sort = s; } };
})();
