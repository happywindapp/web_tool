// Approximate colouring for the overlay <pre> (no grammar): comments, strings, arrows, keywords of the active engine.
const Highlight = (() => {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const ARROW = String.raw`(?:<\|?|[ox*](?=[-=.]))?[-=.~]{2,}(?:\|?>{1,2}|[x)o*](?!\w))?|<?-+>{1,2}`;
  const cache = new Map();

  const tokenRe = comment => {
    if (!cache.has(comment)) cache.set(comment, new RegExp(`(${comment})|(^---[ \\t]*$)|("[^"\\n]*")|(${ARROW})|(!?@?[A-Za-z_]\\w*(?:-[A-Za-z0-9]+)*)`, "gm"));
    return cache.get(comment);
  };

  function html(text, { comment, keywords }) {
    let out = "", last = 0;
    for (const m of text.matchAll(tokenRe(comment))) {
      const cls = m[1] || m[2] ? "c" : m[3] ? "s" : m[4] ? "a" : keywords.has(m[5]) ? "k" : "";
      out += esc(text.slice(last, m.index)) + (cls ? `<span class="${cls}">${esc(m[0])}</span>` : esc(m[0]));
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  return { html, esc };
})();
