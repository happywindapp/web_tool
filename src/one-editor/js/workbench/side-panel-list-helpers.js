// Shared builders for side panel lists: foldable file groups (details.sx-file), rows with hover actions, empty note, debounced redraw while the panel shows.
const SidePanelList = (() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function act(text, title, fn) {
    const b = el("button", "ex-act", text);
    b.type = "button";
    b.title = title;
    b.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(e); };
    return b;
  }

  // content: string or nodes for the main button; acts: buttons shown on hover / always on touch.
  function row(content, { title = "", onclick, acts = [], cls = "" } = {}) {
    const r = el("div", "ex-row"), b = el("button", "ex-item sx-hit" + (cls ? " " + cls : "")), a = el("span", "ex-acts");
    b.type = "button";
    b.append(...[].concat(content));
    b.title = title;
    if (onclick) b.onclick = onclick;
    a.append(...acts);
    r.append(b, a);
    return r;
  }

  // folded: Set of keys the user collapsed, kept across redraws.
  function group({ key, label, path = "", count, acts = [], title, items, folded, cls = "" }) {
    const d = el("details", "sx-file" + (cls ? " " + cls : "")), s = el("summary");
    s.append(el("span", "sx-doc", label), el("small", "sx-path", path), el("span", "sx-n", typeof count === "number" ? I18n.num(count) : count), ...acts);
    s.title = title || label;
    d.open = !folded.has(key);
    d.addEventListener("toggle", () => { if (d.open) folded.delete(key); else folded.add(key); });
    d.append(s, ...items);
    return d;
  }

  const empty = text => el("p", "ex-empty", text);
  // Phones ignore the collapsed side bar (carousel).
  const collapsed = () => document.body.classList.contains("no-explorer") && !matchMedia("(max-width: 640px)").matches;
  const visible = name => !collapsed() && !document.querySelector(`[data-side-panel="${name}"]`).hidden;

  // Redraw at most every ms while the panel is on screen; hidden panels redraw when shown.
  function later(name, fn, ms = 300) {
    let t = 0;
    return () => { if (!visible(name)) return; clearTimeout(t); t = setTimeout(fn, ms); };
  }

  const coarse = () => matchMedia("(pointer: coarse)").matches;

  return { el, act, row, group, empty, visible, later, coarse, collapsed };
})();
