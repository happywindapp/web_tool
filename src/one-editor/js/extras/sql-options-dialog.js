// "SQL from data" settings for the active tab: dialect, INSERT batch size (remembered), table and key columns (this tab); linked SQL tabs re-run after OK.
const SqlOptions = (() => {
  const { mk } = PowerUi;

  function open() {
    const d = Views.activeDoc(), src = d && Docs.root(d.kind === "output" && d.link ? Docs.get(d.link.src) || d : d);
    if (!src) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return; }
    const s = PowerOps.sqlOpts(src.id);
    const dlg = mk("dialog", "qp pw-dlg sql-dlg", null, { "aria-label": T("SQL từ dữ liệu: tuỳ chọn") }), form = mk("form", "", null, { method: "dialog" });
    const field = (label, input) => { const l = mk("label", "sql-f"); l.append(mk("span", "", label), input); return l; };
    const dialect = mk("select");
    dialect.append(mk("option", "", "T-SQL (SQL Server)", { value: "tsql" }), mk("option", "", "PostgreSQL", { value: "pg" }));
    dialect.value = s.dialect;
    const batch = mk("input", "", null, { type: "number", min: "1", max: "100000", value: String(s.batch) });
    const table = mk("input", "", null, { type: "text", value: s.table, placeholder: DataSql.tableName(src.name), spellcheck: false });
    const key = mk("input", "", null, { type: "text", value: s.key, placeholder: T("mặc định: id hoặc cột đầu"), spellcheck: false });
    const ok = mk("button", "main", "OK", { value: "ok" }), cancel = mk("button", "", T("Huỷ"), { value: "cancel", formNoValidate: true });
    const acts = mk("div", "pw-acts");
    acts.append(ok, cancel);
    form.append(mk("p", "", T("SQL từ dữ liệu: {name}", { name: src.name })), field(T("Dialect"), dialect), field(T("Số dòng mỗi INSERT"), batch), field(T("Bảng (vd dbo.Orders)"), table),
      field(T("Cột khoá cho UPDATE (cách nhau dấu phẩy)"), key), mk("p", "muted", T("Chỉ sinh văn bản SQL — tool không kết nối DB.")), acts);
    dlg.append(form);
    dlg.addEventListener("close", () => {
      if (dlg.returnValue === "ok") {
        Object.assign(s, { dialect: dialect.value === "pg" ? "pg" : "tsql", batch: Math.max(1, Math.min(100000, Math.floor(+batch.value) || DataSql.DEF.batch)), table: table.value.trim(), key: key.value.trim() });
        Prefs.set("sql", { dialect: s.dialect, batch: s.batch });
        const outs = Docs.list().filter(o => o.kind === "output" && o.link?.src === src.id && /^sql-/.test(o.link.op));
        outs.forEach(o => OutputLink.run(src, o.link.op, true));
        StatusBar.msg(T("✔ Đã lưu tuỳ chọn SQL.") + (outs.length ? " " + T("Tab SQL đã chạy lại.") : " " + T("Chạy “CSV / JSON → SQL INSERT” để xem.")), "good");
      }
      dlg.remove();
    });
    document.body.append(dlg);
    dlg.showModal();
  }

  return { open };
})();
