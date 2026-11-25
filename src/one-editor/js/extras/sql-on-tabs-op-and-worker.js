// "sql-query" op: SQLite (sql.js) in a Blob Worker over every open CSV / TSV / JSON-array tab (1 tab = 1 table), or over a .sqlite / .db tab; writes only change the copy in RAM.
// Worker side (stringified into the worker): tables / database load and keep the db between queries, query runs every statement and keeps the last result set.
function sqlWorkerHandlers() {
  const P = SqlTabsPure, MAX_KEEP = 100000, MAX_CHARS = 100 * 1048576, CELL = 10000;
  let SQL = null, db = null, dbKey = "", last = null;
  const loaded = new Map();

  async function ready() {
    if (SQL) return;
    const s = atob(self.sqljs.wasm), bin = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bin[i] = s.charCodeAt(i);
    SQL = await self.sqljs.init({ wasmBinary: bin });
  }
  function fresh(key, bytes) { if (db) db.close(); db = bytes ? new SQL.Database(bytes) : new SQL.Database(); dbKey = key; loaded.clear(); last = null; }
  const lit = s => "'" + String(s).replace(/'/g, "''") + "'";

  function schema() {
    const out = [], r = db.exec("SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name")[0];
    // One broken object (a view on a dropped table, a virtual table without its module) keeps its error, the rest still list.
    for (const [name, type, sql] of r ? r.values : []) {
      let cols = [], count = null, error = "";
      try { const c = db.exec("SELECT name, type FROM pragma_table_info(" + lit(name) + ")")[0]; cols = c ? c.values.map(([n, t]) => ({ name: n, type: t || "" })) : []; } catch (e) { error = e.message; }
      if (type === "table" && !error) try { count = db.exec("SELECT count(*) FROM " + P.ident(name))[0].values[0][0]; } catch (e) { error = e.message; }
      out.push({ name, type, sql: sql || "", cols, count, error });
    }
    return out;
  }

  return {
    // d.list: [{ name, tab, lang, text }] — a table whose text did not change is kept.
    async tables(d) {
      await ready();
      if (!db || dbKey !== "tabs") fresh("tabs");
      const want = new Set(d.list.map(t => t.name)), errors = [];
      for (const name of [...loaded.keys()]) if (!want.has(name)) { db.run("DROP TABLE IF EXISTS " + P.ident(name)); loaded.delete(name); }
      for (const t of d.list) {
        const h = P.hash(t.text);
        if (loaded.get(t.name) === h && db.exec("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = " + lit(t.name))[0]) continue;
        loaded.delete(t.name);
        // Dropped first: a tab that no longer parses must not leave its old rows queryable.
        db.run("DROP TABLE IF EXISTS " + P.ident(t.name));
        try {
          const tb = P.readTable(t.text, t.lang);
          if (!tb.cols.length) continue;
          db.run("BEGIN");
          try {
            db.run(P.createSql(t.name, tb.cols));
            const st = db.prepare(P.insertSql(t.name, tb.cols));
            try { for (const row of tb.rows) st.run(row); } finally { st.free(); }
            db.run("COMMIT");
          } catch (e) { db.run("ROLLBACK"); throw e; }
          loaded.set(t.name, h);
        } catch (e) { errors.push({ tab: t.tab, msg: e.message }); }
      }
      return { schema: schema(), errors };
    },
    // d: { key, bytes? } — bytes only when the page has not loaded this key yet.
    async database(d) {
      await ready();
      if (!db || dbKey !== d.key) {
        if (!d.bytes) throw new Error("reload");
        fresh(d.key, new Uint8Array(d.bytes));
      }
      return { schema: schema(), errors: [] };
    },
    // Every statement runs in order; the last one returning columns is the result (kept up to MAX_KEEP rows for export).
    query(d) {
      if (!db) throw new Error("no database");
      const t0 = Date.now();
      let res = null, statements = 0, changes = 0;
      last = null;
      for (const st of db.iterateStatements(d.sql)) {
        statements++;
        try {
          const cols = st.getColumnNames();
          if (cols.length) {
            const rows = [];
            let total = 0;
            let size = 0;
            while (st.step()) { total++; if (rows.length < MAX_KEEP && size < MAX_CHARS) { const row = st.get(); for (const x of row) size += typeof x === "string" ? x.length : 8; rows.push(row); } }
            res = { cols, rows, total };
          } else { st.step(); changes += db.getRowsModified(); }
        } finally { st.free(); }
      }
      last = res && { ...res, src: d.src };
      const r = res || { cols: [], rows: [], total: 0 };
      const cut = rows => rows.map(row => row.map(x => typeof x === "string" && x.length > CELL ? x.slice(0, CELL) + "…" : x));
      return { cols: r.cols, rows: cut(r.rows.slice(0, d.show)), total: r.total, kept: r.rows.length, statements, changes, ms: Date.now() - t0, csv: res ? P.toCsv(r.cols, cut(r.rows.slice(0, d.textRows))) : "", schema: changes ? schema() : null };
    },
    export(d) {
      if (!last || last.src !== d.src) throw new Error("no result");
      return d.format === "json" ? P.toJson(last.cols, last.rows) : P.toCsv(last.cols, last.rows);
    },
    // Demo .db: two tables + a view, exported as bytes.
    async demo() {
      await ready();
      const m = new SQL.Database();
      m.run("CREATE TABLE accounts (id INTEGER PRIMARY KEY, code TEXT NOT NULL, owner TEXT, opened TEXT)");
      m.run("CREATE TABLE trades (id INTEGER PRIMARY KEY, account_id INTEGER REFERENCES accounts(id), symbol TEXT, side TEXT, qty INTEGER, price REAL, traded_at TEXT)");
      const owners = ["Alex Carter", "Blair Novak", "Casey Lin", "Drew Patel", "Emery Stone"], syms = ["ACME", "BOLT", "CRUX", "DYNA", "EVOX"];
      owners.forEach((o, i) => m.run("INSERT INTO accounts VALUES (?, ?, ?, ?)", [i + 1, "DEMO" + String(1001 + i).padStart(6, "0"), o, "2026-0" + (i + 1) + "-15"]));
      for (let i = 1; i <= 60; i++) m.run("INSERT INTO trades VALUES (?, ?, ?, ?, ?, ?, ?)", [i, (i % 5) + 1, syms[(i * 7) % 5], i % 3 ? "BUY" : "SELL", ((i * 37) % 20 + 1) * 100, Math.round((20 + ((i * 13) % 50) / 10) * 100) / 100, "2026-11-" + String((i % 20) + 1).padStart(2, "0") + " 09:" + String(i % 60).padStart(2, "0")]);
      m.run("CREATE VIEW position AS SELECT a.code, t.symbol, SUM(CASE t.side WHEN 'BUY' THEN t.qty ELSE -t.qty END) AS net_qty FROM trades t JOIN accounts a ON a.id = t.account_id GROUP BY a.code, t.symbol");
      const bytes = m.export();
      m.close();
      return { $value: bytes.buffer, $transfer: [bytes.buffer] };
    },
  };
}

const SqlOp = (() => {
  const SHOW = 1000, TEXT_ROWS = 1000, TIMEOUT = 60000, MAX_DB = 200 * 1048576;
  const LANGS = new Set(["CSV", "TSV"]);
  let worker = null, dbKey = "", busyN = 0;
  const busyFns = new Set();
  const w = () => worker ??= BlobWorker.create({ libs: ["sqljs"], code: () => "const SqlTabsPure = (" + sqlTabsPureFactory + ")();\nconst HANDLERS = (" + sqlWorkerHandlers + ")();" });
  const clean = o => ({ query: typeof o?.query === "string" ? o.query.slice(0, 20000) : "" });
  const opts = srcId => PowerUi.opts(srcId, "sql-query", clean, () => ({ query: "" }));
  const isDb = doc => !!doc?.hex && FileOpen.binKind(doc.name) === "sqlite";
  const setBusy = d => { busyN += d; busyFns.forEach(f => f(busyN > 0)); };

  // Open CSV / TSV / JSON-array tabs: the source first, then newest first, so a link's tabs get the plain table names.
  function dataTabs(src) {
    const seen = new Set(), out = [];
    for (const g of Views.groups.slice(0, Views.count)) for (const id of g.tabs) {
      const d = Docs.get(id);
      if (!d || seen.has(id) || d.hex || d.big || PreviewPane.isPane(d)) continue;
      seen.add(id);
      const lang = Docs.effectiveLang(d);
      if (LANGS.has(lang) || (lang === "JSON" && /^\s*\[/.test(d.state ? d.state.sliceDoc(0, 200) : String(d.text).slice(0, 200)))) out.push(d);
    }
    const age = new Map(Docs.list().map((d, i) => [d.id, i]));
    out.sort((a, b) => (b === src) - (a === src) || age.get(b.id) - age.get(a.id));
    return out;
  }

  async function load(src) {
    if (isDb(src)) {
      const file = src.file || await src.handle?.getFile();
      if (!file) throw new Error(T("Dữ liệu nhị phân của “{name}” không còn sau khi tải lại trang — mở lại file.", { name: src.name }));
      if (file.size > MAX_DB) throw new Error(T("File .db lớn hơn {mb} MB — chưa hỗ trợ.", { mb: 200 }));
      const key = src.id + ":" + file.size + ":" + file.lastModified;
      // The worker keeps the db (and RAM writes) while it lives; a restarted one needs the bytes again.
      if (w().alive && dbKey === w().epoch + "|" + key) {
        try { return await w().call("database", { key }, { timeout: TIMEOUT }); } catch (e) { if (e.message !== "reload") throw e; }
      }
      const bytes = await file.arrayBuffer();
      const r = await w().call("database", { key, bytes }, { transfer: [bytes], timeout: TIMEOUT });
      dbKey = w().epoch + "|" + key;
      return r;
    }
    dbKey = "";
    const tabs = dataTabs(src);
    if (!tabs.length) throw new Error(T("Chưa có tab CSV / TSV / JSON-mảng nào đang mở — mở dữ liệu rồi chạy lại."));
    const names = SqlTabsPure.tableNames(tabs.map(d => d.name));
    const r = await w().call("tables", { list: tabs.map((d, i) => ({ name: names[i], tab: d.name, lang: Docs.effectiveLang(d), text: Docs.text(d) })) }, { timeout: TIMEOUT });
    dbKey = "";
    r.errors.forEach(e => { if (e.msg === "JSON must be an array of objects") e.msg = T("JSON phải là mảng các object (mỗi object 1 dòng)."); });
    return { ...r, tabs: tabs.map((d, i) => ({ id: d.id, name: d.name, table: names[i] })) };
  }

  const defaultQuery = schema => schema.length ? "SELECT * FROM " + SqlTabsPure.ident(schema[0].name) + " LIMIT 100;" : "";

  async function run(t, c) {
    const src = Docs.get(c.id), o = opts(c.id), db = isDb(src);
    setBusy(1);
    try {
      const sch = await load(src);
      if (!o.query.trim()) o.query = defaultQuery(sch.schema);
      const base = { kind: "sql", srcId: c.id, db, schema: sch.schema, tabs: sch.tabs || [], loadErrors: sch.errors, query: o.query };
      const notes = [db ? T("File .db mở trong RAM: lệnh ghi (INSERT / UPDATE / DELETE / DROP…) chỉ đổi bản trong RAM, không ghi xuống đĩa.") : T("Mỗi tab CSV / TSV / JSON-mảng là 1 bảng; lệnh ghi chỉ đổi bản trong RAM, không sửa tab.")];
      const loadError = sch.errors.length ? Object.assign(new Error(sch.errors.map(e => T("Tab “{name}” không đọc được: {msg}", { name: e.tab, msg: e.msg })).join(" · ")), { warn: true }) : null;
      if (!o.query.trim()) return { text: "", view: { ...base, result: null }, notes, error: loadError };
      let r;
      try { r = await w().call("query", { sql: o.query, src: c.id, show: SHOW, textRows: TEXT_ROWS }, { timeout: TIMEOUT }); } catch (e) {
        if (e.stopped || !w().alive) throw e;
        const at = SqlTabsPure.errorAt(o.query, e.message);
        return { text: "", view: { ...base, result: null, bad: e.message, at }, notes, error: Object.assign(new Error(at.line ? T("SQL lỗi (dòng {line}, cột {col}): {msg}", { ...at, msg: e.message }) : T("SQL lỗi: {msg}", { msg: e.message })), { warn: true }) };
      }
      if (r.schema) base.schema = r.schema;
      notes.unshift(r.cols.length ? T("{n} dòng · {ms} ms.", { n: I18n.num(r.total), ms: I18n.num(r.ms) }) : T("{n} dòng bị đổi · {ms} ms.", { n: I18n.num(r.changes), ms: I18n.num(r.ms) }));
      if (r.total > TEXT_ROWS) notes.push(T("Tab kết quả giữ {n} dòng đầu — ⬇ CSV / JSON hoặc Mở thành tab để lấy tới {max} dòng.", { n: I18n.num(TEXT_ROWS), max: I18n.num(100000) }));
      return { text: r.csv, view: { ...base, result: r }, notes, error: loadError };
    } finally { setBusy(-1); }
  }

  function set(srcId, o) {
    if (busyN) { StatusBar.msg(T("SQL đang chạy — chờ xong hoặc bấm ■ Dừng."), "warn"); return; }
    PowerUi.saveOpts(srcId, "sql-query", clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, "sql-query");
  }

  // Stop = terminate the worker: the running query ends, the tables load again on the next run.
  function stop() { worker?.stop(); dbKey = ""; }

  const exportText = (format, srcId) => w().call("export", { format, src: srcId }, { timeout: TIMEOUT })
    .catch(e => { throw e.message === "no result" ? new Error(T("Chưa có kết quả SQL của tab này — chạy lại SQL rồi xuất.")) : e; });
  async function demoDb() { return new Uint8Array(await w().call("demo", null, { timeout: TIMEOUT })); }

  // #pako: link with the data tabs + the query (a .db tab is binary: no link).
  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    if (isDb(src)) { StatusBar.msg(T("File .db là nhị phân — không đi theo link được; chia sẻ file đó và câu SQL."), "warn"); return; }
    const all = dataTabs(src), names = SqlTabsPure.tableNames(all.map(d => d.name)), q = opts(srcId).query;
    const mentions = name => new RegExp("(^|[^\\p{L}\\p{N}_])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\p{L}\\p{N}_])", "iu").test(q);
    const tabs = all.filter((d, i) => d === src || mentions(names[i])), first = tabs.includes(src) ? src : tabs[0];
    if (!first) { StatusBar.msg(T("Chưa có tab CSV / TSV / JSON-mảng nào đang mở — mở dữ liệu rồi chạy lại."), "warn"); return; }
    const list = [first, ...tabs.filter(d => d !== first)].map(d => ({ n: d.name, l: d.lang || "", t: Docs.text(d) }));
    await PowerUi.shareLink({ v: 1, views: [list, []], run: "sql-query", opts: opts(srcId) }, n => T("🔗 Đã chép link SQL ({n} ký tự) — mở link là nạp lại các bảng và chạy câu SQL.", { n }));
  }

  return { run, set, stop, opts, share, exportText, demoDb, onBusy: f => { busyFns.add(f); return () => busyFns.delete(f); }, get busy() { return busyN > 0; } };
})();
