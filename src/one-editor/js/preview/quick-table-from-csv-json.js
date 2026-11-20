// Quick table view of parsed CSV rows or a JSON value: { cols, rows (strings), total, totalCols, shape }; only the first MAX rows and MAX_COLS columns are kept.
const QuickTable = (() => {
  const MAX = 1000, MAX_COLS = 200, CELL = 300;
  const cut = s => s.length > CELL ? s.slice(0, CELL - 1) + "…" : s;
  const cell = v => cut(v === null ? "null" : v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);

  // First row is the header; short rows are padded, extra fields get their own column.
  function fromRows(rows) {
    const width = rows.slice(0, MAX + 1).reduce((w, r) => Math.max(w, r.length), 0), shown = Math.min(width, MAX_COLS), head = rows[0] || [];
    const cols = ["#", ...Array.from({ length: shown }, (_, k) => cut(head[k] ?? ""))];
    const body = rows.slice(1, MAX + 1).map((r, k) => [String(k + 1), ...Array.from({ length: shown }, (_, j) => cut(r[j] ?? ""))]);
    return { cols, rows: body, total: Math.max(rows.length - 1, 0), totalCols: width, shape: "rows" };
  }

  // Array of objects → one column per key (first-seen order); array of values → one column; object → key / value pairs.
  function fromJson(v) {
    if (Array.isArray(v) && v.some(isObj)) {
      const keys = new Set(), list = v.slice(0, MAX);
      for (const o of list) if (isObj(o)) for (const k in o) if (Object.hasOwn(o, k)) keys.add(k);
      const all = [...keys], cols = all.slice(0, MAX_COLS);
      return { cols: ["#", ...cols.map(cut)], rows: list.map((o, k) => [String(k), ...cols.map(c => isObj(o) ? (Object.hasOwn(o, c) ? cell(o[c]) : "") : c === cols[0] ? cell(o) : "")]), total: v.length, totalCols: all.length, shape: "objects" };
    }
    if (Array.isArray(v)) return { cols: ["#", "value"], rows: v.slice(0, MAX).map((x, k) => [String(k), cell(x)]), total: v.length, totalCols: 1, shape: "values" };
    if (isObj(v)) { const e = Object.entries(v); return { cols: ["key", "value"], rows: e.slice(0, MAX).map(([k, x]) => [cut(k), cell(x)]), total: e.length, totalCols: 2, shape: "object" }; }
    return { cols: ["value"], rows: [[cell(v)]], total: 1, totalCols: 1, shape: "value" };
  }

  return { fromRows, fromJson, MAX, MAX_COLS };
})();
