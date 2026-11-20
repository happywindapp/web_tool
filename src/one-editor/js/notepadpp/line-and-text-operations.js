// Notepad++ line operations (on whole lines) and text transforms (on the selection): sort, dedupe, trim, tabs ↔ spaces, case styles, Base64 / URL / HTML entities, column numbers.
const LineOps = (() => {
  const coll = new Intl.Collator(undefined, { sensitivity: "variant" }), ci = new Intl.Collator(undefined, { sensitivity: "base" });
  const num = s => { const m = /-?\d+(?:[.,]\d+)?/.exec(s); return m ? parseFloat(m[0].replace(",", ".")) : NaN; };
  const TAB = String.fromCharCode(9);
  const lead = (s, fn) => s.replace(/^[\t ]+/, fn);
  function expand(ws, n) {
    let col = 0, out = "";
    for (const c of ws) { const k = c === TAB ? n - col % n : 1; out += " ".repeat(k); col += k; }
    return out;
  }

  const LINES = {
    sortAsc: l => [...l].sort(coll.compare),
    sortDesc: l => [...l].sort((a, b) => coll.compare(b, a)),
    sortCi: l => [...l].sort((a, b) => ci.compare(a, b) || coll.compare(a, b)),
    sortNum: l => [...l].sort((a, b) => { const x = num(a), y = num(b); return (isNaN(x) - isNaN(y)) || (x - y) || coll.compare(a, b); }),
    sortLen: l => [...l].sort((a, b) => a.length - b.length || coll.compare(a, b)),
    unique: l => [...new Set(l)],
    uniqueCi: l => { const seen = new Set(); return l.filter(s => { const k = s.toLocaleLowerCase(); return !seen.has(k) && seen.add(k); }); },
    removeEmpty: l => l.filter(s => s.trim()),
    reverse: l => [...l].reverse(),
    join: l => [l.map((s, i) => i ? s.trim() : s.trimEnd()).filter((s, i) => !i || s).join(" ")],
    split: (l, sep) => sep ? l.flatMap(s => s.split(sep)) : l,
    trimEnd: l => l.map(s => s.trimEnd()),
    trimStart: l => l.map(s => s.trimStart()),
    tabsToSpaces: (l, n = 4) => l.map(s => lead(s, ws => expand(ws, n))),
    spacesToTabs: (l, n = 4) => l.map(s => lead(s, ws => { const w = expand(ws, n).length; return TAB.repeat(Math.floor(w / n)) + " ".repeat(w % n); })),
  };

  const words = s => s.split(/[^\p{L}\p{N}]+|(?<=[\p{Ll}\p{N}])(?=\p{Lu})/u).filter(Boolean);
  const cap = w => w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase();
  const perLine = fn => t => t.split("\n").map(fn).join("\n");
  const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: String.fromCharCode(160) };
  function b64(t) {
    const b = new TextEncoder().encode(t);
    let s = "";
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(t) {
    let bin;
    try { bin = atob(t.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")); } catch { throw new Error(T("Không phải Base64 hợp lệ.")); }
    try { return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, c => c.charCodeAt(0))); } catch { throw new Error(T("Base64 giải ra không phải văn bản UTF-8.")); }
  }

  const TEXT = {
    upper: t => t.toLocaleUpperCase(),
    lower: t => t.toLocaleLowerCase(),
    title: t => t.replace(/\p{L}[\p{L}\p{N}']*/gu, cap),
    camel: perLine(s => words(s).map((w, i) => i ? cap(w) : w.toLocaleLowerCase()).join("")),
    pascal: perLine(s => words(s).map(cap).join("")),
    snake: perLine(s => words(s).map(w => w.toLocaleLowerCase()).join("_")),
    kebab: perLine(s => words(s).map(w => w.toLocaleLowerCase()).join("-")),
    b64enc: b64,
    b64dec: unb64,
    urlEnc: t => encodeURIComponent(t),
    urlDec: t => { try { return decodeURIComponent(t.replace(/\+/g, " ")); } catch { throw new Error(T("Chuỗi URL-encode bị lỗi (dấu % không hợp lệ).")); } },
    htmlEnc: t => t.replace(/[&<>"']/g, c => ENTITIES[c]),
    jsonEsc: t => StrTools.jsonEscape(t),
    jsonUnesc: t => StrTools.jsonUnescape(t),
    htmlDec: t => t.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(e[1].toLowerCase() === "x" ? 2 : 1), e[1].toLowerCase() === "x" ? 16 : 10)) : NAMED[e.toLowerCase()] ?? m),
  };

  // "1" · "1, 2" · "001, 5" (leading zeros pad to that width) → count numbers as strings.
  function numbers(count, spec) {
    const m = /^\s*(-?\d+)\s*(?:[,; ]\s*(-?\d+))?\s*$/.exec(spec || "1");
    if (!m) throw new Error(T("Nhập “số bắt đầu, bước”, ví dụ 1, 1 hoặc 001, 5."));
    const start = +m[1], step = m[2] === undefined ? 1 : +m[2], width = /^-?0\d/.test(m[1]) ? m[1].replace("-", "").length : 0;
    return Array.from({ length: count }, (x, i) => { const v = start + i * step; return (v < 0 ? "-" : "") + String(Math.abs(v)).padStart(width, "0"); });
  }

  async function hash(text, alg) {
    const d = await crypto.subtle.digest(alg, new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  return { lines: (id, l, arg) => LINES[id](l, arg), text: (id, t) => TEXT[id](t), numbers, hash, LINE_IDS: Object.keys(LINES), TEXT_IDS: Object.keys(TEXT) };
})();
