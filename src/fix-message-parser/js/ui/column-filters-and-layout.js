// Column filters (header popover: contains / equals / not equals, time window; cell right-click: only / exclude this value) shown as chips, and drag-to-reorder columns.
const ColView = (() => {
  const OPS = { has: "∋", eq: "=", neq: "≠", range: "∈" };
  let filters = [], layout = null, deps = null, pop = null;

  const esc = s => Dom.esc(s);
  const label = id => { const c = deps.columns().find(x => x.id === id); return c ? (c.extra ? c.label : T(c.label)) : id; };
  const close = () => { if (pop) pop.hidden = true; };
  const changed = () => { close(); chips(); deps.onChange(); };

  // Values are the table's own cell text, so filters see exactly what is displayed (time in the chosen zone).
  function match(cellOf) {
    return filters.every(f => {
      const v = String(cellOf(f.col) || "");
      if (f.op === "range") return (!f.v || v >= f.v) && (!f.v2 || v <= f.v2 + "￿");
      if (f.op === "eq") return v === f.v;
      if (f.op === "neq") return v !== f.v;
      return v.toLowerCase().includes(f.v.toLowerCase());
    });
  }

  function chips() {
    const el = $("colChips");
    el.innerHTML = filters.map((f, k) => `<span class="chip" data-k="${k}">${esc(label(f.col))} ${OPS[f.op]} ${esc(f.op === "range" ? `${f.v || "…"} – ${f.v2 || "…"}` : f.v)}` +
      `<button title="${esc(T("Bỏ bộ lọc này"))}">✕</button></span>`).join("");
    el.hidden = !filters.length;
  }

  function add(f) { filters = filters.filter(x => !(x.col === f.col && (x.op === f.op || f.op === "range"))); filters.push(f); changed(); }

  function show(x, y, html, bind) {
    pop = pop || Object.assign(document.body.appendChild(document.createElement("div")), { className: "pop", hidden: true });
    pop.innerHTML = html;
    pop.hidden = false;
    pop.style.left = Math.min(x, innerWidth - pop.offsetWidth - 8) + "px";
    pop.style.top = Math.min(y, innerHeight - pop.offsetHeight - 8) + "px";
    bind(pop);
    const first = pop.querySelector("input");
    if (first) first.focus();
  }

  function openHeader(col, th) {
    const r = th.getBoundingClientRect(), time = col === "time";
    const body = time
      ? `<label>${esc(T("Từ"))} <input type="text" data-f="v" placeholder="09:00:00.000"></label><label>${esc(T("Đến"))} <input type="text" data-f="v2" placeholder="09:30:00"></label>`
      : `<select data-f="op"><option value="has">${esc(T("chứa"))}</option><option value="eq">${esc(T("bằng"))}</option><option value="neq">${esc(T("khác"))}</option></select><input type="text" data-f="v">`;
    show(r.left, r.bottom + 4, `<b>${esc(T("Lọc cột {col}", { col: label(col) }))}</b><div class="row">${body}</div>` +
      `<div class="row"><button class="main" data-a="ok">${esc(T("Áp dụng"))}</button><button data-a="x">${esc(T("Đóng"))}</button></div>`, p => {
      const val = k => (p.querySelector(`[data-f="${k}"]`) || {}).value || "";
      const ok = () => { const v = val("v").trim(), v2 = val("v2").trim(); if (time ? v || v2 : v) add(time ? { col, op: "range", v, v2 } : { col, op: val("op"), v }); else close(); };
      p.querySelector('[data-a="ok"]').onclick = ok;
      p.querySelector('[data-a="x"]').onclick = close;
      p.onkeydown = e => { if (e.key === "Enter") ok(); if (e.key === "Escape") close(); };
    });
  }

  function openCell(col, value, x, y, chainable) {
    const short = value.length > 40 ? value.slice(0, 40) + "…" : value;
    show(x, y, `<button data-a="eq">${esc(T("Chỉ hiện “{v}”", { v: short }))}</button><button data-a="neq">${esc(T("Loại trừ “{v}”", { v: short }))}</button>` +
      (chainable ? `<button data-a="chain">⛓ ${esc(T("Theo chuỗi lệnh"))}</button>` : ""), p => {
      p.querySelector('[data-a="eq"]').onclick = () => add({ col, op: "eq", v: value });
      p.querySelector('[data-a="neq"]').onclick = () => add({ col, op: "neq", v: value });
      const c = p.querySelector('[data-a="chain"]');
      if (c) c.onclick = () => { close(); deps.follow(); };
    });
  }

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
    table.addEventListener("click", e => { const th = e.target.closest("th[data-col]"); if (th) { e.stopPropagation(); openHeader(th.dataset.col, th); } });
    table.addEventListener("contextmenu", e => {
      const td = e.target.closest("td[data-col]"), tr = e.target.closest("tr[data-i]");
      if (!td || !tr) return;
      e.preventDefault();
      deps.select(+tr.dataset.i);
      openCell(td.dataset.col, td.textContent, e.clientX, e.clientY, deps.chainable());
    });
    document.addEventListener("mousedown", e => { if (pop && !pop.hidden && !pop.contains(e.target)) close(); });
    $("colChips").addEventListener("click", e => { const b = e.target.closest(".chip button"); if (b) { filters.splice(+b.parentElement.dataset.k, 1); changed(); } });
  }

  // deps: { columns(), onChange(), select(i), follow(), chainable() }
  function init(d) { deps = d; layout = Store.get("layout", null); chips(); }

  const resetLayout = () => { layout = null; Store.set("layout", null); deps.onChange(); };
  // Share links / saved analyses carry filters + layout; payload values are untrusted.
  const get = () => ({ filters, layout });
  function set(p = {}) {
    const okF = f => f && typeof f.col === "string" && Object.hasOwn(OPS, f.op) && typeof (f.v ?? "") === "string" && typeof (f.v2 ?? "") === "string";
    filters = Array.isArray(p.filters) ? p.filters.filter(okF).map(f => ({ col: f.col, op: f.op, v: f.v || "", v2: f.v2 || "" })) : [];
    if (Array.isArray(p.layout) && p.layout.every(x => typeof x === "string")) layout = p.layout;
    chips();
  }

  return { init, bindTable, match, get, set, resetLayout, layout: () => layout, active: () => filters.length > 0 };
})();
