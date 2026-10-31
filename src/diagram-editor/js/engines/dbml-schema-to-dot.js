// DBML schema JSON → Graphviz DOT. Node ids are generated, every label goes through esc(), colours are whitelisted: DOT stays safe with untrusted text.
const DbmlToDot = (() => {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const color = (c, d) => /^#[0-9a-f]{3,8}$/i.test(c || "") ? c : d;
  const keyOf = (schema, name) => `${schema || "public"}.${name}`;
  const titleOf = t => t.schemaName && t.schemaName !== "public" ? `${t.schemaName}.${t.name}` : t.name;

  function fieldRow(f, i, flags) {
    const tags = [f.pk && "PK", flags.has(f.name) && "FK", f.unique && !f.pk && "UQ"].filter(Boolean).join(" ");
    const name = f.pk ? `<B>${esc(f.name)}</B>` : esc(f.name);
    const type = esc(f.type?.type_name ?? "") + (f.not_null ? " NN" : "");
    return `<TR><TD PORT="l${i}" ALIGN="LEFT"><FONT COLOR="#b45309" POINT-SIZE="9">${tags || " "}</FONT></TD>` +
      `<TD ALIGN="LEFT">${name}</TD><TD PORT="r${i}" ALIGN="LEFT"><FONT COLOR="#64748b">${type}</FONT></TD></TR>`;
  }

  function tableNode(t, id, opts, fks) {
    const flags = fks.get(keyOf(t.schemaName, t.name)) || new Set();
    const shown = t.fields.map((f, i) => [f, i]).filter(([f]) => opts.fields !== "keys" || f.pk || f.unique || flags.has(f.name));
    const rows = shown.map(([f, i]) => fieldRow(f, i, flags)).join("") || `<TR><TD COLSPAN="3"> </TD></TR>`;
    const head = `<TR><TD COLSPAN="3" BGCOLOR="${color(t.headerColor, "#0e7490")}"><FONT COLOR="#ffffff"><B>${esc(titleOf(t))}</B></FONT></TD></TR>`;
    return `  ${id} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" COLOR="#94a3b8" BGCOLOR="#ffffff">${head}${rows}</TABLE>>];`;
  }

  function enumNode(e, id) {
    const rows = e.values.map(v => `<TR><TD ALIGN="LEFT">${esc(v.name)}</TD></TR>`).join("");
    return `  ${id} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="4" COLOR="#94a3b8" BGCOLOR="#ffffff"><TR><TD BGCOLOR="#7c3aed"><FONT COLOR="#ffffff"><B>${esc(e.name)}</B> «enum»</FONT></TD></TR>${rows}</TABLE>>];`;
  }

  // The FK side is the "*" endpoint; one-to-one refs keep the declared order, DBML writes them left-to-right.
  const fkEnd = r => r.endpoints[0].relation === "*" || r.endpoints[1].relation !== "*" ? 0 : 1;

  function foreignKeys(db) {
    const fks = new Map();
    for (const r of db.refs) {
      const end = r.endpoints[fkEnd(r)], k = keyOf(end.schemaName, end.tableName);
      if (!fks.has(k)) fks.set(k, new Set());
      end.fieldNames.forEach(f => fks.get(k).add(f));
    }
    return fks;
  }

  function build(db, { rankdir = "LR", fields = "all" } = {}) {
    const ids = new Map(), fks = foreignKeys(db), opts = { fields };
    db.tables.forEach((t, i) => ids.set(keyOf(t.schemaName, t.name), { id: `t${i}`, t }));
    const nodes = new Set(), lines = [];
    const tableLine = key => { const x = ids.get(key); nodes.add(key); return tableNode(x.t, x.id, opts, fks); };

    (db.tableGroups || []).forEach((g, i) => {
      const inside = g.tables.map(t => keyOf(t.schemaName, t.name)).filter(k => ids.has(k) && !nodes.has(k));
      if (!inside.length) return;
      const c = color(g.color, "#64748b");
      lines.push(`  subgraph cluster_${i} {`, `    label=<<B>${esc(g.name)}</B>>; color="${c}"; fontcolor="${c}"; style="rounded,dashed";`, ...inside.map(k => "  " + tableLine(k)), "  }");
    });
    for (const k of ids.keys()) if (!nodes.has(k)) lines.push(tableLine(k));

    const enumIds = new Map();
    (db.enums || []).forEach((e, i) => { enumIds.set(e.name, `e${i}`); lines.push(enumNode(e, `e${i}`)); });

    const port = (x, name, side) => {
      const i = x.t.fields.findIndex(f => f.name === name);
      const hidden = i < 0 || (fields === "keys" && !(x.t.fields[i].pk || x.t.fields[i].unique || fks.get(keyOf(x.t.schemaName, x.t.name))?.has(name)));
      return hidden ? x.id : `${x.id}:${side}${i}`;
    };
    for (const r of db.refs) {
      const from = fkEnd(r), a = r.endpoints[from], b = r.endpoints[1 - from];
      const ax = ids.get(keyOf(a.schemaName, a.tableName)), bx = ids.get(keyOf(b.schemaName, b.tableName));
      if (ax && bx) lines.push(`  ${port(ax, a.fieldNames[0], "r")} -> ${port(bx, b.fieldNames[0], "l")} [taillabel="${esc(a.relation)}", headlabel="${esc(b.relation)}"];`);
    }
    for (const x of ids.values()) x.t.fields.forEach((f, i) => {
      const e = enumIds.get(f.type?.type_name);
      if (e && (fields !== "keys" || f.pk)) lines.push(`  ${x.id}:r${i} -> ${e} [style=dashed, color="#7c3aed"];`);
    });

    const dir = rankdir === "TB" ? "TB" : "LR";
    return `digraph schema {\n  graph [rankdir=${dir}, nodesep=0.5, ranksep=1.1, fontname="Arial", fontsize=12];\n  node [shape=plain, fontname="Arial", fontsize=11];\n  edge [color="#475569", arrowsize=0.7, fontname="Arial", fontsize=10, fontcolor="#475569", labeldistance=1.6];\n${lines.join("\n")}\n}\n`;
  }

  return { build };
})();
if (typeof module !== "undefined") module.exports = { DbmlToDot };
