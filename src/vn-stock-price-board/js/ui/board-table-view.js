// Price table: grouped 2-row header, rows keyed by symbol, per-cell updates that flash only the cells whose text changed.
const BoardView = (() => {
  let table, h = {}, cols = [], opts = {}, members = "", rows = new Map(), sel = "", sort = { key: "", dir: 0 };

  const cellCls = (i, c) => [cols[i].cls, c.c].filter(Boolean).join(" ");
  const arrow = c => sort.key === c.sort && c.sort ? (sort.dir > 0 ? " ▲" : " ▼") : "";
  const th = (c, extra = "") => `<th${extra} class="${[c.cls, c.sort ? "so" : ""].filter(Boolean).join(" ")}"${c.sort ? ` data-sort="${c.sort}"` : ""}>${Dom.esc(T(c.h, { n: c.n }))}${arrow(c)}</th>`;

  function head() {
    const g = [`<th rowspan="2" class="st" title="${Dom.esc(T("Thêm / bỏ khỏi danh mục"))}">★</th>`], row2 = [];
    for (let i = 0; i < cols.length;) {
      const c = cols[i];
      if (!c.g) { g.push(th(c, ' rowspan="2"')); i++; continue; }
      let n = 0;
      while (i + n < cols.length && cols[i + n].g === c.g) row2.push(th(cols[i + n++]));
      g.push(`<th colspan="${n}" class="grp${c.cls === "mt" ? " mt" : ""}">${Dom.esc(T(c.g))}</th>`);
      i += n;
    }
    return `<thead><tr>${g.join("")}</tr><tr>${row2.join("")}</tr></thead>`;
  }

  function star(sym) {
    const on = Watch.has(sym), tip = on ? T("Bỏ khỏi danh mục") : T("Thêm vào danh mục");
    return `<button class="star${on ? " on" : ""}" title="${Dom.esc(tip)}">${on ? "★" : "☆"}</button>`;
  }

  function rowHtml(q) {
    const cells = BoardCols.rowCells(q, opts).map((c, i) => `<td class="${cellCls(i, c)}"${i ? "" : ` title="${Dom.esc(h.name(q.sym))}"`}>${Dom.esc(c.t)}</td>`);
    return `<tr data-sym="${Dom.esc(q.sym)}"${q.sym === sel ? ' class="sel"' : ""}><td class="st">${star(q.sym)}</td>${cells.join("")}</tr>`;
  }

  function rebuild(list) {
    table.innerHTML = head() + `<tbody>${list.map(rowHtml).join("")}</tbody>`;
    rows = new Map([...table.tBodies[0].rows].map(tr => [tr.dataset.sym, tr]));
  }

  function update(list) {
    const body = table.tBodies[0], flashed = [];
    if ([...body.rows].some((tr, i) => tr.dataset.sym !== list[i].sym)) body.append(...list.map(q => rows.get(q.sym)));
    for (const q of list) {
      const tr = rows.get(q.sym);
      BoardCols.rowCells(q, opts).forEach((c, i) => {
        const td = tr.cells[i + 1], cls = cellCls(i, c);
        if (td.textContent !== c.t) { td.textContent = c.t; td.className = cls; if (c.t) flashed.push(td); }
        else if (td.className !== cls && !td.classList.contains("fl")) td.className = cls;
      });
    }
    flashed.forEach(td => td.classList.add("fl"));
    if (flashed.length) setTimeout(() => flashed.forEach(td => td.classList.remove("fl")), 900);
  }

  // force: columns / language / sort changed → new header and rows.
  function render(quotes, o, force = false) {
    const list = BoardCols.sortQuotes(quotes, sort.key, sort.dir), m = quotes.map(q => q.sym).sort().join();
    if (force || m !== members || o !== opts) { opts = o; cols = BoardCols.visible(o); members = m; rebuild(list); }
    else update(list);
  }

  function message(text) {
    members = ""; rows = new Map();
    table.innerHTML = `<tbody><tr><td class="empty">${Dom.esc(text)}</td></tr></tbody>`;
  }

  function select(sym) {
    sel = sym;
    for (const [s, tr] of rows) tr.classList.toggle("sel", s === sym);
    const tr = rows.get(sym);
    if (tr) tr.scrollIntoView({ block: "nearest" });
  }

  const refreshStars = () => { for (const [s, tr] of rows) tr.cells[0].innerHTML = star(s); };
  const order = () => [...(table.tBodies[0]?.rows || [])].map(tr => tr.dataset.sym).filter(Boolean);

  // Sort cycle per column: descending → ascending → feed order (symbols ascend first since A→Z is the natural start).
  function cycleSort(key) {
    const first = key === "sym" ? 1 : -1;
    sort = sort.key !== key ? { key, dir: first } : sort.dir === first ? { key, dir: -first } : { key: "", dir: 0 };
  }

  function init(el, handlers) {
    table = el; h = handlers;
    table.addEventListener("click", e => {
      const s = e.target.closest("th[data-sort]");
      if (s) { cycleSort(s.dataset.sort); h.onSort(); return; }
      const tr = e.target.closest("tr[data-sym]");
      if (!tr) return;
      if (e.target.closest("button.star")) h.onStar(tr.dataset.sym);
      else h.onSelect(tr.dataset.sym, true);
    });
  }

  return { init, render, message, select, refreshStars, order, getSort: () => ({ ...sort }), setSort: s => { sort = s; } };
})();
