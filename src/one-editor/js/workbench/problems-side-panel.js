// Problems side panel (⚠): errors / warnings of every open tab grouped per tab; tabs on screen read their live lint, the others are checked in batches (cached per text), click ⇒ line:col.
const ProblemsPanel = (() => {
  const L = SidePanelList, el = L.el, box = $("pbList"), filter = $("pbFilter"), status = $("pbStatus"), folded = new Set();
  const cache = new Map();
  let gen = 0;

  const openDocs = () => [...new Set(Views.groups.slice(0, Views.count).flatMap(g => g.tabs))].map(Docs.get)
    .filter(d => d && d.kind !== "clone" && !Docs.isList(d) && !PreviewPane.isPane(d) && !d.hex && !d.big && !d.stale && !d.sealed && DataLint.owns(Docs.effectiveLang(d)));
  const onScreen = d => Views.groups.slice(0, Views.count).find(g => g.active === d.id && g.view);
  const tooBig = (d, st) => st.doc.length > (CodeLint.LANGS.has(Docs.effectiveLang(d)) ? CodeLint.LIVE_MAX : DataLint.MAX);

  function item(st, x) {
    const from = Math.min(x.from, st.doc.length), ln = st.doc.lineAt(from);
    return { from, line: ln.number, col: from - ln.from + 1, sev: x.severity === "error" ? "error" : "warning", msg: x.message, src: x.source || "" };
  }

  // Live diagnostics for tabs on screen, cache for the others (null = not checked yet for this text).
  function known(d) {
    const g = onScreen(d);
    if (g) { const out = []; CM.lint.forEachDiagnostic(g.view.state, x => out.push(item(g.view.state, x))); return out; }
    const st = d.state, c = cache.get(d.id);
    return st && c && c.text === st.doc ? c.list : null;
  }

  // One tab at a time with a yield between, so typing stays smooth; a newer run or a hidden panel stops it.
  async function check() {
    const my = ++gen, open = openDocs();
    for (const id of cache.keys()) if (!open.some(d => d.id === id)) cache.delete(id);
    for (const d of open) {
      if (my !== gen || !L.visible("problems")) return;
      if (known(d)) continue;
      const st = Docs.ensureState(d);
      let list = [];
      const big = tooBig(d, st);
      if (!big) try { list = (await DataLint.diagnosticsOf(d, st)).map(x => item(st, x)); } catch { list = []; }
      cache.set(d.id, { text: st.doc, list, big });
      render();
      await new Promise(r => setTimeout(r, 0));
    }
    if (my === gen) render();
  }

  function totals() {
    let e = 0, w = 0;
    for (const d of openDocs()) for (const x of known(d) || []) if (x.sev === "error") e++; else w++;
    return { e, w };
  }

  function badge() {
    const { e, w } = totals();
    SidePanels.badge("problems", e, T("{e} lỗi · {w} cảnh báo", { e: I18n.num(e), w: I18n.num(w) }));
  }

  async function jump(d, x) {
    if (!Docs.get(d.id)) return;
    Views.revealLine(d, x.line);
    const v = Views.activeView(), st = v.state, ln = st.doc.line(Math.min(x.line, st.doc.lines));
    v.dispatch({ selection: { anchor: Math.min(ln.from + x.col - 1, ln.to) } });
    v.focus();
    PhoneLayout.show(Views.focused + 1);
  }

  const row = (d, x) => L.row([el("span", "pb-sev " + x.sev, x.sev === "error" ? "✖" : "⚠"), el("small", "", " " + x.line + ":" + x.col + "  "), x.msg, el("small", "pb-src", x.src ? "  (" + x.src + ")" : "")],
    { title: T("Dòng {l}, Cột {c}", { l: x.line, c: x.col }) + " — " + x.msg, onclick: () => jump(d, x) });

  function render() {
    badge();
    if (!L.visible("problems")) return;
    if (!CmSetup.settings.lint) {
      const b = el("button", "", T("Bật kiểm lỗi khi gõ"));
      b.type = "button";
      b.onclick = () => Commands.run("lint");
      box.replaceChildren(L.empty(T("Kiểm lỗi khi gõ đang tắt — panel không có gì để hiện.")), b);
      status.textContent = "";
      return;
    }
    const q = filter.value.trim().toLowerCase(), showE = $("pbErr").checked, showW = $("pbWarn").checked, docs = openDocs();
    let pending = 0, e = 0, w = 0;
    const big = docs.filter(d => { const c = cache.get(d.id); return c && c.big && d.state && c.text === d.state.doc; }).length;
    const groups = docs.map(d => {
      const all = known(d);
      if (!all) { pending++; return null; }
      all.forEach(x => { if (x.sev === "error") e++; else w++; });
      const name = d.name.toLowerCase().includes(q);
      const items = all.filter(x => (x.sev === "error" ? showE : showW) && (!q || name || x.msg.toLowerCase().includes(q)));
      return items.length ? L.group({ key: d.id, label: TabStrip.ICON[d.kind] + " " + d.name, path: Docs.effectiveLang(d), count: items.length, folded, items: items.map(x => row(d, x)) }) : null;
    }).filter(Boolean);
    status.textContent = T("{e} lỗi · {w} cảnh báo", { e: I18n.num(e), w: I18n.num(w) }) + (pending ? " · " + T("⏳ đang kiểm {n} tab…", { n: I18n.num(pending) }) : "") + (big ? " · " + T("bỏ qua {n} tab quá lớn", { n: I18n.num(big) }) : "");
    if (groups.length) { box.replaceChildren(...groups); return; }
    box.replaceChildren(L.empty(!docs.length ? T("Không có tab nào kiểm lỗi được (JSON, YAML, XML, HTML, CSS, code…).") : e + w ? T("Không có lỗi khớp bộ lọc.") : pending ? "" : big ? T("Không có lỗi trong các tab đã kiểm.") : T("✔ Không có lỗi trong các tab đang mở.")));
  }

  function show(arg, quiet) {
    render();
    check();
    if (!quiet && !L.coarse()) filter.focus();
  }

  function init() {
    const later = L.later("problems", () => { render(); check(); }, 400);
    filter.addEventListener("input", later);
    ["pbErr", "pbWarn"].forEach(id => $(id).addEventListener("change", render));
    $("pbRefresh").onclick = () => { cache.clear(); render(); check(); };
    Views.onLint(Dom.debounce(render, 200));
    Views.onChange(() => { badge(); later(); });
    Docs.on(later);
    Settings.onChange(Dom.debounce(render, 100));
    I18n.onChange(render);
    SidePanels.register("problems", { show });
  }

  return { init, render };
})();
