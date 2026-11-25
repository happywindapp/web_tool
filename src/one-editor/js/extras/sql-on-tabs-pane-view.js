// SQL pane: tables (click ⇒ SELECT) · query box (Ctrl+Enter) · ▶ / ■ Dừng · result grid (first 1000 rows) · ⬇ CSV / JSON · open as tab · 🔗 link. Text nodes only.
// Ctrl+Enter is the global ▶ Run (document capture): the query box takes it first, at window capture.
const SqlBoxKeys = new WeakMap();
addEventListener("keydown", e => {
  const send = SqlBoxKeys.get(e.target);
  if (send && (e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); send(); }
}, true);
const PvSql = {
  create(p) {
    const { mk, button } = PowerUi, CELL = 300;
    const box = mk("textarea", "sql-box", null, { spellcheck: false, rows: 4, autocomplete: "off" });
    const runB = button("", () => send()), stopB = button("", () => SqlOp.stop()), csvB = button("", () => save("csv")), jsonB = button("", () => save("json")), tabB = button("", () => asTab()), linkB = button("", () => v.last && SqlOp.share(v.last.srcId));
    runB.className = "main";
    const actions = mk("div", "sql-actions");
    actions.append(runB, stopB, csvB, jsonB, tabB, linkB);
    const tables = mk("div", "sql-tables"), info = mk("div", "sql-info"), grid = mk("div", "sql-grid");
    const v = { el: mk("div", "pv-sql"), tools: [], last: null };
    v.el.append(tables, box, actions, info, grid);
    // A stopped / failed run never reaches show(): the info line goes back to the last result.
    const off = SqlOp.onBusy(on => { runB.disabled = on; stopB.disabled = !on; if (on) info.textContent = T("Đang chạy SQL…"); else if (v.last) setTimeout(() => !SqlOp.busy && result(v.last), 0); });
    stopB.disabled = true;

    const send = () => { if (v.last) SqlOp.set(v.last.srcId, { query: box.value }); };
    SqlBoxKeys.set(box, send);

    async function save(format) {
      try { Dom.download(await SqlOp.exportText(format, v.last?.srcId), "query-result." + format, format === "json" ? "application/json" : "text/csv"); } catch (e) { StatusBar.msg(T("Không xuất được: {msg}", { msg: e.message }), "bad"); }
    }
    async function asTab() {
      try {
        const doc = Docs.create({ kind: "temp", name: "query-result.csv", lang: "CSV", text: await SqlOp.exportText("csv", v.last?.srcId) });
        Views.open(doc, Views.other(Views.where(p.doc)), true);
      } catch (e) { StatusBar.msg(T("Không mở được thành tab: {msg}", { msg: e.message }), "bad"); }
    }

    function tableList(d) {
      const items = d.schema.map(t => {
        const b = mk("button", "sql-table", null, { type: "button" });
        b.append(mk("b", "", t.name), " " + (t.type === "view" ? T("(view)") : t.count == null ? T("(? dòng)") : T("({n} dòng)", { n: I18n.num(t.count) })) + ": ", mk("span", "sql-cols", t.cols.map(c => c.name + (c.type ? " " + c.type : "")).join(", ")));
        if (t.error) b.append(mk("span", "rx-bad", " ✖ " + t.error));
        b.title = (t.sql || "") + "\n\n" + T("Bấm để chèn SELECT bảng này");
        b.onclick = () => { box.value = "SELECT * FROM " + SqlTabsPure.ident(t.name) + " LIMIT 100;"; send(); };
        return b;
      });
      const head = mk("div", "rp-none", d.db ? T("File SQLite chỉ đọc (bản trong RAM):") : T("Mỗi tab CSV / TSV / JSON-mảng đang mở là 1 bảng:"));
      const bad = (d.loadErrors || []).map(e => mk("div", "rx-bad", "✖ " + T("Tab “{name}” không đọc được: {msg}", { name: e.tab, msg: e.msg })));
      tables.replaceChildren(head, ...bad, ...(items.length ? items : [mk("div", "rp-none", T("Không có bảng nào."))]));
    }

    function result(d) {
      const r = d.result;
      [csvB, jsonB, tabB].forEach(b => { b.disabled = !r?.cols.length; });
      if (d.bad) {
        info.replaceChildren(mk("div", "rx-bad", "✖ " + d.bad + (d.at.line ? " — " + T("dòng {line}, cột {col}", d.at) : "")));
        if (d.at.line && document.activeElement !== box) {
          const lines = box.value.split("\n"), at = lines.slice(0, d.at.line - 1).reduce((n, l) => n + l.length + 1, 0) + d.at.col - 1;
          box.setSelectionRange(at, at);
        }
        grid.replaceChildren();
        return;
      }
      if (!r) { info.textContent = T("Gõ câu SQL rồi bấm ▶ Chạy SQL (Ctrl+Enter)."); grid.replaceChildren(); return; }
      info.textContent = r.cols.length ? T("{n} dòng · {ms} ms", { n: I18n.num(r.total), ms: I18n.num(r.ms) }) + (r.total > r.rows.length ? " · " + T("hiện {n} dòng đầu", { n: I18n.num(r.rows.length) }) : "")
        : T("{s} câu lệnh · {n} dòng bị đổi · {ms} ms", { s: I18n.num(r.statements), n: I18n.num(r.changes), ms: I18n.num(r.ms) });
      if (!r.cols.length) { grid.replaceChildren(); return; }
      const tb = mk("table", "rx-tab sql-tab"), head = mk("tr");
      r.cols.forEach(c => head.append(mk("th", "", c)));
      tb.append(head);
      grid.replaceChildren(tb);
      PowerUi.appendSliced(tb, r.rows, row => {
        const tr = mk("tr");
        for (const x of row) {
          const s = x == null ? "NULL" : x instanceof Uint8Array ? T("(BLOB {n} byte)", { n: I18n.num(x.length) }) : String(x);
          const td = mk("td", x == null ? "rx-none" : typeof x === "number" ? "sql-num" : "", s.length > CELL ? s.slice(0, CELL) + "…" : s);
          if (s.length > CELL) td.title = s.slice(0, 4000);
          tr.append(td);
        }
        return tr;
      }, grid);
    }

    function render() {
      const d = v.last;
      p.type.textContent = d.db ? T("SQL · SQLite") : T("SQL · {n} bảng", { n: I18n.num(d.schema.length) });
      tableList(d);
      result(d);
    }

    v.labels = () => {
      runB.textContent = T("▶ Chạy SQL"); runB.title = T("Chạy câu SQL (Ctrl+Enter)");
      stopB.textContent = T("■ Dừng"); stopB.title = T("Dừng câu SQL đang chạy (bảng sẽ nạp lại ở lần chạy sau)");
      csvB.textContent = "⬇ CSV"; csvB.title = T("Tải kết quả (tới 100.000 dòng)");
      jsonB.textContent = "⬇ JSON"; jsonB.title = T("Tải kết quả (tới 100.000 dòng)");
      tabB.textContent = T("⧉ Mở thành tab"); tabB.title = T("Mở kết quả (tới 100.000 dòng) thành tab CSV");
      linkB.textContent = T("🔗 Link"); linkB.title = T("Chép link chia sẻ: các tab dữ liệu + câu SQL");
      box.placeholder = T("SELECT … FROM bảng — Ctrl+Enter để chạy");
      if (v.last) render();
    };
    v.show = d => {
      v.last = d;
      if (document.activeElement !== box) box.value = d.query;
      linkB.hidden = d.db;
      render();
      return true;
    };
    v.destroy = () => off();
    return v;
  },
};
