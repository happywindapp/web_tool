// Tab "Chuyển đổi": JSON / CSV / TSV / XML / YAML → JSON, CSV, TSV, XML, YAML, JS object, SQL INSERT, Markdown / HTML table.
(() => {
  const LABEL = { json: "JSON", csv: "CSV", tsv: "TSV", xml: "XML", yaml: "YAML", js: "JS object", sql: "SQL", markdown: "Markdown", html: "bảng HTML" };
  const label = k => T(LABEL[k]);
  const FROM = Convert.FROM;
  const DEMO_TO = { json: "csv", csv: "json", xml: "json", yaml: "json" };
  const AUTO_LIMIT = 500 * 1024;
  let ed, report, fileName = "", lastOut = "", lastTo = "", detected = "";

  const delim = () => ({ tab: "\t" }[$("cv-delim").value] ?? $("cv-delim").value);
  const opts = () => ({
    delimiter: delim(), header: $("cv-header").checked, infer: $("cv-infer").checked, flatten: $("cv-flatten").checked,
    indent: TextUtil.indentUnit($("cv-indent").value), root: $("cv-root").value.trim() || "root", item: $("cv-item").value.trim() || "item",
    attrPrefix: $("cv-attr").value, table: $("cv-table").value.trim() || "my_table", sqlDialect: $("cv-sql").value, fileName,
  });

  // data-show="from:csv,tsv|to:sql" → visible when the source or target kind matches one rule.
  function refreshOptions() {
    const from = $("cv-from").value === "auto" ? detected : $("cv-from").value, to = $("cv-to").value;
    document.querySelectorAll('[data-wb-panel="convert"] [data-show]').forEach(el => {
      el.hidden = !el.dataset.show.split("|").some(rule => {
        const [side, list] = rule.split(":");
        return list.split(",").includes(side === "from" ? from : to);
      });
    });
  }

  function run() {
    const text = ed.value, to = $("cv-to").value;
    detected = text.trim() ? Detect.data(text, fileName) : "";
    refreshOptions();
    if (!text.trim()) return report.show(T("Chưa có nội dung."), "muted");
    let r;
    try { r = Convert.run(text, $("cv-from").value, to, opts()); }
    catch (e) { return report.show(T("✖ Không đọc được dữ liệu: {msg}", { msg: e.message }), "bad", e.line ? [{ line: e.line, col: e.col, msg: e.message }] : []); }
    lastOut = r.out; lastTo = to;
    $("cv-out").innerHTML = ViewRender.highlight(r.out, to);
    const title = `${label(r.from)} → ${label(to)}`;
    $("cv-info").textContent = `${title} · ` + T("{lines} dòng · {kb} KB", { lines: I18n.num(TextUtil.countLines(r.out)), kb: TextUtil.sizeKb(r.out) });
    report.show(r.fixes.length ? T("✔ Đã chuyển {title}. Tự sửa {n} lỗi ở dữ liệu nguồn, xem danh sách bên dưới.", { title, n: r.fixes.length }) : T("✔ Đã chuyển {title}.", { title }),
      r.fixes.length ? "warn" : "good", [...r.fixes, ...r.notes.map(msg => ({ line: 0, msg }))]);
  }

  const showName = () => { $("cv-fname").textContent = fileName || T("dán nội dung hoặc kéo thả file vào đây"); };

  function load(name, text, from = "auto") {
    fileName = name;
    $("cv-from").value = from;
    ed.set(text);
    showName();
    run();
  }

  const onFile = f => Dom.readFile(f, (name, text) => text === null ? report.show(T("✖ Không đọc được file {name}", { name }), "bad") : load(name, text));

  function swap() {
    if (!lastOut || !FROM.includes(lastTo)) return report.show(T("Không thể đảo chiều: {what} không đọc ngược lại được.", { what: LABEL[lastTo] ? label(lastTo) : T("kết quả") }), "muted");
    const prevFrom = $("cv-from").value === "auto" ? detected : $("cv-from").value;
    $("cv-to").value = prevFrom;
    load("", lastOut, lastTo);
  }

  function demo(name) {
    const d = DEMOS.convert[name];
    if (!d) return;
    $("cv-to").value = DEMO_TO[name];
    load(d.name, d.text);
  }

  function init() {
    ed = LineEditor($("cv-src"), { draftKey: "convert", highlight: () => $("cv-from").value === "auto" ? detected : $("cv-from").value, onChange: () => { if (ed.value.length < AUTO_LIMIT) run(); } });
    report = ReportPanel($("cv-status"), $("cv-msgs"), ed);
    $("cv-file").onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; };
    $("cv-run").onclick = run;
    $("cv-swap").onclick = swap;
    $("cv-clear").onclick = () => { lastOut = ""; $("cv-out").textContent = ""; $("cv-info").textContent = ""; load("", ""); };
    document.querySelectorAll('[data-wb-panel="convert"] .toolbar select:not(#cv-demo), [data-wb-panel="convert"] .toolbar input:not([type=file])')
      .forEach(el => el.addEventListener("change", () => { if (ed.value.length < AUTO_LIMIT) run(); else refreshOptions(); }));
    $("cv-copy").onclick = () => lastOut && Dom.copy(lastOut).then(ok => {
      $("cv-info").textContent = ok ? T("Đã sao chép kết quả.") : T("Trình duyệt chặn sao chép — hãy bôi đen kết quả rồi nhấn Ctrl+C.");
    });
    $("cv-save").onclick = () => {
      if (!lastOut) return;
      const bom = lastTo === "csv" || lastTo === "tsv" ? "﻿" : "";
      Dom.download(bom + lastOut, `${Dom.baseName(fileName)}.${Convert.EXT[lastTo]}`);
    };
    $("cv-demo").onchange = e => { Workbench.demo("convert", e.target.value); e.target.value = ""; };
    Workbench.bindSendTo($("cv-send"), "convert", () => lastOut ? { text: lastOut, kind: lastTo } : null);
    if (ed.value.trim()) run(); else demo("json");
  }

  Workbench.register("convert", {
    label: "Chuyển đổi", init, onFile, demo, primary: run,
    receive: (text, meta) => load("", text, FROM.includes(meta.kind) ? meta.kind : "auto"),
    relang: () => { showName(); run(); },
    snapshot: () => ({ text: ed.value }),
    open: p => load("", p.text, $("cv-from").value),
  });
})();
