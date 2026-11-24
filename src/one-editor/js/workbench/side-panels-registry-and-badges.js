// Activity bar: side panel registry (show / toggle / remember), badges on the icons, ⚙ 🗑 buttons at the bottom, roving tabindex (rail ↑↓ above 900 px, strip ←→ below).
const SidePanels = (() => {
  const reg = new Map(), badges = new Map();
  const nav = document.querySelector(".activity");
  const btn = name => nav.querySelector(`[data-side="${name}"]`);
  const buttons = () => [...nav.querySelectorAll("button:not([hidden])")];
  const rail = () => matchMedia("(min-width: 901px)").matches && !matchMedia("(max-height: 500px) and (pointer: coarse)").matches;
  const phone = () => matchMedia("(max-width: 640px)").matches;
  let cur = "explorer";

  const register = (name, panel) => reg.set(name, panel);
  const visible = name => cur === name && !SidePanelList.collapsed() && !document.querySelector(`[data-side-panel="${name}"]`).hidden;

  // Keeps the chosen icon inside the scrolling strip without scrollIntoView (that would drag the phone carousel).
  function keepInView(b) {
    if (rail() || !b) return;
    const l = b.offsetLeft - nav.offsetLeft, r = l + b.offsetWidth;
    if (l < nav.scrollLeft) nav.scrollLeft = l;
    else if (r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = r - nav.clientWidth;
  }

  // quiet: restoring after F5 — no focus, no carousel jump, a hidden side bar stays hidden.
  function show(name, arg, quiet = false) {
    if (!btn(name) || !document.querySelector(`[data-side-panel="${name}"]`)) name = "explorer";
    cur = name;
    nav.querySelectorAll("[data-side]").forEach(b => { const on = b.dataset.side === name; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    document.querySelectorAll("[data-side-panel]").forEach(p => { p.hidden = p.dataset.sidePanel !== name; });
    roving(btn(name));
    keepInView(btn(name));
    if (!quiet) {
      if (document.body.classList.contains("no-explorer")) { document.body.classList.remove("no-explorer"); Prefs.set("explorer", true); }
      PhoneLayout.show(0);
      if (Prefs.get("side", "explorer") !== name) Prefs.set("side", name);
    }
    const p = reg.get(name);
    if (p && p.show) p.show(arg, quiet);
    reg.forEach((q, k) => { if (k !== name && q.hide) q.hide(); });
  }

  // Clicking the open panel's icon hides the side bar (VS Code); phones keep the pane carousel, where hiding does nothing.
  function toggle(name) {
    const open = !document.body.classList.contains("no-explorer") && cur === name;
    if (!open || phone()) { show(name); return; }
    document.body.classList.add("no-explorer");
    Prefs.set("explorer", false);
    collapsed();
  }

  // Side bar hidden (icon click, Ctrl+B) or shown again: the open panel stops / resumes its work.
  function collapsed() {
    const off = SidePanelList.collapsed(), p = reg.get(cur), b = btn(cur);
    if (b) b.setAttribute("aria-pressed", String(!off));
    if (off) { if (p && p.hide) p.hide(); }
    else if (p && p.show) p.show(undefined, true);
  }

  function label(b) {
    const n = badges.get(b.dataset.side || b.dataset.act);
    b.setAttribute("aria-label", b.title.split(" — ")[0] + (n && n.n ? " — " + (n.tip || I18n.num(n.n)) : ""));
  }

  // n = 0 hides the badge; tip goes on the badge and into the icon's accessible name.
  function badge(name, n, tip = "") {
    const b = btn(name) || nav.querySelector(`[data-act="${name}"]`);
    if (!b) return;
    badges.set(name, { n, tip });
    let s = b.querySelector(".act-badge");
    if (!n) { if (s) s.remove(); label(b); return; }
    if (!s) { s = document.createElement("span"); s.className = "act-badge"; b.append(s); }
    s.textContent = n > 99 ? "99+" : I18n.num(n);
    s.title = tip || "";
    label(b);
  }

  function roving(on) {
    const all = buttons(), cur = on && all.includes(on) ? on : all.find(b => b.classList.contains("on")) || all[0];
    all.forEach(b => { b.tabIndex = b === cur ? 0 : -1; });
  }

  function key(e) {
    const all = buttons(), i = all.indexOf(document.activeElement), v = rail();
    if (i < 0) return;
    const step = { ArrowDown: v ? 1 : 0, ArrowUp: v ? -1 : 0, ArrowRight: v ? 0 : 1, ArrowLeft: v ? 0 : -1 }[e.key];
    let j = step ? (i + step + all.length) % all.length : e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    roving(all[j]);
    all[j].focus();
    keepInView(all[j]);
  }

  function orient() { nav.setAttribute("aria-orientation", rail() ? "vertical" : "horizontal"); }

  function trash() {
    const s = TrashStore.summary(), n = s ? s.n : 0, b = nav.querySelector('[data-act="trash"]');
    b.hidden = !n;
    badge("trash", n, n ? T("{n} mục trong thùng rác", { n: I18n.num(n) }) : "");
    roving();
  }

  function init() {
    nav.querySelectorAll("[data-side]").forEach(b => { b.onclick = () => toggle(b.dataset.side); });
    nav.querySelector('[data-act="settings"]').onclick = () => SettingsTab.open();
    nav.querySelector('[data-act="trash"]').onclick = () => TrashTab.open();
    nav.addEventListener("keydown", key);
    nav.addEventListener("focusin", e => { if (e.target.matches("button")) roving(e.target); });
    // The shared I18n translates title / placeholder only, not aria-label.
    const relabel = () => { nav.setAttribute("aria-label", T("Thanh hoạt động")); nav.querySelectorAll("button").forEach(label); badges.forEach((v, k) => badge(k, v.n, v.tip)); };
    relabel();
    I18n.onChange(() => { relabel(); trash(); });
    ["(min-width: 901px)", "(max-height: 500px) and (pointer: coarse)"].forEach(q => matchMedia(q).addEventListener("change", () => { orient(); keepInView(btn(cur)); }));
    orient();
    TrashStore.onChange(trash);
    trash();
    show(Prefs.get("side", "explorer"), undefined, true);
    if (SidePanelList.collapsed()) collapsed();
  }

  return { init, register, show, toggle, collapsed, badge, visible, get current() { return cur; } };
})();
