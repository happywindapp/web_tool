// "office" op on a .xlsx / .xlsm / .docx tab (read-only): workbook / document parsed in a Blob Worker (SheetJS mini / mammoth), ≤ 30 MB; xlsx ⇒ sheet strip + filter + grid, docx ⇒ HTML in a sandboxed iframe (no script, links off).
function xlsxWorkerHandlers() {
  const X = self.sheetjs, CACHE = new Map();
  let wb = null, key = "";
  const sheet = name => { const ws = wb && wb.Sheets[name]; if (!ws) throw new Error("no sheet: " + name); return ws; };
  const rowsOf = name => {
    if (!CACHE.has(name)) CACHE.set(name, X.utils.sheet_to_json(sheet(name), { header: 1, raw: false, defval: "", blankrows: false }));
    return CACHE.get(name);
  };
  const match = (rows, f) => { if (!f) return rows; const q = f.toLowerCase(); return rows.filter(r => r.some(c => String(c).toLowerCase().includes(q))); };
  // Pasted into Excel, a text cell starting with = + - @ would become a formula: keep it text.
  const tsv = rows => rows.map(r => r.map(c => String(c).replace(/[\t\r\n]+/g, " ").replace(/^[=+\-@]/, "'$&")).join("\t")).join("\n") + "\n";
  return {
    // d: { key, bytes? } — no VBA, styles or formulas: values (as Excel shows them) only.
    open(d) {
      if (!wb || key !== d.key) {
        if (!d.bytes) throw new Error("reload");
        wb = X.read(new Uint8Array(d.bytes), { type: "array", dense: true, cellFormula: false, cellHTML: false, cellStyles: false, bookVBA: false });
        key = d.key; CACHE.clear();
      }
      return wb.SheetNames.map(n => ({ name: n, ref: (wb.Sheets[n] || {})["!ref"] || "" }));
    },
    view(d) {
      const all = rowsOf(d.name), hit = match(all, d.filter);
      return { rows: hit.slice(0, d.show), total: all.length, matched: hit.length, width: Math.min(200, hit.slice(0, d.show).reduce((w, r) => Math.max(w, r.length), 0)), cols: hit.slice(0, d.show).reduce((w, r) => Math.max(w, r.length), 0), csv: d.csv ? X.utils.sheet_to_csv(X.utils.aoa_to_sheet(all.slice(0, d.csv)), { blankrows: false }) : "" };
    },
    csv(d) { return X.utils.sheet_to_csv(sheet(d.name), { blankrows: false }); },
    tsv(d) { return tsv(match(rowsOf(d.name), d.filter)); },
    demo() {
      const wb2 = X.utils.book_new(), syms = ["ACME", "BOLT", "CRUX", "DYNA", "EVOX"];
      const trades = [["Trade ID", "Symbol", "Side", "Qty", "Price", "Trade date"]];
      for (let i = 1; i <= 40; i++) trades.push(["T" + String(i).padStart(5, "0"), syms[(i * 3) % 5], i % 3 ? "BUY" : "SELL", ((i * 17) % 30 + 1) * 100, Math.round((20 + ((i * 11) % 60) / 10) * 100) / 100, "2026-11-" + String((i % 20) + 1).padStart(2, "0")]);
      X.utils.book_append_sheet(wb2, X.utils.aoa_to_sheet(trades), "Trades");
      X.utils.book_append_sheet(wb2, X.utils.aoa_to_sheet([["Symbol", "Name", "Board"], ...syms.map((s, i) => [s, s[0] + s.slice(1).toLowerCase() + " Demo Corp", i % 2 ? "MAIN" : "GROWTH"])]), "Symbols");
      X.utils.book_append_sheet(wb2, X.utils.aoa_to_sheet([["Account", "Owner", "Cash"], ["DEMO001001", "Alex Carter", 125000.5], ["DEMO001002", "Blair Novak", 98000], ["DEMO001003", "Casey Lin", "=no formulas are run"]]), "Accounts");
      const out = new Uint8Array(X.write(wb2, { type: "array", bookType: "xlsx" }));
      return { $value: out.buffer, $transfer: [out.buffer] };
    },
  };
}

function docxWorkerHandlers() {
  // mammoth writes its own markup (text escaped); links lose their target, only data: images stay.
  const tame = html => html.replace(/<a\b([^>]*?)\shref="([^"]*)"/g, (m, a, h) => h.startsWith("#") ? m : "<a" + a + ' title="' + h + '"').replace(/\ssrc="(?!data:)[^"]*"/g, "");
  return {
    async convert(d) {
      const html = await self.mammoth.convertToHtml({ arrayBuffer: d.bytes }), raw = await self.mammoth.extractRawText({ arrayBuffer: d.bytes });
      return { html: tame(html.value), text: raw.value, messages: html.messages.slice(0, 20).map(x => x.message) };
    },
  };
}

