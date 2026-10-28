// Textarea + line-number gutter that highlights error lines; draftKey keeps a localStorage draft; highlight() → kind paints syntax colors under the text.
function LineEditor(textarea, { draftKey = "", onChange = null, highlight = null } = {}) {
  const HL_LIMIT = 300 * 1024;
  const gut = document.createElement("pre");
  gut.className = "gut";
  textarea.before(gut);
  let bad = new Set(), paintedLines = -1, paintedBad = "", hl = null, hlFrame = 0;
  if (highlight) {
    const box = document.createElement("div");
    box.className = "hl-box";
    hl = document.createElement("pre");
    hl.className = "code hl";
    hl.setAttribute("aria-hidden", "true");
    textarea.before(box);
    box.append(hl, textarea);
  }

  function syncScroll() {
    gut.scrollTop = textarea.scrollTop;
    if (hl) { hl.scrollTop = textarea.scrollTop; hl.scrollLeft = textarea.scrollLeft; }
  }

  // Large texts fall back to plain textarea colors so typing stays responsive.
  function paintColors() {
    hlFrame = 0;
    const v = textarea.value, on = v.length <= HL_LIMIT;
    textarea.classList.toggle("hl-on", on);
    hl.innerHTML = on ? ViewRender.highlight(v, highlight()) : "";
    syncScroll();
  }
  const queueColors = () => { if (hl && !hlFrame) hlFrame = requestAnimationFrame(paintColors); };

  // Rebuilding up to 200k gutter lines is costly, so only repaint when line count or error set changes.
  function paint() {
    const n = Math.min(TextUtil.countLines(textarea.value), 200000), key = [...bad].join(",");
    if (n !== paintedLines || key !== paintedBad) {
      const parts = new Array(n);
      for (let i = 1; i <= n; i++) parts[i - 1] = bad.has(i) ? `<b>${i}</b>` : i;
      gut.innerHTML = parts.join("\n") + "\n";
      paintedLines = n; paintedBad = key;
    }
    gut.scrollTop = textarea.scrollTop;
    queueColors();
  }

  const saveDraft = Dom.debounce(() => {
    if (!draftKey) return;
    const v = textarea.value;
    if (v && v.length <= 1e6) Store.set("draft." + draftKey, v); else Store.del("draft." + draftKey);
  }, 600);
  const changed = Dom.debounce(() => { paint(); if (onChange) onChange(); }, 300);

  textarea.addEventListener("input", () => { changed(); saveDraft(); queueColors(); });
  textarea.addEventListener("scroll", syncScroll);
  if (draftKey && !textarea.value) textarea.value = Store.get("draft." + draftKey, "");
  paint();

  function set(text) { textarea.value = text; paint(); saveDraft(); }

  function jump(line) {
    const lines = textarea.value.split("\n");
    if (!line || line > lines.length) return;
    const start = lines.slice(0, line - 1).join("\n").length + (line > 1 ? 1 : 0);
    textarea.focus();
    textarea.setSelectionRange(start, start + lines[line - 1].length);
    textarea.scrollTop = Math.max(0, (line - 5) * parseFloat(getComputedStyle(textarea).lineHeight));
  }

  return {
    el: textarea,
    get value() { return textarea.value; },
    set,
    mark(lines) { bad = new Set(lines.filter(Boolean)); paint(); },
    refresh: queueColors,
    jump,
  };
}
