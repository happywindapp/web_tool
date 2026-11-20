// Copy as HTML / print, pure: text + highlight ranges → one <pre> with inline styles (mail and Word drop <style> blocks and classes).
const HtmlExport = (() => {
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const safeCss = v => String(v).replace(/[;"<>{}\\]/g, "");

  // HighlightStyle spec ({ tag, color, fontWeight, … }) → "color:#708;font-weight:bold"; non-style keys are dropped.
  function specCss(spec) {
    return Object.entries(spec).filter(([k, v]) => k !== "tag" && k !== "class" && /^[a-zA-Z]+$/.test(k) && (typeof v === "string" || typeof v === "number"))
      .map(([k, v]) => k.replace(/[A-Z]/g, c => "-" + c.toLowerCase()) + ":" + safeCss(v)).join(";");
  }

  // ranges: [{ from, to, style }] sorted, non-overlapping, relative to text; gaps stay plain.
  function build(text, ranges, { fg = "#1f2328", bg = "#ffffff", font = "Consolas, 'Cascadia Mono', monospace" } = {}) {
    let out = "", at = 0;
    for (const r of ranges) {
      const from = Math.max(r.from, at), to = Math.min(r.to, text.length);
      if (to <= from) continue;
      out += esc(text.slice(at, from));
      out += r.style ? '<span style="' + esc(r.style) + '">' + esc(text.slice(from, to)) + "</span>" : esc(text.slice(from, to));
      at = to;
    }
    out += esc(text.slice(at));
    const box = "margin:0;padding:8px 10px;white-space:pre-wrap;overflow-wrap:anywhere;font-family:" + safeCss(font) + ";font-size:13px;line-height:1.5;color:" + safeCss(fg) + ";background:" + safeCss(bg);
    return '<pre style="' + esc(box) + '"><code>' + out + "</code></pre>";
  }

  return { build, specCss, esc };
})();
