// Right-click / Menu key on a tab (or the empty tab strip = its active tab): the tab commands from the registry — rename, pin, move, clone, close.
const TabMenu = (() => {
  const IDS = ["renameTab", "pinTab", "pinItem", "moveTab", "cloneTab", "diskReload", "closeTab", "closeOthers", "closeRight"];
  let menu = null, back = null;
  // Focus goes back to where the menu was opened from (a folder tab row has no editor to fall back to).
  const restore = () => { const ok = back?.isConnected && back !== document.body && back.checkVisibility(); if (ok) back.focus({ preventScroll: true }); return ok; };

  const onDown = e => { if (menu && !menu.contains(e.target)) close(); };
  function close() {
    if (!menu) return;
    menu.remove();
    menu = null;
    document.removeEventListener("pointerdown", onDown, true);
    removeEventListener("resize", close);
    removeEventListener("blur", close);
  }

  function entry(label, keys, run) {
    const b = document.createElement("button"), name = document.createElement("span"), key = document.createElement("small");
    b.setAttribute("role", "menuitem");
    name.textContent = label;
    key.textContent = keys;
    b.append(name, key);
    b.onclick = () => { close(); restore(); run(); };
    return b;
  }
  const item = c => entry(typeof c.label === "function" ? c.label() : T(c.label), Commands.keyLabel(c), () => Commands.run(c.id));

  function onKey(e) {
    const items = [...menu.querySelectorAll("button")], k = items.indexOf(document.activeElement);
    if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); close(); if (!restore() && Views.activeDoc()) Views.activeView().focus(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(k + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
  }

  // The commands act on the focused view's active tab, so that tab is shown first.
  function open(gi, id, x, y) {
    close();
    Views.activate(gi, id, false);
    Views.focus(gi);
    const usable = Commands.all(), cmds = IDS.map(c => usable.find(u => u.id === c)).filter(Boolean);
    if (cmds.length) show(cmds.map(item), x, y);
  }

  // Shows a menu of nodes (entries, rows, separators) at x, y kept inside the window; the first button gets focus.
  function show(nodes, x, y) {
    close();
    back = document.activeElement;
    menu = document.createElement("div");
    menu.className = "tab-menu";
    menu.setAttribute("role", "menu");
    menu.append(...nodes);
    menu.addEventListener("keydown", onKey);
    document.body.append(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + "px";
    menu.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + "px";
    document.addEventListener("pointerdown", onDown, true);
    addEventListener("resize", close);
    addEventListener("blur", close);
    menu.querySelector("button").focus();
  }

  return { open, close, show, entry, item };
})();
