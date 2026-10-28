// Timeline column filters (header click: contains / equals / not equals, time window; cell right-click: only / exclude this value) via ColFilter, and drag-to-reorder columns.
const ColView = (() => {
  let filters = [], layout = null, deps = null;

  const label = id => { const c = deps.columns().find(x => x.id === id); return c ? (c.extra ? c.label : T(c.label)) : id; };
  const chips = () => ColFilter.chips($("colChips"), filters, label, k => { filters.splice(k, 1); changed(); });
  const changed = () => { chips(); deps.onChange(); };
  function add(f) { filters = filters.filter(x => !(x.col === f.col && (x.op === f.op || f.op === "range"))); filters.push(f); changed(); }

  // Values are the table's own cell text (time in the chosen zone); a time window gets "YYYY-MM-DD HH:MM:SS.fff" so it can include dates.
  const match = (cellOf, stampOf) => filters.every(f => ColFilter.match([f], c => f.op === "range" && c === "time" ? stampOf() : cellOf(c)));

  // Header drag & drop: the new order covers built-in and extra columns alike.
  function bindTable(table) {
    let from = null;
    table.addEventListener("dragstart", e => { const th = e.target.closest("th[data-col]"); if (th) { from = th.dataset.col; e.dataTransfer.effectAllowed = "move"; } });
    table.addEventListener("dragover", e => { if (from && e.target.closest("th[data-col]")) e.preventDefault(); });
    table.addEventListener("drop", e => {
      const th = e.target.closest("th[data-col]");
      if (!from || !th || th.dataset.col === from) return;
      e.preventDefault();
      const ids = deps.columns().map(c => c.id).filter(id => id !== from);
      ids.splice(ids.indexOf(th.dataset.col), 0, from);
      layout = ids; from = null;
      Store.set("layout", layout);
      deps.onChange();
    });
    table.addEventListener("click", e => {
      const th = e.target.closest("th[data-col]");
      if (!th) return;
      e.stopPropagation();
      const col = th.dataset.col, r = th.getBoundingClientRect();
      ColFilter.editor(r.left, r.bottom + 4, label(col), col === "time", f => add({ col, ...f, v2: f.v2 || "" }));
    });
    table.addEventListener("contextmenu", e => {
      const td = e.target.closest("td[data-col]"), tr = e.target.closest("tr[data-i]");
      if (!td || !tr) return;
      e.preventDefault();
      deps.select(+tr.dataset.i);
      const col = td.dataset.col, v = td.textContent;
      ColFilter.menu(e.clientX, e.clientY, v, op => add({ col, op, v, v2: "" }), deps.extras());
    });
  }

  // deps: { columns(), onChange(), select(i), extras() → [{ label, run }] for the right-click menu }
  function init(d) { deps = d; layout = Store.get("layout", null); chips(); }

  const resetLayout = () => { layout = null; Store.set("layout", null); deps.onChange(); };
  // Share links / saved analyses carry filters + layout; payload values are untrusted.
  const get = () => ({ filters, layout });
  function set(p = {}) {
    filters = ColFilter.clean(p.filters, c => typeof c === "string");
    if (Array.isArray(p.layout) && p.layout.every(x => typeof x === "string")) layout = p.layout;
    chips();
  }

  return { init, bindTable, match, get, set, resetLayout, layout: () => layout, active: () => filters.length > 0 };
})();