const OfficeOp = (() => {
  const MAX_BYTES = 30 * 1048576, SHOW = 1000, TEXT_ROWS = 1000, TIMEOUT = 120000;
  let xw = null, dw = null, xKey = "";
  const xlsx = () => xw ??= BlobWorker.create({ libs: ["sheetjs"], code: () => "const HANDLERS = (" + xlsxWorkerHandlers + ")();" });
  const docx = () => dw ??= BlobWorker.create({ libs: ["mammoth"], code: () => "const HANDLERS = (" + docxWorkerHandlers + ")();" });
  const clean = o => ({ sheet: typeof o?.sheet === "string" ? o.sheet.slice(0, 200) : "", filter: typeof o?.filter === "string" ? o.filter.slice(0, 500) : "" });
  const opts = srcId => PowerUi.opts(srcId, "office", clean, () => ({ sheet: "", filter: "" }));

  async function fileOf(src) {
    const file = src.file || await src.handle?.getFile();
    if (!file) throw new Error(T("Dữ liệu nhị phân của “{name}” không còn sau khi tải lại trang — mở lại file.", { name: src.name }));
    if (file.size > MAX_BYTES) throw new Error(T("“{name}” lớn hơn {mb} MB — chưa hỗ trợ xem.", { name: src.name, mb: 30 }));
    return file;
  }

  async function sheets(src) {
    const file = await fileOf(src), key = src.id + ":" + file.size + ":" + file.lastModified;
    if (xlsx().alive && xKey === key) return xlsx().call("open", { key }, { timeout: TIMEOUT });
    const bytes = await file.arrayBuffer(), r = await xlsx().call("open", { key, bytes }, { transfer: [bytes], timeout: TIMEOUT });
    xKey = key;
    return r;
  }

  async function run(t, c) {
    const src = Docs.get(c.id), kind = src?.hex && FileOpen.binKind(src.name);
    if (kind === "docx") {
      const bytes = await (await fileOf(src)).arrayBuffer(), r = await docx().call("convert", { bytes }, { transfer: [bytes], timeout: TIMEOUT });
      return { text: r.text, view: { kind: "office", type: "docx", srcId: c.id, html: r.html, messages: r.messages }, notes: [T("docx chỉ đọc: link ngoài bị tắt, không chạy macro.")] };
    }
    if (kind !== "xlsx") throw new Error(T("Chỉ xem được .xlsx / .xlsm / .docx — .xls / .ods hãy lưu lại thành .xlsx."));
    const list = await sheets(src), o = opts(c.id);
    if (!list.some(s => s.name === o.sheet)) o.sheet = list[0]?.name || "";
    const r = await xlsx().call("view", { name: o.sheet, filter: o.filter, show: SHOW, csv: TEXT_ROWS }, { timeout: TIMEOUT });
    const notes = [T("Sheet “{sheet}”: {n} dòng · chỉ đọc giá trị, không chạy công thức / macro.", { sheet: o.sheet, n: I18n.num(r.total) })];
    if (r.total > TEXT_ROWS) notes.push(T("Tab kết quả giữ {n} dòng đầu — “Mở sheet thành CSV” để lấy đủ.", { n: I18n.num(TEXT_ROWS) }));
    return { text: r.csv, view: { kind: "office", type: "xlsx", srcId: c.id, sheets: list, o, ...r }, notes };
  }

  function set(srcId, o) {
    PowerUi.saveOpts(srcId, "office", clean(o));
    const src = Docs.get(srcId);
    if (src) OutputLink.run(src, "office", true);
  }

  // The whole sheet as a CSV tab / the filtered rows as TSV on the clipboard (worker builds both).
  async function sheetAsCsv(srcId, gi) {
    const src = Docs.get(srcId), o = opts(srcId);
    if (!src) return;
    try {
      await sheets(src);
      const doc = Docs.create({ kind: "temp", name: (src.name.replace(/\.[^.]*$/, "") + " - " + o.sheet).replace(/[\\/:*?"<>|]+/g, "_") + ".csv", lang: "CSV", text: await xlsx().call("csv", { name: o.sheet }, { timeout: TIMEOUT }) });
      Views.open(doc, gi, true);
    } catch (e) { StatusBar.msg(T("Không mở được thành tab: {msg}", { msg: e.message }), "bad"); }
  }
  async function copyRows(srcId) {
    const src = Docs.get(srcId), o = opts(srcId);
    if (!src) return;
    try {
      await sheets(src);
      const text = await xlsx().call("tsv", { name: o.sheet, filter: o.filter }, { timeout: TIMEOUT });
      if (await Dom.copy(text)) StatusBar.msg(T("📋 Đã chép {n} dòng (TSV — dán được vào Excel).", { n: I18n.num(text.split("\n").length - 1) }), "good");
      else StatusBar.msg(T("Trình duyệt chặn chép."), "warn");
    } catch (e) { StatusBar.msg(T("Không chép được: {msg}", { msg: e.message }), "bad"); }
  }

  async function demoXlsx() { return new Uint8Array(await xlsx().call("demo", null, { timeout: TIMEOUT })); }

  return { run, set, opts, sheetAsCsv, copyRows, demoXlsx };
})();

const PvOffice = {
  create(p) {
    const { mk, button } = PowerUi, CELL = 200;
    const filter = mk("input", "dq-input of-filter", null, { type: "search", spellcheck: false, autocomplete: "off" });
    const copy = button("", () => v.last && OfficeOp.copyRows(v.last.srcId)), csv = button("", () => v.last && OfficeOp.sheetAsCsv(v.last.srcId, Views.other(Views.where(p.doc))));
    const v = { el: mk("div", "pv-office"), tools: [filter, copy, csv], last: null };
    filter.oninput = Dom.debounce(() => { if (v.last) OfficeOp.set(v.last.srcId, { sheet: v.last.o.sheet, filter: filter.value }); }, 300);
    const col = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

    function xlsxView(d) {
      p.type.textContent = T("xlsx · {n} sheet", { n: I18n.num(d.sheets.length) });
      const strip = mk("div", "of-sheets");
      for (const s of d.sheets) {
        const b = button(s.name, () => OfficeOp.set(d.srcId, { sheet: s.name, filter: "" }), s.ref);
        if (s.name === d.o.sheet) b.className = "on";
        strip.append(b);
      }
      const info = mk("div", "sql-info", d.o.filter ? T("{m} / {n} dòng khớp “{q}”", { m: I18n.num(d.matched), n: I18n.num(d.total), q: d.o.filter }) : T("{n} dòng", { n: I18n.num(d.total) }));
      if (d.matched > d.rows.length) info.append(" · " + T("hiện {n} dòng đầu", { n: I18n.num(d.rows.length) }));
      if (d.cols > d.width) info.append(" · " + T("hiện {n} / {m} cột đầu", { n: I18n.num(d.width), m: I18n.num(d.cols) }));
      const tb = mk("table", "rx-tab sql-tab"), head = mk("tr");
      head.append(mk("th", "", ""));
      for (let i = 0; i < d.width; i++) head.append(mk("th", "", col(i)));
      tb.append(head);
      const grid = mk("div", "sql-grid");
      grid.append(tb);
      v.el.replaceChildren(strip, info, grid);
      PowerUi.appendSliced(tb, d.rows, (r, k) => {
        const tr = mk("tr");
        tr.append(mk("td", "rx-none", String(k + 1)));
        for (let i = 0; i < d.width; i++) { const s = String(r[i] ?? ""); const td = mk("td", "", s.length > CELL ? s.slice(0, CELL) + "…" : s); if (s.length > CELL) td.title = s.slice(0, 4000); tr.append(td); }
        return tr;
      }, v.el);
    }

    function docxView(d) {
      p.type.textContent = T("docx · chỉ đọc");
      const frame = mk("iframe", "of-doc");
      frame.setAttribute("sandbox", "");
      frame.setAttribute("referrerpolicy", "no-referrer");
      frame.srcdoc = "<!doctype html><meta charset=\"utf-8\"><style>body{font:15px/1.55 Calibri,Arial,sans-serif;margin:20px auto;max-width:820px;padding:0 16px;color:#111;background:#fff}img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 6px}a{color:#1a56db}</style>" + d.html;
      const parts = [frame];
      if (d.messages.length) parts.unshift(mk("div", "rp-none", "mammoth: " + d.messages.join(" · ")));
      v.el.replaceChildren(...parts);
    }

    v.labels = () => {
      filter.placeholder = T("Lọc dòng chứa…"); filter.title = T("Lọc các dòng có ô chứa chữ này (không phân biệt hoa thường)");
      copy.textContent = T("📋 Chép vùng"); copy.title = T("Chép các dòng đang lọc dạng TSV (dán được vào Excel)");
      csv.textContent = T("⧉ Mở sheet thành CSV"); csv.title = T("Mở cả sheet thành tab CSV ở view kia");
      if (v.last) v.show(v.last);
    };
    v.show = d => {
      v.last = d;
      const x = d.type === "xlsx";
      [filter, copy, csv].forEach(e => { e.hidden = !x; });
      if (x && document.activeElement !== filter) filter.value = d.o.filter;
      if (x) xlsxView(d); else docxView(d);
      return true;
    };
    return v;
  },
};
