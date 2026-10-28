// CSV/TSV: delimiter sniffing, tolerant RFC 4180 parser (every repair is reported as a fix), serializer.
const CsvTool = (() => {
  const CANDIDATES = [",", ";", "\t", "|"];
  const NAMES = { ",": "dấu phẩy", ";": "dấu chấm phẩy", "\t": "Tab", "|": "dấu |" };

  const countOutside = (line, d) => { let n = 0, q = false; for (const c of line) { if (c === '"') q = !q; else if (c === d && !q) n++; } return n; };

  // Pick the candidate whose per-line count is most consistent over the first lines, then the one giving more columns.
  function sniff(text) {
    const lines = text.slice(0, 64 * 1024).split(/\r?\n/).filter(l => l.trim()).slice(0, 30);
    let best = ",", bestScore = 0;
    for (const d of CANDIDATES) {
      const counts = lines.map(l => countOutside(l, d)), first = counts[0] || 0;
      if (!first) continue;
      const score = counts.filter(c => c === first).length * 1000 + first;
      if (score > bestScore) { bestScore = score; best = d; }
    }
    return best;
  }

  function parse(text, delim) {
    const s = TextUtil.stripBom(text), d = delim || sniff(s);
    const rows = [], rowLines = [], fixes = [];
    let dropped = 0;
    const fix = (msg, line) => { if (fixes.length < 1000) fixes.push({ line, col: 0, msg }); else dropped++; };
    let row = [], field = "", quoted = false, line = 1, rowLine = 1, quoteLine = 1, blank = 0, i = 0;
    const endRow = () => {
      row.push(field); field = "";
      if (row.length === 1 && row[0] === "") blank++;
      else { rows.push(row); rowLines.push(rowLine); }
      row = [];
    };
    while (i < s.length) {
      const c = s[i];
      if (quoted) {
        if (c === '"' && s[i + 1] === '"') { field += '"'; i += 2; continue; }
        if (c === '"') {
          quoted = false; i++;
          if (i < s.length && s[i] !== d && s[i] !== "\n" && s[i] !== "\r") fix(T("Có ký tự ngay sau dấu nháy đóng của ô → nối vào nội dung ô"), line);
          continue;
        }
        if (c === "\n") line++;
        field += c; i++; continue;
      }
      if (c === '"' && field === "") { quoted = true; quoteLine = line; i++; continue; }
      if (c === d) { row.push(field); field = ""; i++; continue; }
      if (c === "\r" || c === "\n") { endRow(); i += c === "\r" && s[i + 1] === "\n" ? 2 : 1; line++; rowLine = line; continue; }
      field += c; i++;
    }
    if (quoted) fix(T("Ô mở dấu nháy nhưng không có nháy đóng → tự đóng ở cuối file"), quoteLine);
    if (field !== "" || row.length) endRow();
    if (blank) fix(T("Bỏ {n} dòng trống", { n: blank }), 0);
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    rows.forEach((r, k) => {
      const w0 = rows[0].length;
      if (r.length !== w0) fix(T("Hàng có {n} cột, hàng đầu có {w0} cột → {fix}", { n: r.length, w0, fix: T(r.length < w0 ? "ô thiếu để trống" : "thêm cột cho ô thừa") }), rowLines[k]);
    });
    if (dropped) fixes.push({ line: 0, col: 0, msg: T("… và {n} chỗ không chuẩn khác (chỉ liệt kê 1.000 chỗ đầu)", { n: dropped }) });
    return { rows, fixes, delimiter: d, delimiterName: NAMES[d] || d, width };
  }

  const needsQuote = (v, d) => v.includes(d) || /["\r\n]/.test(v) || /^\s|\s$/.test(v);
  const cell = (v, d) => needsQuote(v, d) ? `"${v.replace(/"/g, '""')}"` : v;
  const stringify = (rows, d = ",", eol = "\n") => rows.map(r => r.map(v => cell(v == null ? "" : String(v), d)).join(d)).join(eol);

  return { sniff, parse, stringify, NAMES };
})();
