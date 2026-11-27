// Hover / keyboard-focus tooltip for the app bars (header, toolbar, view bar, activity bar, tab bar buttons, status bar): the title as a short note + live shortcuts of the data-cmd commands.
const HoverTips = (() => {
  const SCOPE = "header.top, body > .toolbar, #split, .activity, .gbar, .statusbar";
  const CTRL = "button, select, a, label, input, [role=separator]";
  const DELAY = 450, WARM = 700;
  let tip = null, cur = null, timer = 0, hiddenAt = 0;

  // The titled control under the pointer / focus inside a bar; tabs keep their own native title.
  function target(el) {
    const c = el?.closest?.(CTRL);
    if (!c || !c.closest(SCOPE) || c.closest(".tabs")) return null;
    const h = c.hasAttribute("title") || "tipTitle" in c.dataset ? c : c.closest("[title], [data-tip-title]");
    return h && h.closest(SCOPE) && !h.matches(SCOPE) ? h : null;
  }

  // The title moves to data-tip-title while hovered so the browser's own tooltip does not show on top.
  function stash(h) { if (h.hasAttribute("title")) { h.dataset.tipTitle = h.getAttribute("title"); h.removeAttribute("title"); } }
  function unstash(h) {
    if (!h || !("tipTitle" in h.dataset)) return;
    if (!h.hasAttribute("title")) h.setAttribute("title", h.dataset.tipTitle);
    delete h.dataset.tipTitle;
    h.removeAttribute("aria-describedby");
  }

  const norm = k => k.toLowerCase().split(" ").map(p => p.split("+").sort().join("+")).join(" ");
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text ?? "" });
  const label = c => typeof c.label === "function" ? c.label() : T(c.label);

  // Row names when one button has several commands: no (…) / “— …” tail; a prefix shared by all (“Compare: …”) is dropped, else only the prefix stays.
  function names(cmds) {
    const base = cmds.map(c => label(c).replace(/\s*\([^()]*\)/g, "").split(" — ")[0].trim());
    const pre = base.map(l => l.includes(": ") ? l.split(": ")[0] : "").filter(Boolean);
    const same = pre.length > 1 && new Set(pre).size === 1;
    const cap = l => l.charAt(0).toUpperCase() + l.slice(1);
    return base.map(l => !l.includes(": ") ? l : same ? cap(l.slice(l.indexOf(": ") + 2)) : l.split(": ")[0]);
  }

  // A "(…)" of the title is dropped when every key it names already shows in the shortcut rows.
  const KEY = /\b(?:Ctrl|Alt|Shift)\+[^\s,;:)\/]+(?: [A-Z0-9=→←↑↓](?=[\s,;:)\/]|$))?|\bF\d{1,2}\b/g;
  function note(raw, keys) {
    const known = new Set(keys.map(norm));
    return raw.replace(/\s*\(([^()]*)\)/g, (m, inner) => { const found = inner.match(KEY); return found && found.every(k => known.has(norm(k))) ? "" : m; }).trim();
  }

  function chord(key) {
    const s = el("span", "htip-chord");
    key.split(" ").forEach(p => s.append(el("kbd", "", p)));
    return s;
  }

  function fill(h) {
    const cmds = (h.dataset.cmd || "").split(/\s+/).map(id => Commands.find(id)).filter(c => c && c.keys.length);
    const keys = cmds.flatMap(c => Commands.keysOf(c.id));
    let text = note((h.dataset.tipTitle ?? h.getAttribute("title") ?? "").trim(), keys), own = [];
    // No command (editor keys like Ctrl+Z): a "(…)" made only of keys becomes the shortcut row.
    if (!cmds.length) text = text.replace(/\s*\(([^()]*)\)/, (m, inner) => {
      const parts = inner.split(/\s+\/\s+/);
      return parts.every(p => (p.match(KEY) || []).join() === p.trim()) ? (own = parts, "") : m;
    }).trim();
    if (!text && !keys.length) return false;
    const cut = text.indexOf(" — ");
    tip.replaceChildren(el("b", "", cut > 0 ? text.slice(0, cut) : text));
    if (cut > 0) tip.append(el("span", "htip-d", text.slice(cut + 3)));
    const rows = names(cmds);
    cmds.forEach((c, n) => {
      const row = el("span", "htip-k");
      if (cmds.length > 1) row.append(el("span", "htip-l", rows[n]));
      Commands.keysOf(c.id).slice(0, 2).forEach((k, i) => { if (i) row.append(el("span", "htip-or", "/")); row.append(chord(k)); });
      tip.append(row);
    });
    if (own.length) {
      const row = el("span", "htip-k");
      own.forEach((k, i) => { if (i) row.append(el("span", "htip-or", "/")); row.append(chord(k)); });
      tip.append(row);
    }
    return true;
  }

  // Beside the vertical bars (view bar, activity rail), below the others; flips and clamps to stay on screen.
  function place(h) {
    const r = h.getBoundingClientRect(), t = tip.getBoundingClientRect(), vw = innerWidth, vh = innerHeight, g = 6;
    const rail = h.closest("#split") || (h.closest(".activity") && getComputedStyle(h.closest(".activity")).flexDirection === "column");
    let x, y;
    if (rail) { x = r.right + g; if (x + t.width > vw - 4) x = r.left - g - t.width; y = r.top + (r.height - t.height) / 2; }
    else { y = r.bottom + g; if (y + t.height > vh - 4) y = r.top - g - t.height; x = r.left + (r.width - t.width) / 2; }
    tip.style.left = Math.round(Math.min(Math.max(4, x), vw - t.width - 4)) + "px";
    tip.style.top = Math.round(Math.min(Math.max(4, y), vh - t.height - 4)) + "px";
  }

  function show(h) {
    if (cur !== h || !h.isConnected || !h.getClientRects().length || !fill(h)) return hide();
    tip.hidden = false;
    h.setAttribute("aria-describedby", tip.id);
    place(h);
  }

  function hide() {
    clearTimeout(timer);
    if (!tip.hidden) hiddenAt = Date.now();
    tip.hidden = true;
    unstash(cur);
    cur = null;
  }

  // Right after another tip closed, the next one shows at once (moving along a bar).
  function later(h, now) {
    if (h === cur) return;
    hide();
    cur = h;
    stash(h);
    timer = setTimeout(() => show(h), now || Date.now() - hiddenAt < WARM ? 0 : DELAY);
  }

  function init() {
    tip = document.body.appendChild(Object.assign(el("div", "htip"), { id: "htip", hidden: true }));
    tip.setAttribute("role", "tooltip");
    document.addEventListener("pointerover", e => {
      if (e.pointerType === "touch") return;
      const h = target(e.target);
      if (h) later(h); else if (cur) hide();
    });
    document.addEventListener("pointerout", e => { if (!e.relatedTarget && cur) hide(); });
    for (const type of ["pointerdown", "keydown", "wheel"]) addEventListener(type, () => { if (cur) hide(); }, { capture: true, passive: true });
    // Only a scroll that moves the control (its bar, the page) closes the tip — not an editor or tab strip scrolling elsewhere.
    addEventListener("scroll", e => { if (cur && (e.target === document || e.target.contains?.(cur))) hide(); }, { capture: true, passive: true });
    addEventListener("blur", hide);
    document.addEventListener("focusin", e => { const h = e.target.matches?.(":focus-visible") && target(e.target); if (h) later(h, true); });
    document.addEventListener("focusout", e => { if (cur && cur.contains(e.target)) hide(); });
  }

  return { init, hide };
})();
