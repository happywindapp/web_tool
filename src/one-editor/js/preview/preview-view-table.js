// Preview body for CSV / TSV / JSON: QuickTable model as a plain table (text nodes only), header sticks while scrolling.
const PvTable = {
  create(p) {
    const mk = (tag, cls) => Object.assign(document.createElement(tag), cls ? { className: cls } : {});
    const v = { el: mk("div", "pv-table"), tools: [], last: null };
    v.labels = () => { const d = v.last; if (d) p.type.textContent = T("Bảng · {rows} dòng × {cols} cột", { rows: d.total, cols: d.totalCols }); };
    const row = (cells, tag) => { const tr = mk("tr"); tr.append(...cells.map(c => Object.assign(mk(tag), { textContent: c }))); return tr; };
    v.show = d => {
      if (d.empty) { v.el.replaceChildren(); return false; }
      const table = mk("table"), head = mk("thead"), body = mk("tbody");
      head.append(row(d.cols, "th"));
      body.append(...d.rows.map(r => row(r, "td")));
      table.append(head, body);
      v.el.replaceChildren(table);
      v.last = d;
      v.labels();
      return true;
    };
    return v;
  },
};
