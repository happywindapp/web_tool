// Batch replace dialog: rule table (on / find / replace / regex / Aa / word), run on the selection or the whole tab in one undo step, named sets in IndexedDB meta "replaceSets".
const BatchUi = (() => {
  const MAX_SETS = 100, { mk, button } = PowerUi;
  let dlg = null, rows = null, sets = [], setSel = null, result = null, target = null, loaded = null;
  let rules = BatchRules.clean(Prefs.get("batchrep", null) || [BatchRules.blank()]);
  const keep = () => Prefs.set("batchrep", rules);

  const loadSets = () => loaded ??= NotesDb.getMeta("replaceSets").then(v => { sets = (Array.isArray(v) ? v : []).filter(s => s && typeof s.name === "string").map(s => ({ name: s.name.slice(0, 80), rules: BatchRules.clean(s.rules) })); }, () => { sets = []; });
  const storeSets = () => NotesDb.putMeta("replaceSets", sets).then(ok => ok || Promise.reject(new Error(T("trình duyệt chặn IndexedDB"))));

  function drawRules(counts = []) {
    rows.replaceChildren(...rules.map((r, i) => {
      const row = mk("div", "br-row" + (r.on ? "" : " off"));
      const chk = (key, label, title) => { const l = mk("label", "chk", null, { title }), c = mk("input", "", null, { type: "checkbox", checked: r[key] }); c.onchange = () => { r[key] = c.checked; keep(); drawRules(); }; l.append(c, label); return l; };
      const box = (key, ph) => { const x = mk("input", "br-in", null, { type: "text", value: r[key], placeholder: ph, spellcheck: false, autocomplete: "off" }); x.oninput = () => { r[key] = x.value; keep(); }; return x; };
      const n = counts[i], badge = mk("span", "br-n", n == null ? "" : "×" + I18n.num(n));
      row.append(chk("on", "", T("Bật / tắt dòng này")), box("find", T("tìm")), mk("span", "br-arrow", "→"), box("repl", T("thay bằng")),
        chk("regex", ".*", "Regex ($1, $<name>, \\n)"), chk("matchCase", "Aa", T("Phân biệt hoa / thường")), chk("word", "W", T("Nguyên từ")), badge,
        button("✖", () => { rules.splice(i, 1); if (!rules.length) rules.push(BatchRules.blank()); keep(); drawRules(); }, T("Xoá dòng")));
      return row;
    }));
  }

  function drawSets() {
    setSel.replaceChildren(mk("option", "", T("Bộ đã lưu…"), { value: "" }), ...sets.map((s, i) => mk("option", "", s.name + " (" + s.rules.length + ")", { value: String(i) })));
  }

  async function saveSet() {
    const name = (prompt(T("Tên bộ thay thế:"), setSel.selectedIndex > 0 ? sets[+setSel.value].name : "") || "").trim().slice(0, 80);
    if (!name) return;
    const at = sets.findIndex(s => s.name === name);
    if (at < 0 && sets.length >= MAX_SETS) { StatusBar.msg(T("Đã đủ {n} bộ — xoá bớt trước.", { n: MAX_SETS }), "warn"); return; }
    const set = { name, rules: rules.map(r => ({ ...r })) };
    if (at >= 0) sets[at] = set; else sets.push(set);
    try { await storeSets(); drawSets(); setSel.value = String(at >= 0 ? at : sets.length - 1); result.textContent = T("✔ Đã lưu bộ “{name}”.", { name }); }
    catch (e) { result.textContent = T("Không lưu được bộ: {msg}", { msg: e.message }); }
  }

  async function dropSet() {
    if (!setSel.value) return;
    const s = sets[+setSel.value];
    if (!confirm(T("Xoá bộ “{name}”?", { name: s.name }))) return;
    sets.splice(+setSel.value, 1);
    try { await storeSets(); } catch (e) { result.textContent = T("Không lưu được bộ: {msg}", { msg: e.message }); }
    drawSets();
  }

  // Each selection range on its own (rules in order inside it); no selection = the whole tab.
  function run() {
    const src = Docs.get(target), v = src && PowerUi.viewOf(src);
    if (!v) return;
    const st = v.state, ranges = st.selection.ranges.filter(r => !r.empty), parts = ranges.length ? ranges : [{ from: 0, to: st.doc.length }];
    const total = rules.map(() => null), changes = [], errors = new Map();
    for (const r of parts) {
      const res = BatchRules.apply(st.sliceDoc(r.from, r.to), rules);
      res.counts.forEach((n, i) => { if (n != null) total[i] = (total[i] || 0) + n; });
      res.errors.forEach(e => errors.set(e.i, e.message));
      if (res.total) { const d = BatchRules.diff(st.sliceDoc(r.from, r.to), res.text); changes.push({ from: r.from + d.from, to: r.from + d.to, insert: d.insert }); }
    }
    drawRules(total);
    const n = total.reduce((a, b) => a + (b || 0), 0), where = ranges.length ? T("vùng chọn") : T("cả tab");
    const errText = [...errors].map(([i, m]) => T("dòng {i}: {msg}", { i: i + 1, msg: m })).join(" · ");
    if (n && !st.readOnly) v.dispatch({ changes, userEvent: "input.transform" });
    result.textContent = (st.readOnly && n ? T("Tab chỉ đọc — không đổi được.") : T("✔ Đã thay {n} chỗ trong {where}", { n: I18n.num(n), where }) + (n ? " — " + T("Ctrl+Z để hoàn tác.") : ".")) + (errText ? " ✖ " + errText : "");
    StatusBar.msg(result.textContent, errText ? "warn" : n ? "good" : "");
  }

  function build() {
    dlg = mk("dialog", "qp br-dlg", null, { "aria-label": T("Thay hàng loạt") });
    const head = mk("div", "br-head"), foot = mk("div", "br-foot");
    setSel = mk("select", "", null, { title: T("Mở bộ thay thế đã lưu") });
    setSel.onchange = () => { if (setSel.value) { rules = sets[+setSel.value].rules.map(r => ({ ...r })); keep(); drawRules(); } };
    head.append(mk("b", "", T("Thay hàng loạt")), setSel, button(T("💾 Lưu bộ"), saveSet, T("Lưu các dòng này thành bộ có tên (IndexedDB)")), button("🗑", dropSet, T("Xoá bộ đang chọn")));
    rows = mk("div", "br-rows");
    result = mk("p", "br-result", "", { "data-i18n-skip": "" });
    const go = Object.assign(button(T("▶ Thay"), run, T("Chạy các dòng đang bật theo thứ tự — trên vùng chọn nếu có, không thì cả tab")), { className: "main" });
    foot.append(button(T("+ Thêm dòng"), () => { rules.push(BatchRules.blank()); keep(); drawRules(); }), mk("span", "muted", T("Phạm vi: vùng chọn nếu có, không thì cả tab.")), go, button(T("Đóng"), () => dlg.close()));
    dlg.append(head, rows, result, foot);
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }

  // preset: rules to show (demo); otherwise the last rules used.
  async function open(preset) {
    const d = Views.activeDoc();
    if (!d) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return; }
    target = Docs.root(d).id;
    if (!dlg) build();
    if (preset) { rules = BatchRules.clean(preset); keep(); }
    await loadSets();
    drawSets();
    drawRules();
    result.textContent = T("Tab: {name}", { name: Docs.root(d).name });
    if (!dlg.open) dlg.showModal();
  }

  // Labels are built in the UI language: rebuilt (and reopened) when it changes.
  I18n.onChange(() => { if (!dlg) return; const was = dlg.open; dlg.remove(); dlg = null; if (was) open(); });
  // My library: the saved sets, replaced whole (import / delete).
  const listSets = () => loadSets().then(() => sets);
  async function putSets(list) { await loadSets(); const was = sets; sets = list.map(s => ({ name: String(s.name).slice(0, 80), rules: BatchRules.clean(s.rules) })).slice(0, MAX_SETS); try { await storeSets(); } catch (e) { sets = was; throw e; } if (dlg) drawSets(); }
  return { open, run, listSets, putSets };
})();
