// Column filters for table tools: contains / equals / not equals / range, header popover editor, right-click "only / exclude this value" menu, removable chips.
const ColFilter = (() => {
  const OPS = { has: "∋", eq: "=", neq: "≠", range: "∈" };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let pop = null;

  const DATE = /^\d{4}-\d{2}-\d{2}/;
  // Strings are compared, so "09:00" … "09:30" also keeps "09:30:59.999". A bound with a date ("2026-10-28 09:00") compares the full
  // "YYYY-MM-DD HH:MM:SS" value and lends its date to a bound without one; with no dates at all, a dated value is compared on its time only.
  function inRange(f, v) {
    let a = f.v.replace("T", " "), b = f.v2.replace("T", " ");
    const day = (DATE.exec(a) || DATE.exec(b) || [""])[0];
    if (day) { if (a && !DATE.test(a)) a = `${day} ${a}`; if (b && !DATE.test(b)) b = `${day} ${b}`; }
    else v = v.replace(/^\d{4}-\d{2}-\d{2}[ T]/, "");
    return (!a || v >= a) && (!b || v <= b + "￿");
  }
  function test(f, v) {
    if (f.op === "range") return inRange(f, v);
    if (f.op === "eq") return v === f.v;
    if (f.op === "neq") return v !== f.v;
    return v.toLowerCase().includes(f.v.toLowerCase());
  }
  const match = (filters, valueOf) => filters.every(f => test(f, String(valueOf(f.col) ?? "")));

  const close = () => { if (pop) pop.hidden = true; };
  function show(x, y, html, bind) {
    if (!pop) {
      pop = Object.assign(document.body.appendChild(document.createElement("div")), { className: "pop", hidden: true });
      document.addEventListener("mousedown", e => { if (!pop.hidden && !pop.contains(e.target)) close(); });
    }
    pop.innerHTML = html;
    pop.hidden = false;
    pop.style.left = Math.max(4, Math.min(x, innerWidth - pop.offsetWidth - 8)) + "px";
    pop.style.top = Math.max(4, Math.min(y, innerHeight - pop.offsetHeight - 8)) + "px";
    bind(pop);
    const first = pop.querySelector("input");
    if (first) first.focus();
  }

  // onApply({op, v, v2}); range=true shows From / To instead of the operator picker.
  function editor(x, y, colLabel, range, onApply) {
    const from = esc(T("Từ")), to = esc(T("Đến")), has = esc(T("chứa")), eq = esc(T("bằng")), neq = esc(T("khác"));
    const title = esc(T("Lọc cột {col}", { col: colLabel })), apply = esc(T("Áp dụng")), shut = esc(T("Đóng"));
    const dated = esc(T("Giờ HH:MM:SS.fff, có thể kèm ngày YYYY-MM-DD ở trước để lọc log nhiều ngày."));
    const body = range
      ? `<label>${from} <input type="text" data-f="v" placeholder="09:00:00.000"></label><label>${to} <input type="text" data-f="v2" placeholder="2026-10-28 09:30:00"></label><div class="muted">${dated}</div>`
      : `<select data-f="op"><option value="has">${has}</option><option value="eq">${eq}</option><option value="neq">${neq}</option></select><input type="text" data-f="v">`;
    show(x, y, `<b>${title}</b><div class="row">${body}</div>` +
      `<div class="row"><button class="main" data-a="ok">${apply}</button><button data-a="x">${shut}</button></div>`, p => {
      const val = k => (p.querySelector(`[data-f="${k}"]`) || {}).value || "";
      const ok = () => {
        const v = val("v").trim(), v2 = val("v2").trim();
        close();
        if (range ? v || v2 : v) onApply(range ? { op: "range", v, v2 } : { op: val("op"), v });
      };
      p.querySelector('[data-a="ok"]').onclick = ok;
      p.querySelector('[data-a="x"]').onclick = close;
      p.onkeydown = e => { if (e.key === "Enter") ok(); if (e.key === "Escape") close(); };
    });
  }

  // onPick("eq" | "neq"); extra: [{ label, run }] more actions (e.g. follow an order chain).
  function menu(x, y, value, onPick, extra = []) {
    const short = value.length > 40 ? value.slice(0, 40) + "…" : value;
    const only = esc(T("Chỉ hiện “{v}”", { v: short })), skip = esc(T("Loại trừ “{v}”", { v: short }));
    show(x, y, `<button data-a="eq">${only}</button><button data-a="neq">${skip}</button>` +
      extra.map((a, k) => `<button data-x="${k}">${esc(a.label)}</button>`).join(""), p => {
      p.querySelector('[data-a="eq"]').onclick = () => { close(); onPick("eq"); };
      p.querySelector('[data-a="neq"]').onclick = () => { close(); onPick("neq"); };
      p.querySelectorAll("[data-x]").forEach(b => { b.onclick = () => { close(); extra[+b.dataset.x].run(); }; });
    });
  }

  // Renders filters as chips into el; onRemove(index).
  function chips(el, filters, labelOf, onRemove) {
    const remove = esc(T("Bỏ bộ lọc này"));
    el.innerHTML = filters.map((f, k) => `<span class="chip" data-k="${k}">${esc(labelOf(f.col))} ${OPS[f.op]} ${esc(f.op === "range" ? `${f.v || "…"} – ${f.v2 || "…"}` : f.v)}` +
      `<button title="${remove}">✕</button></span>`).join("");
    el.hidden = !filters.length;
    el.onclick = e => { const b = e.target.closest(".chip button"); if (b) onRemove(+b.parentElement.dataset.k); };
  }

  // Filters from share links / saved sessions are untrusted; okCol checks the column id type of the tool.
  const clean = (list, okCol) => Array.isArray(list) ? list.filter(f => f && okCol(f.col) && Object.hasOwn(OPS, f.op) && typeof (f.v ?? "") === "string" && typeof (f.v2 ?? "") === "string")
    .map(f => ({ col: f.col, op: f.op, v: f.v || "", v2: f.v2 || "" })) : [];

  return { OPS, match, editor, menu, chips, close, clean };
})();
