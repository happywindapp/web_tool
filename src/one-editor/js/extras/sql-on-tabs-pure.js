// SQL on tabs, pure (also runs inside the SQL worker as "(" + sqlTabsPureFactory + ")()"): CSV / TSV / JSON-array text → typed rows, SQL table names from tab names, results → CSV / JSON, where a SQLite error points.
function sqlTabsPureFactory() {
  // Same cell rule as CSV → SQL INSERT: no leading zero, ≤ 15 digits ⇒ number ("007" stays text).
  const NUM = /^-?(?:0|[1-9]\d{0,14})(?:\.\d+)?$/;

  // RFC 4180: quoted fields with "" and line breaks, CRLF / LF; a trailing empty line is not a row.
  function parseCsv(text, sep) {
    const rows = [];
    let row = [], f = "", i = 0, q = false;
    const n = text.length;
    while (i < n) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; }
        f += c; i++; continue;
      }
      if (c === '"' && f === "") { q = true; i++; continue; }
      if (c === sep) { row.push(f); f = ""; i++; continue; }
      if (c === "\r" || c === "\n") { row.push(f); rows.push(row); row = []; f = ""; i += c === "\r" && text[i + 1] === "\n" ? 2 : 1; continue; }
      f += c; i++;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function sniff(text, lang) {
    if (lang === "TSV") return "\t";
    const head = text.slice(0, text.indexOf("\n") < 0 ? 2000 : text.indexOf("\n"));
    let best = ",", hits = 0;
    for (const s of [",", ";", "\t", "|"]) { const k = head.split(s).length - 1; if (k > hits) { best = s; hits = k; } }
    return best;
  }

  const cellOf = v => v === "" ? null : NUM.test(v) ? Number(v) : v;
  const jsonCell = v => v == null ? null : typeof v === "boolean" ? (v ? 1 : 0) : typeof v === "object" ? JSON.stringify(v) : v;

  // → { cols, rows: [[value]] }; JSON must be an array of objects (columns = union of keys in order seen).
  function readTable(text, lang) {
    const t = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    if (lang === "JSON" || (!["CSV", "TSV"].includes(lang) && /^\s*\[/.test(t))) {
      const list = JSON.parse(t);
      if (!Array.isArray(list)) throw new Error("JSON must be an array of objects");
      const cols = [], seen = new Set();
      for (const o of list) {
        if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("JSON must be an array of objects");
        for (const k of Object.keys(o)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
      }
      return { cols, rows: list.map(o => cols.map(c => jsonCell(o[c]))) };
    }
    const all = parseCsv(t, sniff(t, lang));
    if (!all.length) return { cols: [], rows: [] };
    const cols = uniq(all[0].map((h, i) => h.trim() || "col" + (i + 1)));
    return { cols, rows: all.slice(1).filter(r => r.length > 1 || r[0] !== "").map(r => cols.map((c, i) => cellOf(r[i] ?? ""))) };
  }

  function uniq(names) {
    const seen = new Map();
    return names.map(n => { const k = n.toLowerCase(), c = seen.get(k) || 0; seen.set(k, c + 1); return c ? n + "_" + (c + 1) : n; });
  }

  // "orders 2026.csv" → orders_2026; unique, case-insensitive (SQLite identifiers are).
  function tableNames(names) {
    return uniq(names.map(n => {
      const base = String(n || "").replace(/\s*⇢.*$/, "").replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}_]+/gu, "_").replace(/^_+|_+$/g, "") || "tab";
      return /^\p{N}/u.test(base) ? "t_" + base : base;
    }));
  }

  const ident = s => '"' + String(s).replace(/"/g, '""') + '"';
  // Columns without a declared type keep each value's own type (12 integer, "007" text).
  const createSql = (name, cols) => "CREATE TABLE " + ident(name) + " (" + cols.map(ident).join(", ") + ")";
  const insertSql = (name, cols) => "INSERT INTO " + ident(name) + " VALUES (" + cols.map(() => "?").join(", ") + ")";

  function csvCell(v) {
    if (v == null) return "";
    const s = v instanceof Uint8Array ? "x'" + Array.from(v, b => b.toString(16).padStart(2, "0")).join("") + "'" : String(v);
    return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  const toCsv = (cols, rows) => [cols, ...rows].map(r => r.map(csvCell).join(",")).join("\n") + "\n";
  const toJson = (cols, rows) => JSON.stringify(rows.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i] instanceof Uint8Array ? Array.from(r[i]) : r[i]]))), null, 2) + "\n";

  // SQLite says near "tok" / no such table: x / no such column: x ⇒ 1-based line:col of that token in the query (0 when not found).
  function errorAt(sql, msg) {
    const m = /near "((?:[^"]|"")*)"|no such (?:table|column|function): ([\w.$]+)/i.exec(msg || "");
    const tok = m ? (m[1] ?? m[2]).replace(/""/g, '"') : "";
    const hit = tok && new RegExp("(^|[^\\w])" + tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (/\w$/.test(tok) ? "(?!\\w)" : ""), "i").exec(sql);
    if (!hit) return { line: 0, col: 0 };
    const before = sql.slice(0, hit.index + hit[1].length).split("\n");
    return { line: before.length, col: before[before.length - 1].length + 1 };
  }

  // FNV-1a: tells the worker a tab's text did not change, so it keeps the loaded table.
  function hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36) + ":" + s.length; }

  return { NUM, parseCsv, sniff, readTable, tableNames, ident, createSql, insertSql, toCsv, toJson, errorAt, hash };
}
const SqlTabsPure = sqlTabsPureFactory();
