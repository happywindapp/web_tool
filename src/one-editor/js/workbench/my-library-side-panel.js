// My library side panel (🧩): the user's snippets, macros, batch-replace sets and recipes in one place — ▶ use, ⧉ copy, ✕ delete; ⬇ export / ⬆ import one JSON file (untrusted, cleaned per store).
const LibraryPanel = (() => {
  const L = SidePanelList, el = L.el, box = $("lbList"), filter = $("lbFilter"), folded = new Set(["built"]);
  const snipKey = s => s.prefix + "\u0000" + (s.lang || "");
  let gen = 0;

  const view = () => { const d = Views.activeDoc(); return d && !Docs.isList(d) && !PreviewPane.isPane(d) ? Views.activeView() : null; };
  const need = fn => () => { const v = view(); if (!v) { StatusBar.msg(T("Chưa có tab nào đang chọn."), "warn"); return; } fn(v); };
  const meta = async k => { const v = await NotesDb.getMeta(k).catch(() => null); return (Array.isArray(v) ? v : []).filter(x => x && typeof x.name === "string"); };
  const sure = name => confirm(T("Xoá “{name}” khỏi thư viện?", { name }));
  const report = p => p.then(() => render(), e => StatusBar.msg(T("Không lưu được: {msg}", { msg: e.message }), "bad"));
  const json = v => JSON.stringify(v, null, 2);
  // Steps that run commands (an imported file may hold any) are listed for the user before the first run.
  function runMacro(m) {
    const cmds = [...new Set(m.steps.filter(s => s.c).map(s => s.c))];
    if (cmds.length && !confirm(T("Macro “{name}” sẽ chạy các lệnh: {list}. Tiếp tục?", { name: m.name, list: cmds.join(", ") }))) return;
    Macro.set(m.steps);
    Macro.play(1);
  }

  async function data() {
    const d = Views.activeDoc(), lang = d ? Docs.effectiveLang(d) : "";
    return { lang, snippets: await Snippets.own(), built: lang ? Snippets.forLang(lang).filter(s => !s.own) : [], macros: Object.entries(Macro.list()).map(([name, steps]) => ({ name, steps })),
      sets: await meta("replaceSets"), recipes: await meta("recipes") };
  }

  // kind → rows; own items can be deleted, built-in snippets only used / copied.
  function rows(x) {
    const r = (label, sub, title, use, copy, drop) => L.row([label, el("small", "sx-path", sub ? "  " + sub : "")], { title, onclick: use,
      acts: [L.act("▶", T("Dùng"), use), L.act("⧉", T("Chép nội dung"), () => Dom.copy(copy)), ...(drop ? [L.act("✕", T("Xoá khỏi thư viện"), drop)] : [])] });
    return {
      snippets: x.snippets.map(s => r(s.prefix, s.lang || "*", s.body.slice(0, 300), need(v => Snippets.insert(v, s.body)), s.body,
        () => { if (sure(s.prefix)) report(Snippets.own().then(all => Snippets.putAll(all.filter(y => !(y.prefix === s.prefix && y.lang === s.lang)))).then(ok => ok || Promise.reject(new Error(T("trình duyệt chặn IndexedDB"))))); })),
      built: x.built.map(s => r(s.prefix, s.desc, s.body, need(v => Snippets.insert(v, s.body)), s.body, null)),
      macros: x.macros.map(m => r(m.name, T("{n} bước", { n: I18n.num(m.steps.length) }), m.name, need(() => runMacro(m)), json(m.steps),
        () => { if (sure(m.name)) { const next = { ...Macro.list() }; delete next[m.name]; report(Macro.putAll(next)); } })),
      sets: x.sets.map(s => r(s.name, T("{n} dòng", { n: I18n.num((s.rules || []).length) }), s.name, need(() => PowerTools.use(() => BatchUi.open(s.rules))), json(s.rules),
        () => { if (sure(s.name)) PowerTools.use(() => report(BatchUi.listSets().then(all => BatchUi.putSets(all.filter(y => y.name !== s.name))))); })),
      recipes: x.recipes.map(c => r(c.name, T("{n} bước", { n: I18n.num((c.steps || []).length) }), c.name, need(() => PowerTools.use(() => { const src = Docs.root(Views.activeDoc()); RecipeOp.set(src.id, c.steps); return OutputLink.run(src, "recipe"); })), json(c.steps),
        () => { if (sure(c.name)) PowerTools.use(() => report(RecipeOp.drop(c.name))); })),
    };
  }

  async function render() {
    if (!L.visible("library")) return;
    const my = ++gen, x = await data();
    if (my !== gen) return;
    const q = filter.value.trim().toLowerCase(), all = rows(x);
    const keep = list => q ? list.filter(r => (r.querySelector(".sx-hit").textContent + " " + r.querySelector(".sx-hit").title).toLowerCase().includes(q)) : list;
    const G = [["snippets", "Snippet của tôi"], ["built", x.lang ? T("Snippet có sẵn · {lang}", { lang: x.lang }) : ""], ["macros", "Macro"], ["sets", "Bộ thay hàng loạt"], ["recipes", "Recipe"]];
    const groups = G.filter(([k, label]) => label && all[k].length).map(([k, label]) => { const items = keep(all[k]); return items.length || !q ? L.group({ key: k, label: T(label), count: items.length, folded, items: items.length ? items : [L.empty(T("Trống."))] }) : null; }).filter(Boolean);
    const own = x.snippets.length + x.macros.length + x.sets.length + x.recipes.length;
    box.replaceChildren(...groups, ...(own ? [] : [L.empty(T("Thư viện trống. Lưu snippet (Palette “Snippet: lưu vùng chọn…”), macro (Alt+Shift+R rồi “Macro: lưu”), bộ thay hàng loạt hay recipe — chúng hiện ở đây; ⬆ để nhập từ file."))]));
  }

  async function exportFile() {
    const x = await data();
    Dom.download(MyLibrary.pack({ snippets: x.snippets, macros: Macro.list(), replaceSets: x.sets, recipes: x.recipes }), "one-editor-library.json", "application/json");
    StatusBar.msg(T("⬇ Đã xuất thư viện: {n} mục.", { n: I18n.num(x.snippets.length + x.macros.length + x.sets.length + x.recipes.length) }), "good");
  }

  async function importFile(file) {
    let inc;
    try {
      if (file.size > MyLibrary.MAX_BYTES) throw Object.assign(new Error("big"), { code: "big" });
      inc = MyLibrary.parse(await file.text());
    } catch (e) { StatusBar.msg(e.code === "big" ? T("File lớn hơn 5 MB — không nhập.") : T("File không phải thư viện One Editor (JSON version 1)."), "bad"); return; }
    const x = await data(), byName = i => i.name, old = { snip: x.snippets, mac: x.macros, sets: x.sets, rec: x.recipes };
    const n = MyLibrary.clashes(old.snip, inc.snippets, snipKey) + MyLibrary.clashes(old.mac, inc.macros, byName) + MyLibrary.clashes(old.sets, inc.replaceSets, byName) + MyLibrary.clashes(old.rec, inc.recipes, byName);
    const replace = n > 0 && confirm(T("{n} mục trùng tên với thư viện hiện có.\nOK = thay bằng bản trong file · Huỷ = giữ cả hai (thêm số vào tên).", { n }));
    const opt = (field, extra) => ({ key: byName, field, replace, ...extra });
    try {
      if (!(await Snippets.putAll(MyLibrary.merge(old.snip, inc.snippets, opt("prefix", { key: snipKey, sep: "" }))))) throw new Error(T("trình duyệt chặn IndexedDB"));
      await Macro.putAll(Object.fromEntries(MyLibrary.merge(old.mac, inc.macros, opt("name")).map(m => [m.name, m.steps])));
      if (inc.replaceSets.length || inc.recipes.length) await PowerTools.load().then(async () => {
        await BatchUi.putSets(MyLibrary.merge(await BatchUi.listSets(), inc.replaceSets, opt("name")));
        await RecipeOp.putAll(MyLibrary.merge(await RecipeOp.load(), inc.recipes, opt("name")));
      });
    } catch (e) { StatusBar.msg(T("Nhập thư viện bị ngắt: {msg}", { msg: e.message }), "bad"); render(); return; }
    StatusBar.msg(T("⬆ Đã nhập {n} mục vào thư viện.", { n: I18n.num(inc.snippets.length + inc.macros.length + inc.replaceSets.length + inc.recipes.length) }), "good");
    render();
  }

  function init() {
    const pickFile = $("lbFile");
    filter.addEventListener("input", L.later("library", render, 150));
    $("lbExport").onclick = exportFile;
    $("lbImport").onclick = () => pickFile.click();
    pickFile.onchange = () => { const f = pickFile.files[0]; pickFile.value = ""; if (f) importFile(f); };
    Views.onChange(L.later("library", render, 200));
    I18n.onChange(render);
    SidePanels.register("library", { show: (a, quiet) => { render(); if (!quiet && !L.coarse()) filter.focus(); } });
  }

  return { init, render, importFile };
})();
