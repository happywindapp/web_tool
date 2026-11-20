// Markdown tables + TOC, pure: rows / TSV pasted from Excel → table, align (pad) tables with wide-char widths, table of contents with GitHub-style anchors.
const MdTable = (() => {
  const DELIM = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
  const WIDE = new RegExp("[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}\\p{Extended_Pictographic}" + String.fromCharCode(0x3000) + "-" + String.fromCharCode(0x303f, 0xff01) + "-" + String.fromCharCode(0xff60) + "]", "u");
  const width = s => { let w = 0; for (const ch of s) w += /\p{M}|\p{Cf}/u.test(ch) ? 0 : WIDE.test(ch) ? 2 : 1; return w; };
  const cellText = s => String(s).replace(/\r\n?/g, "\n").replace(/\|/g, "\\|").replace(/\n/g, "<br>").trim();

  // Cells of one row: split on | that is not escaped and not inside `code`.
  function cells(line) {
    let t = line.trim();
    if (t.startsWith("|")) t = t.slice(1);
    if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
    const out = [];
    let cur = "";
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === "\\" && t[i + 1] === "|") { cur += "\\|"; i++; continue; }
      if (c === "|") { out.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  const alignOf = d => { const s = d.trim(); return s.startsWith(":") && s.endsWith(":") ? "c" : s.endsWith(":") ? "r" : s.startsWith(":") ? "l" : ""; };
  function render(rows, aligns) {
    const n = Math.max(...rows.map(r => r.length), aligns.length);
    const w = Array.from({ length: n }, (x, i) => Math.max(3, ...rows.map(r => width(r[i] || ""))));
    const pad = (s, i) => { const gap = w[i] - width(s), a = aligns[i]; return a === "r" ? " ".repeat(gap) + s : a === "c" ? " ".repeat(gap >> 1) + s + " ".repeat(gap - (gap >> 1)) : s + " ".repeat(gap); };
    const line = r => "| " + Array.from({ length: n }, (x, i) => pad(r[i] || "", i)).join(" | ") + " |";
    const dash = i => { const a = aligns[i] || "", k = w[i] - (a === "c" ? 2 : a ? 1 : 0); return (a === "c" || a === "l" ? ":" : "") + "-".repeat(k) + (a === "c" || a === "r" ? ":" : ""); };
    return [line(rows[0]), "| " + Array.from({ length: n }, (x, i) => dash(i)).join(" | ") + " |", ...rows.slice(1).map(line)].join("\n");
  }

  // Rows of raw values → table; columns whose body is all numbers align right.
  function fromRows(rows) {
    const clean = rows.map(r => r.map(cellText));
    const n = Math.max(...clean.map(r => r.length));
    const aligns = Array.from({ length: n }, (x, i) => { const body = clean.slice(1).map(r => r[i] || "").filter(Boolean); return body.length && body.every(v => /^[-+]?[\d.,]+%?$/.test(v)) ? "r" : ""; });
    return render(clean, aligns);
  }

  // Excel copies cells as TSV (cells with tabs / newlines in quotes): ≥ 2 rows and ≥ 2 columns, else null.
  function fromTsv(text) {
    const body = text.replace(/\r?\n$/, "");
    if (!body.includes("\t") || !/\n/.test(body)) return null;
    const rows = CsvTool.parse(body, "\t").rows.filter(r => r.some(c => c.trim()));
    return rows.length >= 2 && rows[0].length >= 2 ? fromRows(rows) : null;
  }

  // Every table in the text padded so its columns line up → { text, count }.
  function format(text) {
    const lines = text.split("\n");
    let count = 0;
    for (let i = 0; i + 1 < lines.length; i++) {
      // GFM: the delimiter row has pipes and as many cells as the header (a setext --- is not a table).
      if (!lines[i].includes("|") || !DELIM.test(lines[i + 1]) || !lines[i + 1].includes("|") || cells(lines[i + 1]).length !== cells(lines[i]).length) continue;
      let j = i + 2;
      while (j < lines.length && lines[j].includes("|") && lines[j].trim()) j++;
      const indent = /^\s*/.exec(lines[i])[0], rows = [cells(lines[i]), ...lines.slice(i + 2, j).map(cells)];
      const out = render(rows, cells(lines[i + 1]).map(alignOf)).split("\n").map(l => indent + l);
      lines.splice(i, j - i, ...out);
      count++;
      i += out.length - 1;
    }
    return { text: lines.join("\n"), count };
  }

  const plain = s => s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|~~|\*|_|`)(\S(?:.*?\S)?)\1/g, "$2").replace(/<[^>]+>/g, "").trim();
  const slug = s => plain(s).toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-");

  // Headings outside code fences; with a single H1 (the title) the list starts at H2.
  function headings(md) {
    const out = [];
    let fence = null;
    md.split("\n").forEach((l, i) => {
      const f = /^\s*(```|~~~)/.exec(l);
      if (f) { fence = fence === f[1] ? null : fence || f[1]; return; }
      const m = !fence && /^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(l);
      if (m) out.push({ level: m[1].length, text: m[2], line: i + 1 });
    });
    return out;
  }

  const OPEN = "<!-- toc -->", CLOSE = "<!-- /toc -->";
  function toc(md) {
    const hs = headings(md), h1 = hs.filter(h => h.level === 1).length === 1 ? hs.filter(h => h.level > 1) : hs;
    if (!h1.length) return null;
    const min = Math.min(...h1.map(h => h.level)), seen = new Map();
    const list = h1.map(h => {
      const base = slug(h.text), k = seen.get(base) || 0;
      seen.set(base, k + 1);
      return "  ".repeat(h.level - min) + "- [" + plain(h.text).replace(/[[\]]/g, "\\$&") + "](#" + (k ? base + "-" + k : base) + ")";
    });
    return [OPEN, ...list, CLOSE].join("\n");
  }

  // Range of an existing TOC block (markers included) or null.
  function tocRange(md) {
    const a = md.indexOf(OPEN), b = a < 0 ? -1 : md.indexOf(CLOSE, a);
    return a >= 0 && b >= 0 ? { from: a, to: b + CLOSE.length } : null;
  }

  return { cells, fromRows, fromTsv, format, toc, tocRange, slug, width, headings };
})();
