// One box, VS Code style: no prefix = Quick Open (tabs, notes, folder files) · ">" commands · "@" symbols of the active tab · ":" go to line.
const QuickPick = (() => {
  const dlg = $("qp"), input = $("qpInput"), list = $("qpList");
  let items = [], sel = 0, custom = null;
  const MAX = 200, PH = "Tìm tab / file… (> lệnh, @ symbol, : dòng, file@symbol, file:dòng, #từ)";

  const view = () => Views.activeView(), doc = () => Views.activeDoc();
  const cmdItems = () => Commands.all().map(c => ({ label: typeof c.label === "function" ? c.label() : T(c.label), detail: Commands.keyLabel(c), run: () => Commands.run(c.id) }));

  function symbolItems() {
    if (!doc()) return [];
    return Symbols.list(view().state).map(s => ({ label: s.label, detail: (s.kind ? s.kind + " · " : "") + T("dòng {n}", { n: s.line }), run: () => Views.revealLine(doc(), s.line) }));
  }

  function fileItems() {
    const seen = new Set(), out = [];
    for (const g of Views.groups) for (const id of g.tabs) {
      const d = Docs.get(id);
      if (d && !seen.has(id)) { seen.add(id); out.push({ label: TabStrip.ICON[d.kind] + " " + d.name, detail: T("View {n}", { n: g.i + 1 }), run: () => Views.activate(g.i, id) }); }
    }
    for (const d of Docs.notes()) if (!seen.has(d.id)) out.push({ label: "📝 " + d.name, detail: T("Ghi chú"), run: () => Views.open(d, Views.focused) });
    for (const r of RecentFiles.list()) out.push({ label: "🕘 " + r.name, detail: T("Gần đây"), run: () => RecentFiles.open(r) });
    for (const n of Explorer.loadedFiles()) out.push({ label: "📄 " + n.name, detail: n.path, run: () => Explorer.openNode(n) });
    return out;
  }

  function lineItems(q) {
    const n = parseInt(q, 10), d = doc();
    if (!d) return [];
    const max = view().state.doc.lines;
    return [{ label: Number.isFinite(n) ? T("Tới dòng {n}", { n: Math.min(Math.max(n, 1), max) }) : T("Gõ số dòng (1 – {max})", { max }), detail: "", run: () => Number.isFinite(n) && Views.revealLine(d, n) }];
  }

  function compute() {
    const v = input.value, p = v[0];
    if (custom) items = Fuzzy.filter(v, custom);
    else if (p === ":") items = lineItems(v.slice(1));
    else if (p === ">") items = Fuzzy.filter(v.slice(1), cmdItems());
    else if (p === "@") items = Fuzzy.filter(v.slice(1), symbolItems());
    else items = GotoAnything.items(v) || Fuzzy.filter(v, fileItems());
    sel = 0;
    draw();
  }

  function label(it) {
    const s = document.createElement("span"), hits = new Set(it.hits || []);
    [...it.label].forEach((ch, i) => { if (hits.has(i)) { const b = document.createElement("b"); b.textContent = ch; s.append(b); } else s.append(ch); });
    return s;
  }

  function draw() {
    list.replaceChildren(...items.slice(0, MAX).map((it, i) => {
      const li = document.createElement("li"), d = document.createElement("small");
      li.className = i === sel ? "on" : "";
      li.setAttribute("role", "option");
      d.textContent = it.detail;
      li.append(label(it), d);
      li.onclick = () => choose(i);
      return li;
    }));
    if (!items.length) { const li = document.createElement("li"); li.className = "none"; li.textContent = T("Không có kết quả."); list.append(li); }
    list.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  }

  function choose(i) {
    const it = items[i];
    close();
    if (it) it.run();
  }

  function open(prefix = "") {
    custom = null;
    input.placeholder = T(PH);
    input.value = prefix;
    if (!dlg.open) dlg.showModal();
    input.focus();
    compute();
  }

  // A one-off list (local history, sessions, snippets), fuzzy filtered like Quick Open.
  function pick(list, placeholder) {
    custom = list;
    input.placeholder = placeholder;
    input.value = "";
    if (!dlg.open) dlg.showModal();
    input.focus();
    compute();
  }

  function close() { if (dlg.open) dlg.close(); }

  input.addEventListener("input", compute);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(items.length, 1); draw(); }
    else if (e.key === "Enter") { e.preventDefault(); choose(sel); }
  });
  // "close" fires after the chosen item ran: refocus the (possibly new) active editor unless the item reopened the box.
  dlg.addEventListener("close", () => { if (!dlg.open && Views.activeDoc() && !document.activeElement?.matches(".tab-rename")) Views.activeView().focus(); });
  dlg.addEventListener("click", e => { if (e.target === dlg) close(); });

  return { open, pick, close };
})();
