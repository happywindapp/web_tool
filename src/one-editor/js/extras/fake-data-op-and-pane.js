// "fake-data" op: a JSON Schema tab (or any tab, by columns) → N fake rows as JSON / CSV; settings in the pane bar: rows, seed, format, mode, columns.
const FakeOp = (() => {
  const DEF_COLS = "id:uuid, name:name, email:email, phone:phone, opened:date, symbol:ticker, account:account, side:side, qty:qty, price:price, active:bool";
  const DEF = () => ({ mode: "auto", n: 20, seed: "1", format: "json", cols: DEF_COLS });
  const pick = (v, list, d) => list.includes(v) ? v : d;
  const clean = o => ({ mode: pick(o?.mode, ["auto", "schema", "cols"], "auto"), n: Math.max(1, Math.min(FakeData.MAX_ROWS, Math.floor(+o?.n) || 20)), seed: typeof o?.seed === "string" || typeof o?.seed === "number" ? String(o.seed).slice(0, 64) : "1",
    format: pick(o?.format, ["json", "csv"], "json"), cols: typeof o?.cols === "string" ? o.cols.slice(0, 2000) : DEF_COLS });
  const opts = srcId => PowerUi.opts(srcId, "fake-data", clean, DEF);
  const NOTE = { ref: "$ref ngoài file ở {path} — bỏ qua (chỉ giải $ref nội bộ #/…).", missing: "$ref ở {path} không trỏ tới đâu — dùng chuỗi giả thường.", pattern: "pattern ở {path} quá phức tạp — dùng chuỗi giả thường.",
    badPattern: "pattern ở {path} không phải regex hợp lệ — dùng chuỗi giả thường.", budget: "Schema sinh quá nhiều giá trị (lồng / đệ quy) — cắt từ {path}.", depth: "Schema lồng / vòng quá {n} tầng ở {path} — cắt." };

  // A schema is a JSON object with type / properties / items / $ref / …of; "auto" falls back to columns otherwise.
  function schemaOf(t, mode) {
    if (mode === "cols") return null;
    let s;
    try { s = JSON.parse(t); } catch (e) {
      const err = T("JSON Schema lỗi: {msg}", { msg: e.message });
      if (mode === "schema") throw Object.assign(new Error(err), { warn: true });
      return /^\s*\{/.test(t) ? { broken: err } : null;
    }
    const ok = s && typeof s === "object" && !Array.isArray(s) && ["type", "properties", "items", "$ref", "oneOf", "anyOf", "allOf", "enum", "$schema"].some(k => k in s);
    if (!ok && mode === "schema") throw new Error(T("Tab nguồn không phải JSON Schema (thiếu type / properties / items…)."));
    return ok ? s : null;
  }

  function run(t, c) {
    const o = opts(c.id), found = schemaOf(t, o.mode), notes = [], schema = found?.broken ? null : found;
    if (found?.broken) notes.push(found.broken + " " + T("— đang sinh theo cột trên thanh."));
    let rows;
    if (schema) {
      const r = FakeData.fromSchema(schema, o.n, o.seed);
      rows = r.rows;
      r.notes.forEach(x => notes.push(T(NOTE[x.kind], { path: x.path || "/", n: 8 })));
    } else {
      const p = FakeData.parseCols(o.cols);
      if (p.bad.length) notes.push(T("Bỏ qua kiểu cột không biết: {list} — có: {kinds}.", { list: p.bad.join(", "), kinds: FakeData.KINDS.join(", ") }));
      if (!p.cols.length) throw Object.assign(new Error(T("Chưa có cột nào — gõ dạng id:uuid, name:name, email:email.")), { warn: true });
      rows = FakeData.fromColumns(p.cols, o.n, o.seed);
    }
    notes.unshift(T("{n} bản ghi giả · seed {seed} — cùng seed ra cùng dữ liệu.", { n: I18n.num(rows.length), seed: o.seed }));
    const text = o.format === "csv" ? FakeData.toCsv(rows) : JSON.stringify(rows, null, 2) + "\n";
    return { text, view: { kind: "fake", srcId: c.id, o, schema: !!schema, rows: rows.slice(0, 100), total: rows.length, notes }, notes };
  }

  function set(srcId, o) {
    PowerUi.saveOpts(srcId, "fake-data", clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, "fake-data", true);
  }

  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    await PowerUi.shareLink({ v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: "fake-data", opts: opts(srcId) }, n => T("🔗 Đã chép link dữ liệu giả ({n} ký tự) — mở link là sinh lại đúng dữ liệu (cùng seed).", { n }));
  }

  return { run, set, opts, share };
})();

