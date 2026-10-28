// Paste box colouring: a <pre> under a transparent-text <textarea> shows tag=value pairs coloured; holding Alt lets the mouse reach the pairs for the tag tooltip.
const InputView = (() => {
  const LIMIT = 300000;
  let ta = null, pre = null, box = null;
  const esc = s => Dom.esc(s);

  const enabled = () => ta.value.length <= LIMIT;
  const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
  // While typing: plain text at once so nothing is invisible; colours come back with the next parse.
  function plain() {
    box.classList.toggle("hl-on", enabled());
    if (enabled()) { pre.textContent = ta.value + "\n"; sync(); }
  }

  // msgs: analysed messages (line, raw, delim) in input order; data-m/data-f point back to them for the tooltip.
  function paint(msgs) {
    box.classList.toggle("hl-on", enabled());
    if (!enabled()) { pre.textContent = ""; return; }
    const byLine = new Map();
    msgs.forEach((m, i) => { if (!byLine.has(m.line)) byLine.set(m.line, []); byLine.get(m.line).push(i); });
    pre.innerHTML = ta.value.split("\n").map((line, n) => {
      const list = byLine.get(n + 1);
      if (!list) return `<span class="hl-x">${esc(line)}</span>`;
      let out = "", pos = 0;
      for (const i of list) {
        const m = msgs[i], at = line.indexOf(m.raw, pos);
        if (at < 0) continue;
        out += `<span class="hl-x">${esc(line.slice(pos, at))}</span>`;
        const parts = m.delim ? m.raw.split(m.delim) : [m.raw];
        out += parts.map((p, k) => {
          const eq = p.indexOf("="), tag = eq > 0 ? p.slice(0, eq) : "";
          const cell = /^\d+$/.test(tag) ? `<span class="hl-f" data-m="${i}" data-f="${k}"><span class="tn">${esc(tag)}</span>=<span class="av">${esc(p.slice(eq + 1))}</span></span>` : (p ? `<span class="bad">${esc(p)}</span>` : "");
          return (k ? `<span class="hl-d">${esc(m.delim)}</span>` : "") + cell;
        }).join("");
        pos = at + m.raw.length;
      }
      return out + `<span class="hl-x">${esc(line.slice(pos))}</span>`;
    }).join("\n") + "\n";
    sync();
  }

  // resolve(msgIndex, fieldIndex) → tooltip HTML.
  function init(resolve) {
    ta = $("src"); pre = $("srcHl"); box = ta.parentElement;
    ta.addEventListener("scroll", sync);
    ta.addEventListener("input", plain);
    const probe = on => pre.classList.toggle("probe", on && box.classList.contains("hl-on"));
    document.addEventListener("keydown", e => { if (e.key === "Alt") probe(true); });
    document.addEventListener("keyup", e => { if (e.key === "Alt") probe(false); });
    window.addEventListener("blur", () => probe(false));
    TagInfo.bind(pre, el => resolve(+el.dataset.m, +el.dataset.f), "span.hl-f");
  }

  return { init, paint };
})();
