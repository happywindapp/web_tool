// Code → image, pure: highlighted lines [[{ t, c, b, i }]] → one self-contained SVG string (window frame, line numbers, padding, background); themes map lezer classHighlighter classes to colours.
const CodeImage = (() => {
  const T5 = (bg, fg, gutter, tok) => ({ bg, fg, gutter, tok });
  const THEMES = {
    "one-dark": { label: "One Dark", ...T5("#282c34", "#abb2bf", "#636d83", { keyword: "#c678dd", string: "#98c379", string2: "#56b6c2", number: "#d19a66", bool: "#d19a66", atom: "#d19a66", literal: "#d19a66", comment: ["#7f848e", 0, 1],
      typeName: "#e5c07b", className: "#e5c07b", namespace: "#e5c07b", propertyName: "#e06c75", definition: "#61afef", operator: "#56b6c2", variableName2: "#e06c75", macroName: "#61afef", meta: "#7f848e", invalid: "#ff5555", heading: ["#e06c75", 1], link: "#61afef" }) },
    "github-light": { label: "GitHub Light", ...T5("#ffffff", "#24292f", "#8c959f", { keyword: "#cf222e", string: "#0a3069", string2: "#0a3069", number: "#0550ae", bool: "#0550ae", atom: "#0550ae", literal: "#0550ae", comment: ["#6e7781", 0, 1],
      typeName: "#953800", className: "#953800", namespace: "#953800", propertyName: "#0550ae", definition: "#8250df", operator: "#cf222e", variableName2: "#8250df", macroName: "#8250df", meta: "#6e7781", invalid: "#82071e", heading: ["#0550ae", 1], link: "#0a3069" }) },
    "solarized-light": { label: "Solarized Light", ...T5("#fdf6e3", "#657b83", "#93a1a1", { keyword: "#859900", string: "#2aa198", string2: "#2aa198", number: "#d33682", bool: "#d33682", atom: "#d33682", literal: "#d33682", comment: ["#93a1a1", 0, 1],
      typeName: "#b58900", className: "#b58900", namespace: "#b58900", propertyName: "#268bd2", definition: "#268bd2", operator: "#859900", variableName2: "#6c71c4", macroName: "#6c71c4", meta: "#cb4b16", invalid: "#dc322f", heading: ["#cb4b16", 1], link: "#268bd2" }) },
    "dracula": { label: "Dracula", ...T5("#282a36", "#f8f8f2", "#6272a4", { keyword: "#ff79c6", string: "#f1fa8c", string2: "#f1fa8c", number: "#bd93f9", bool: "#bd93f9", atom: "#bd93f9", literal: "#bd93f9", comment: ["#6272a4", 0, 1],
      typeName: ["#8be9fd", 0, 1], className: "#8be9fd", namespace: "#8be9fd", propertyName: "#50fa7b", definition: "#50fa7b", operator: "#ff79c6", variableName2: "#bd93f9", macroName: "#50fa7b", meta: "#6272a4", invalid: "#ff5555", heading: ["#bd93f9", 1], link: "#8be9fd" }) },
  };
  const BACKGROUNDS = { teal: ["#0e7490", "#22d3ee"], sunset: ["#f97316", "#db2777"], violet: ["#6366f1", "#a855f7"], slate: ["#cbd5e1", "#cbd5e1"], none: null };

  // "tok-variableName tok-definition" → the most specific colour the theme has: [colour, bold, italic].
  function style(theme, cls) {
    const names = cls.split(" ").map(c => c.replace(/^tok-/, "")).reverse();
    const hit = names.map(n => theme.tok[n]).find(Boolean);
    return hit ? [].concat(hit) : null;
  }

  // XML 1.0 forbids C0 controls (ESC of ANSI logs, form feed…): shown as control pictures (U+2400 + code).
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]))
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, c => String.fromCharCode(0x2400 + c.charCodeAt(0))).replace(/\p{Noncharacter_Code_Point}/gu, String.fromCharCode(0xfffd));
  const FONT = "Consolas, 'Cascadia Mono', 'Courier New', monospace";

  // lines: [[{ t, c?, b?, i? }]]; o: { theme: { bg, fg, gutter }, bg: [c1, c2] | null, frame, numbers, pad, title, first, size, charW, width(s) }.
  function svg(lines, o) {
    const size = o.size || 14, lh = Math.round(size * 1.5), cw = o.charW || size * 0.6, width = o.width || (s => s.length), pad = o.pad ?? 32;
    const cols = Math.max(20, o.frame && o.title ? width(o.title) + 12 : 0, ...lines.map(l => width(l.map(x => x.t).join(""))));
    const last = (o.first || 1) + lines.length - 1, gut = o.numbers ? (String(last).length + 2) * cw : 0, inner = 16, bar = o.frame ? 36 : 0;
    const winW = Math.ceil(gut + inner * 2 + cols * cw), winH = Math.ceil(bar + inner * 2 + lines.length * lh), W = winW + pad * 2, H = winH + pad * 2;
    const th = o.theme, out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" font-family="' + esc(FONT) + '" font-size="' + size + '">');
    if (o.bg) out.push('<defs><linearGradient id="' + (o.id || "bg") + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + o.bg[0] + '"/><stop offset="1" stop-color="' + o.bg[1] + '"/></linearGradient></defs><rect width="' + W + '" height="' + H + '" fill="url(#' + (o.id || "bg") + ')"/>');
    out.push('<rect x="' + pad + '" y="' + pad + '" width="' + winW + '" height="' + winH + '" rx="10" fill="' + th.bg + '"' + (o.bg ? ' stroke="rgba(0,0,0,.15)"' : "") + "/>");
    if (o.frame) {
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, k) => out.push('<circle cx="' + (pad + 20 + k * 20) + '" cy="' + (pad + 18) + '" r="6" fill="' + c + '"/>'));
      if (o.title) out.push('<text x="' + (pad + winW / 2) + '" y="' + (pad + 22) + '" text-anchor="middle" fill="' + th.gutter + '" font-size="' + (size - 1) + '">' + esc(o.title) + "</text>");
    }
    const x0 = pad + inner + gut, y0 = pad + bar + inner;
    lines.forEach((line, k) => {
      const y = Math.round(y0 + k * lh + size);
      if (o.numbers) out.push('<text x="' + (pad + inner + gut - cw) + '" y="' + y + '" text-anchor="end" fill="' + th.gutter + '">' + ((o.first || 1) + k) + "</text>");
      const spans = line.filter(x => x.t).map(x => "<tspan" + ' fill="' + esc(x.c || th.fg) + '"' + (x.b ? ' font-weight="bold"' : "") + (x.i ? ' font-style="italic"' : "") + ">" + esc(x.t) + "</tspan>").join("");
      if (spans) out.push('<text x="' + x0 + '" y="' + y + '" xml:space="preserve" style="white-space:pre">' + spans + "</text>");
    });
    out.push("</svg>");
    return { svg: out.join("\n") + "\n", w: W, h: H };
  }

  return { THEMES, BACKGROUNDS, style, svg };
})();
