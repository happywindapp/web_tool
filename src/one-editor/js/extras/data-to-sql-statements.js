// CSV / TSV / JSON rows → INSERT (batched) or UPDATE … WHERE key, T-SQL or PostgreSQL; text only, values escaped per dialect. Pure.
const DataSql = (() => {
  const DEF = { dialect: "tsql", batch: 1000, table: "", key: "" };
  const NUM = /^-?(?:0|[1-9]\d{0,14})(?:\.\d+)?$/;

  // Cells: { t: "null" | "num" | "bool" | "str" | "json", v }.
  function fromJson(text) {
    const r = JsonTool.parse(text), ast = r.ast;
    const list = !ast ? [] : ast.t === "arr" ? ast.items : [ast];
    const cols = [], rows = [];
    const cell = n => n.t === "num" ? { t: "num", v: n.raw } : n.t === "str" ? { t: "str", v: n.v } : n.t === "lit" ? (n.v === "null" ? { t: "null" } : { t: "bool", v: n.v === "true" })
      : { t: "json", v: JsonTool.stringify(n, "") };
    for (const n of list) {
      if (n.t !== "obj") throw new Error(T("JSON phải là mảng các object (mỗi object 1 dòng)."));
      const row = new Map();
      for (const it of n.items) { if (!cols.includes(it.k)) cols.push(it.k); row.set(it.k, cell(it.v)); }
      rows.push(row);
    }
    return { cols, rows: rows.map(m => cols.map(c => m.get(c) || { t: "null" })), fixes: r.fixes };
  }

  // CSV cell: empty → NULL, a plain number (no leading zero, ≤ 15 digits) → number, anything else → string.
  function fromCsv(text, lang) {
    const r = CsvTool.parse(text, lang === "TSV" ? "\t" : undefined);
    if (!r.rows.length) return { cols: [], rows: [], fixes: r.fixes };
    const cols = r.rows[0].map((h, i) => h.trim() || "col" + (i + 1));
    const rows = r.rows.slice(1).map(row => cols.map((c, i) => { const v = row[i] ?? ""; return v === "" ? { t: "null" } : NUM.test(v) ? { t: "num", v } : { t: "str", v }; }));
    return { cols, rows, fixes: r.fixes };
  }

  function read(text, lang) {
    const t = text.trimStart();
    return lang === "JSON" || (!["CSV", "TSV"].includes(lang) && /^[[{]/.test(t)) ? fromJson(text) : fromCsv(text, lang);
  }

  // Table names split on dots ([dbo].[Orders] or dbo.Orders); a column name is one identifier.
  const quote = (p, d) => d === "pg" ? '"' + p.replace(/"/g, '""') + '"' : "[" + p.replace(/]/g, "]]") + "]";
  const ident = (name, d, table = false) => table ? name.split(".").map(p => quote(p.replace(/^\[(.*)\]$|^"(.*)"$/, (m, a, b) => a ?? b), d)).join(".") : quote(name, d);
  // T-SQL: N'…' when the text has non-ASCII; PostgreSQL (standard_conforming_strings on): backslashes stay literal.
  function lit(c, d) {
    if (c.t === "null") return "NULL";
    if (c.t === "num") return c.v;
    if (c.t === "bool") return d === "pg" ? (c.v ? "TRUE" : "FALSE") : c.v ? "1" : "0";
    const s = "'" + c.v.replace(/'/g, "''") + "'";
    return d === "tsql" && /[^\x00-\x7f]/.test(c.v) ? "N" + s : s;
  }

  const tableName = name => (name || "").replace(/\s*⇢.*$/, "").replace(/\.[^.]*$/, "").replace(/[^\p{L}\p{N}_.]+/gu, "_").replace(/^_+|_+$/g, "") || "my_table";

  // → { text, notes }. T-SQL caps one VALUES list at 1000 rows.
  function build(data, o, srcName = "") {
    const d = o.dialect === "pg" ? "pg" : "tsql", table = ident(o.table || tableName(srcName), d, true), notes = [];
    if (!data.cols.length) throw new Error(T("Không có cột nào — cần CSV có dòng tiêu đề hoặc JSON mảng object."));
    const cols = data.cols.map(c => ident(c, d));
    const head = "-- " + T("{mode} · {dialect} · {n} dòng · bảng {table}", { mode: o.mode === "update" ? "UPDATE" : "INSERT", dialect: d === "pg" ? "PostgreSQL" : "T-SQL", n: data.rows.length, table })
      + " — " + T("đổi bằng lệnh “SQL từ dữ liệu: tuỳ chọn…”");
    const out = [head];
    if (o.mode === "update") {
      const keys = (o.key || "").split(",").map(s => s.trim()).filter(Boolean);
      const keyIdx = (keys.length ? keys : [data.cols.includes("id") ? "id" : data.cols[0]]).map(k => data.cols.indexOf(k));
      if (keyIdx.includes(-1)) throw new Error(T("Không có cột khoá “{key}” trong dữ liệu (cột: {cols}).", { key: o.key, cols: data.cols.join(", ") }));
      if (keyIdx.length === data.cols.length) throw new Error(T("Mọi cột đều là khoá — không còn cột nào để SET."));
      for (const r of data.rows) {
        const set = data.cols.map((c, i) => keyIdx.includes(i) ? null : cols[i] + " = " + lit(r[i], d)).filter(Boolean).join(", ");
        const where = keyIdx.map(i => cols[i] + (r[i].t === "null" ? " IS NULL" : " = " + lit(r[i], d))).join(" AND ");
        out.push("UPDATE " + table + " SET " + set + " WHERE " + where + ";");
      }
      notes.push(T("Khoá: {key}.", { key: keyIdx.map(i => data.cols[i]).join(", ") }));
    } else {
      let batch = Math.max(1, Math.floor(+o.batch) || DEF.batch);
      if (d === "tsql" && batch > 1000) { batch = 1000; notes.push(T("T-SQL giới hạn 1000 dòng mỗi VALUES — đã chia lô 1000.")); }
      for (let i = 0; i < data.rows.length; i += batch) {
        const part = data.rows.slice(i, i + batch).map(r => "  (" + r.map(c => lit(c, d)).join(", ") + ")");
        out.push("INSERT INTO " + table + " (" + cols.join(", ") + ")", "VALUES", part.join(",\n") + ";", "");
      }
    }
    return { text: out.join("\n").replace(/\n*$/, "\n"), notes };
  }

  return { DEF, read, build, lit, ident, tableName };
})();
