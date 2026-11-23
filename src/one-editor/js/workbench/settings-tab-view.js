// Settings tab (kind "settings", ⚙) like VS Code Settings: groups on the left (a strip on phones), a search box (Vietnamese / English), a switch · choice · number per entry, ● + ↺ when it differs from the default. Values live in the modules that own them (Settings registry); one tab at most.
const SettingsTab = (() => {
  let t = null, raf = 0;
  const { el, btn } = FolderRows;
  const visible = () => !!t && Views.groups.some(g => g.i < Views.count && g.active === t.doc.id);
  const groupName = g => T(Settings.GROUPS.find(x => x[0] === g)[1]);
  const save = () => { t.doc.pending = true; HotExit.schedule(); };

  function build(doc, s = {}) {
    t = { doc, group: Settings.GROUPS.some(g => g[0] === s.group) ? s.group : "explorer", q: typeof s.q === "string" ? s.q : "" };
    const ui = t.ui = { root: el("div", "fi st"), title: el("b", "tr-title"), q: el("input", "fi-find st-q"), nav: el("nav", "st-nav"), main: el("div", "st-main") };
    Object.assign(ui.q, { type: "search", spellcheck: false, autocomplete: "off", value: t.q });
    ui.q.oninput = () => { t.q = ui.q.value; save(); paint(); };
    ui.q.onkeydown = e => { if (e.key === "Escape" && ui.q.value) { e.preventDefault(); e.stopPropagation(); ui.q.value = t.q = ""; save(); paint(); } };
    const bar = el("div", "fi-bar"), body = el("div", "st-body");
    bar.append(ui.title, ui.q);
    body.append(ui.nav, ui.main);
    Object.assign(ui.root.dataset, { i18nSkip: "" });
    ui.root.hidden = true;
    ui.root.append(bar, body);
  }

  // A setter that loads a bundle (minimap, Vim) finishes later: the control waits, so a quick second click cannot land first.
  async function apply(e, c, v) {
    c.disabled = true;
    try { await Settings.set(e, v); } finally { c.disabled = false; }
    const now = e.get();
    if (c.type === "checkbox") c.checked = !!now; else c.value = String(now);
  }

  function control(e) {
    const label = T(e.label);
    if (e.type === "bool") {
      const wrap = el("label", "st-switch"), box = el("input");
      Object.assign(box, { type: "checkbox", onchange: () => apply(e, box, box.checked) });
      box.setAttribute("role", "switch");
      box.setAttribute("aria-label", label);
      wrap.append(box, el("span"));
      return wrap;
    }
    if (e.type === "choice") {
      const sel = el("select");
      sel.setAttribute("aria-label", label);
      sel.append(...e.choices().map(([v, text]) => Object.assign(el("option"), { value: v, textContent: text })));
      sel.onchange = () => apply(e, sel, sel.value);
      return sel;
    }
    if (e.type === "number") {
      const box = el("input", "st-num");
      Object.assign(box, { type: "number", min: e.min ?? "", max: e.max ?? "", step: 1, onchange: () => apply(e, box, box.value) });
      box.setAttribute("aria-label", label);
      return box;
    }
    const info = el("div", "st-info");
    info.append(el("span", "st-val"), ...(e.actions?.() || []).map(([text, run]) => btn("st-act", text, run)));
    return info;
  }

  function item(e) {
    const row = el("div", "st-item"), text = el("div", "st-text"), name = el("div", "st-name"), ctl = el("div", "st-ctl"), dot = el("span", "st-dot", "●");
    row.dataset.id = e.id;
    dot.title = T("Đã đổi khỏi mặc định");
    name.append(dot, el("b", "", T(e.label)));
    text.append(name, ...(e.hint ? [el("div", "st-hint", T(e.hint))] : []));
    ctl.append(control(e));
    if (Settings.hasDefault(e)) { const r = btn("st-reset", "↺", () => Settings.reset(e)); r.title = T("Về mặc định"); ctl.append(r); }
    row.append(text, ctl);
    return row;
  }

  function section(g, list, whole) {
    const head = el("div", "st-head");
    head.append(el("h3", "", groupName(g)));
    if (whole && list.some(Settings.hasDefault)) head.append(btn("st-act", "↺ " + T("Mặc định cả nhóm"), () => Settings.resetGroup(g)));
    return [head, ...list.map(item)];
  }

  function paint() {
    const { ui } = t, q = t.q.trim();
    ui.title.textContent = "⚙ " + T("Cài đặt");
    ui.q.placeholder = T("🔍 Tìm cài đặt (tiếng Việt / English)");
    ui.q.title = T("Tìm theo tên hoặc mô tả, bỏ dấu cũng được — Esc xoá");
    ui.nav.replaceChildren(...Settings.GROUPS.map(([g]) => {
      const b = btn("st-tab", groupName(g), () => { t.group = g; ui.q.value = t.q = ""; save(); paint(); ui.main.scrollTop = 0; });
      if (!q && g === t.group) b.setAttribute("aria-current", "page");
      return b;
    }));
    const found = q ? Settings.search(q, EnglishText) : null;
    const parts = found ? Settings.GROUPS.map(([g]) => [g, found.filter(e => e.group === g)]).filter(x => x[1].length) : [[t.group, Settings.inGroup(t.group)]];
    ui.main.replaceChildren(...parts.flatMap(([g, list]) => section(g, list, !found)));
    if (found && !found.length) ui.main.append(el("p", "fi-empty", T("Không có cài đặt khớp “{q}”.", { q })));
    values();
  }

  // Values in place (no rebuild): a change made in the old places (toolbar, Palette, View menu) shows here at once.
  function values() {
    raf = 0;
    if (!visible()) return;
    for (const row of t.ui.main.querySelectorAll(".st-item")) {
      const e = Settings.entry(row.dataset.id), c = row.querySelector(".st-val, input, select");
      row.classList.toggle("mod", !Settings.isDefault(e));
      Promise.resolve().then(() => e.get()).then(v => {
        if (e.type === "bool") c.checked = !!v;
        else if (e.type === "info") c.textContent = v ?? "";
        else if (document.activeElement !== c) c.value = String(v);
      }).catch(err => { if (e.type === "info") c.textContent = T("Không đọc được: {msg}", { msg: err.message }); });
    }
  }
  Settings.onChange(() => { if (visible() && !raf) raf = requestAnimationFrame(values); });

  // Called by Views.refresh after FolderItems.mount: the settings tab replaces the editor of its view.
  function mount(g) {
    // Two stored settings tabs (another window): the one dropped at restore may have been the one adopted.
    if (!t && Docs.get(g.active)?.kind === "settings") build(Docs.get(g.active));
    if (!t) return;
    if (g.active !== t.doc.id) { if (t.ui.root.parentNode === g.el) t.ui.root.hidden = true; return; }
    const shown = t.ui.root.parentNode === g.el && !t.ui.root.hidden;
    g.el.classList.add("is-folder");
    if (t.ui.root.parentNode !== g.el) g.el.append(t.ui.root);
    t.ui.root.hidden = false;
    if (shown) values(); else paint();
  }

  // group: the group to show (the folder tab's ⚙ opens Explorer); the search box gets focus on a keyboard device.
  function open(group = null, gi = Views.focused) {
    if (!t) build(Docs.create({ kind: "settings", name: T("Cài đặt"), readOnly: true }));
    if (group) { t.group = group; t.ui.q.value = t.q = ""; }
    const w = Views.where(t.doc.id);
    if (w >= 0) { Views.activate(w, t.doc.id); PhoneLayout.show(w + 1); paint(); } else { Views.open(t.doc, gi, true); PhoneLayout.show(gi + 1); }
    save();
    if (!matchMedia("(pointer:coarse)").matches) t.ui.q.focus();
  }

  Docs.on((type, doc) => { if (type === "remove" && t?.doc.id === doc.id) { t.ui.root.remove(); t = null; } });
  I18n.onChange(() => { if (visible()) paint(); });
  const saved = doc => (t && t.doc.id === doc.id ? { group: t.group, q: t.q } : null);
  return { open, mount, saved, adopt: (doc, s) => { if (!t) build(doc, s || {}); } };
})();
