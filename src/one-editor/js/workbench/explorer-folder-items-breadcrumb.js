// Folder tab address bar as Windows 11 breadcrumbs: a button per folder, › lists its subfolders, « holds the ones that do not fit; a click on the empty part (or Ctrl+L / Alt+D / F4) edits the path as text.
const FolderCrumbs = (() => {
  const btn = (cls, text, run) => { const b = document.createElement("button"); Object.assign(b, { type: "button", className: cls, textContent: text, onclick: run }); return b; };
  const head = text => Object.assign(document.createElement("div"), { className: "menu-head", textContent: text });
  const at = b => { const r = b.getBoundingClientRect(); return [r.left, r.bottom + 2]; };

  // nav: { go(path), dirs(path) → Promise<folder nodes> }; ui.addr is the existing path input.
  function build(t, nav) {
    const wrap = document.createElement("div"), crumbs = document.createElement("div"), addr = t.ui.addr;
    Object.assign(addr, { type: "text", spellcheck: false, autocomplete: "off" });
    addr.onkeydown = e => {
      if (e.key === "Enter") { e.preventDefault(); nav.go(addr.value); }
      else if (e.key === "Escape") { addr.value = t.path; addr.select(); }
    };
    // First click selects the whole path (the mouseup would otherwise drop the selection), like the Windows address bar.
    let fresh = false;
    addr.onfocus = () => { fresh = true; addr.select(); };
    addr.onmouseup = e => { if (fresh) e.preventDefault(); fresh = false; };
    addr.addEventListener("keydown", () => { fresh = false; });
    addr.onblur = () => { addr.value = t.path; };
    wrap.className = "fi-path";
    crumbs.className = "fi-crumbs";
    crumbs.onclick = e => { if (e.target === crumbs) edit(t); };
    t.ui.addr.addEventListener("blur", () => wrap.classList.remove("edit"));
    wrap.append(crumbs, t.ui.addr);
    Object.assign(t.ui, { path: wrap, crumbs });
    t.nav = nav;
    new ResizeObserver(() => fit(t)).observe(wrap);
    return wrap;
  }

  function edit(t) {
    t.ui.path.classList.add("edit");
    t.ui.addr.focus();
  }

  async function sub(t, path, b) {
    const dirs = await t.nav.dirs(path).catch(() => []);
    TabMenu.show(dirs.length ? dirs.map(d => TabMenu.entry("📁 " + d.name, "", () => t.nav.go(d.path))) : [head(T("Không có folder con."))], ...at(b));
  }
  function above(t, b) {
    const segs = t.path.split("/"), n = t.hiddenCrumbs || 0;
    TabMenu.show(segs.slice(0, n).map((name, k) => TabMenu.entry("📁 " + name, "", () => t.nav.go(segs.slice(0, k + 1).join("/")))).reverse(), ...at(b));
  }

  function render(t) {
    const c = t.ui.crumbs;
    if (!c) return;
    const segs = t.path.split("/"), more = btn("fi-sep fi-more", "«", e => above(t, e.currentTarget));
    more.title = T("Các folder phía trên");
    const parts = segs.flatMap((name, k) => {
      const p = segs.slice(0, k + 1).join("/"), b = btn("fi-crumb" + (k === segs.length - 1 ? " cur" : ""), name, () => t.nav.go(p)), s = btn("fi-sep", "›", e => sub(t, p, e.currentTarget));
      b.title = p;
      s.title = T("Folder con của “{name}”", { name });
      return [b, s];
    });
    c.replaceChildren(more, ...parts);
    c.setAttribute("aria-label", T("Đường dẫn folder"));
    fit(t);
  }

  // Leading folders fold into « until the rest fits (the current folder always stays).
  function fit(t) {
    const c = t.ui.crumbs;
    if (!c?.clientWidth) return;
    const items = [...c.querySelectorAll(".fi-crumb, .fi-sep:not(.fi-more)")], more = c.querySelector(".fi-more");
    if (!more) return;
    items.forEach(x => { x.hidden = false; });
    more.hidden = true;
    let k = 0;
    while (c.scrollWidth > c.clientWidth && k < items.length / 2 - 1) { items[2 * k].hidden = items[2 * k + 1].hidden = true; more.hidden = false; k++; }
    t.hiddenCrumbs = k;
  }

  function hotkey(t, e) {
    const k = e.key.toLowerCase(), only = (ctrl, alt) => !!(e.ctrlKey || e.metaKey) === ctrl && e.altKey === alt && !e.shiftKey;
    if ((only(true, false) && k === "l") || (only(false, true) && k === "d") || (e.key === "F4" && only(false, false))) { edit(t); return true; }
    return false;
  }

  return { build, render, edit, hotkey };
})();
