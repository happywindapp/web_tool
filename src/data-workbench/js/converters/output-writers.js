// Writers from the value model / table shape to text: JSON, JS object literal, YAML, CSV/TSV, SQL INSERT, Markdown & HTML table.
const Writers = (() => {
  const IDENT = /^[A-Za-z_$][\w$]*$/;
  const SQL_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const SQL_BATCH = 1000;

  const json = (v, indent) => JsonTool.stringify(Val.toAst(v), indent);

  // JSON.stringify escaping, then swap the quote style: \" → " and ' → \'.
  const jsStr = s => "'" + JSON.stringify(s).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, "\\'") + "'";
  function js(v, indent, lvl = 0) {
    if (Val.isScalar(v)) return typeof v === "string" ? jsStr(v) : v === null || v === undefined ? "null" : Val.text(v);
    const pad = indent ? "\n" + indent.repeat(lvl + 1) : "", end = indent ? "\n" + indent.repeat(lvl) : "";
    if (Array.isArray(v)) return v.length ? "[" + v.map(x => pad + js(x, indent, lvl + 1)).join(",") + end + "]" : "[]";
    const keys = Object.keys(v);
    if (!keys.length) return "{}";
    return "{" + keys.map(k => pad + (IDENT.test(k) && k !== "__proto__" ? k : jsStr(k)) + (indent ? ": " : ":") + js(v[k], indent, lvl + 1)).join(",") + end + "}";
  }

  function yaml(v, indent, notes) {
    const counter = {};
    const text = jsyaml.dump(Val.toPlain(v, counter), { indent: indent === "\t" ? 2 : indent.length || 2, lineWidth: -1, noRefs: true });
    if (indent === "\t") notes.push("YAML không cho phép thụt bằng Tab → dùng 2 dấu cách");
    if (counter.keptAsText) notes.push(`${counter.keptAsText} số giữ dạng chuỗi (số lớn hoặc có số 0 cuối) để không đổi giá trị`);
    return text.replace(/\n$/, "");
  }

  const headerOf = t => t.header || Array.from({ length: t.rows.reduce((w, r) => Math.max(w, r.length), 0) }, (_, i) => `col${i + 1}`);

  const csv = (t, d = ",") => CsvTool.stringify((t.header ? [t.header, ...t.rows] : t.rows).map(r => r.map(Val.text)), d);

  function markdown(t) {
    const head = headerOf(t), cell = v => Val.text(v).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
    const numeric = head.map((_, c) => t.rows.length && t.rows.every(r => r[c] == null || Val.isNum(r[c])));
    return [`| ${head.map(cell).join(" | ")} |`, `| ${numeric.map(n => n ? "---:" : "---").join(" | ")} |`,
      ...t.rows.map(r => `| ${head.map((_, c) => cell(r[c])).join(" | ")} |`)].join("\n");
  }

  function html(t, indent) {
    const e = s => Val.text(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const i1 = indent || "  ", i2 = i1.repeat(2), head = headerOf(t);
    return ["<table>", `${i1}<thead>`, `${i2}<tr>${head.map(h => `<th>${e(h)}</th>`).join("")}</tr>`, `${i1}</thead>`, `${i1}<tbody>`,
      ...t.rows.map(r => `${i2}<tr>${head.map((_, c) => `<td>${e(r[c])}</td>`).join("")}</tr>`), `${i1}</tbody>`, "</table>"].join("\n");
  }

  function sql(t, table = "my_table") {
    const id = n => SQL_IDENT.test(n) ? n : `"${n.replace(/"/g, '""')}"`;
    const lit = v => v === null || v === undefined ? "NULL" : Val.isNum(v) ? v.raw : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : `'${String(v).replace(/'/g, "''")}'`;
    const head = headerOf(t), cols = head.map(id).join(", "), out = [];
    for (let i = 0; i < t.rows.length; i += SQL_BATCH) {
      const vals = t.rows.slice(i, i + SQL_BATCH).map(r => `  (${head.map((_, c) => lit(r[c])).join(", ")})`);
      out.push(`INSERT INTO ${id(table)} (${cols}) VALUES\n${vals.join(",\n")};`);
    }
    return out.join("\n\n");
  }

  return { json, js, yaml, csv, markdown, html, sql };
})();