const PvFake = {
  create(p) {
    const { mk, button } = PowerUi;
    const n = mk("input", "fk-n", null, { type: "number", min: 1, max: FakeData.MAX_ROWS }), seed = mk("input", "fk-seed", null, { type: "text", spellcheck: false });
    const format = mk("select", "fk-format"), mode = mk("select", "fk-mode"), cols = mk("input", "dq-input fk-cols", null, { type: "text", spellcheck: false, autocomplete: "off" });
    const link = button("", () => v.last && FakeOp.share(v.last.srcId));
    const v = { el: mk("div", "pv-fake"), tools: [n, seed, format, mode, cols, link], last: null };
    const send = Dom.debounce(() => { if (v.last) FakeOp.set(v.last.srcId, { mode: mode.value, n: n.value, seed: seed.value, format: format.value, cols: cols.value }); }, 300);
    [n, seed, cols].forEach(x => { x.oninput = send; });
    [format, mode].forEach(x => { x.onchange = send; });

    function render() {
      const d = v.last;
      p.type.textContent = T("Dữ liệu giả · {n} bản ghi", { n: I18n.num(d.total) });
      cols.hidden = d.schema;
      const parts = [mk("div", "rp-none", d.schema ? T("Theo JSON Schema ở tab nguồn (type, format, enum, min/max, pattern đơn giản, required, items, $ref #/…).") : T("Theo danh sách cột trên thanh: tên:kiểu, cách nhau dấu phẩy. Kiểu: {kinds}.", { kinds: FakeData.KINDS.join(", ") }))];
      const keys = [...new Set(d.rows.flatMap(r => r && typeof r === "object" && !Array.isArray(r) ? Object.keys(r) : ["value"]))].slice(0, 30);
      const tb = mk("table", "rx-tab"), head = mk("tr");
      keys.forEach(k => head.append(mk("th", "", k)));
      tb.append(head);
      for (const r of d.rows) {
        const tr = mk("tr");
        for (const k of keys) { const x = r && typeof r === "object" && !Array.isArray(r) ? r[k] : r, s = x === undefined ? "" : typeof x === "object" ? JSON.stringify(x) : String(x); tr.append(mk("td", x == null ? "rx-none" : "", s.length > 120 ? s.slice(0, 120) + "…" : s)); }
        tb.append(tr);
      }
      parts.push(tb);
      if (d.total > d.rows.length) parts.push(mk("div", "rp-none", T("Bảng hiện {n} bản ghi đầu — đủ dữ liệu nằm trong text của tab.", { n: I18n.num(d.rows.length) })));
      v.el.replaceChildren(...parts);
    }

    v.labels = () => {
      n.title = T("Số bản ghi (1–{max})", { max: I18n.num(FakeData.MAX_ROWS) }); seed.title = T("Seed — cùng seed ra cùng dữ liệu"); seed.placeholder = "seed";
      format.replaceChildren(new Option("JSON", "json"), new Option("CSV", "csv"));
      mode.replaceChildren(new Option(T("Tự nhận"), "auto"), new Option("JSON Schema", "schema"), new Option(T("Theo cột"), "cols"));
      if (v.last) { format.value = v.last.o.format; mode.value = v.last.o.mode; }
      format.title = T("Định dạng kết quả"); mode.title = T("Nguồn: JSON Schema ở tab hay danh sách cột");
      cols.placeholder = "id:uuid, name:name, email:email"; cols.title = T("Cột: tên:kiểu, cách nhau dấu phẩy");
      link.textContent = T("🔗 Link"); link.title = T("Chép link chia sẻ: schema + số bản ghi + seed");
      if (v.last) render();
    };
    v.show = d => {
      v.last = d;
      for (const [x, val] of [[n, d.o.n], [seed, d.o.seed], [format, d.o.format], [mode, d.o.mode], [cols, d.o.cols]]) if (document.activeElement !== x) x.value = val;
      render();
      return true;
    };
    return v;
  },
};
