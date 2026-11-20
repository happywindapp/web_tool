// Hover a number or timestamp ⇒ tooltip with its conversions (epoch → UTC / local / relative, ISO date → epoch, hex ⇄ dec ⇄ bin). On by default, toggled from the Palette.
const NumHover = (() => {
  const TOKEN = /\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?|\b0x[\da-f]+\b|\b0b[01]+\b|\b\d+(?:\.\d+)?\b/gi;
  let ext = null;

  // The token covering offset off of a line (cursor right after it counts too).
  function tokenAt(text, off) {
    for (const m of text.matchAll(TOKEN)) if (m.index <= off && off <= m.index + m[0].length) return m;
    return null;
  }

  function render(info) {
    const box = document.createElement("div"), table = document.createElement("table");
    box.className = "oe-numhover";
    box.append(Object.assign(document.createElement("b"), { textContent: info.title }));
    for (const [k, val] of info.rows) {
      const tr = document.createElement("tr");
      tr.append(Object.assign(document.createElement("th"), { textContent: k }), Object.assign(document.createElement("td"), { textContent: val }));
      table.append(tr);
    }
    box.append(table);
    return box;
  }

  function extension() {
    return ext ??= CM.view.hoverTooltip((view, pos) => {
      const line = view.state.doc.lineAt(pos), g = Views.groups.find(x => x.view === view), d = g && Docs.get(g.active);
      if (line.length > 10000 || (d && Docs.effectiveLang(d) === "FIX")) return null;
      const m = tokenAt(line.text, pos - line.from), info = m && DevNum.describe(m[0]);
      if (!info) return null;
      return { pos: line.from + m.index, end: line.from + m.index + m[0].length, above: true, create: () => ({ dom: render(info) }) };
    }, { hoverTime: 350 });
  }

  return { tokenAt, render, extension };
})();
