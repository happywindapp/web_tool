// Tab "Chuyển đổi": JSON / CSV / TSV / XML / YAML → JSON, CSV, TSV, XML, YAML, JS object, SQL INSERT, Markdown / HTML table.
(() => {
  const LABEL = { json: "JSON", csv: "CSV", tsv: "TSV", xml: "XML", yaml: "YAML", js: "JS object", sql: "SQL", markdown: "Markdown", html: "bảng HTML" };
  const FROM = Convert.FROM;
  const DEMO_TO = { json: "csv", csv: "json", xml: "json", yaml: "json" };
  const AUTO_LIMIT = 500 * 1024;
  let ed, report, fileName = "", lastOut = "", lastTo = "", detected = "";

  const delim = () => ({ tab: "\t" }[$("cv-delim").value] ?? $("cv-delim").value);
  const opts = () => ({
    delimiter: delim(), header: $("cv-header").checked, infer: $("cv-infer").checked, flatten: $("cv-flatten").checked,
    indent: TextUtil.indentUnit($("cv-indent").value), root: $("cv-root").value.trim() || "root", item: $("cv-item").value.trim() || "item",
    attrPrefix: $("cv-attr").value, table: $("cv-table").value.trim() || "my_table", fileName,
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
    if (!text.trim()) return report.show("Chưa có nội dung.", "muted");
    let r;
    try { r = Convert.run(text, $("cv-from").value, to, opts()); }
    catch (e) { return report.show(`✖ Không đọc được dữ liệu: ${e.message}`, "bad", e.line ? [{ line: e.line, col: e.col, msg: e.message }] : []); }
    lastOut = r.out; lastTo = to;
    $("cv-out").innerHTML = ViewRender.highlight(r.out, ["json", "xml", "html"].includes(to) ? to : "");
    $("cv-info").textContent = `${LABEL[r.from]} → ${LABEL[to]} · ${TextUtil.countLines(r.out).toLocaleString("vi")} dòng · ${TextUtil.sizeKb(r.out)} KB`;
    const title = `${LABEL[r.from]} → ${LABEL[to]}`;
    report.show(r.fixes.length ? `✔ Đã chuyển ${title}. Tự sửa ${r.fixes.length} lỗi ở dữ liệu nguồn, xem danh sách bên dưới.` : `✔ Đã chuyển ${title}.`,
      r.fixes.length ? "warn" : "good", [...r.fixes, ...r.notes.map(msg => ({ line: 0, msg }))]);
  }

  function load(name, text, from = "auto") {
    fileName = name;
    $("cv-from").value = from;
    ed.set(text);
    $("cv-fname").textContent = name || "dán nội dung hoặc kéo thả file vào đây";
    run();
  }

  const onFile = f => Dom.readFile(f, (name, text) => text === null ? report.show(`✖ Không đọc được file ${name}`, "bad") : load(name, text));

  function swap() {
    if (!lastOut || !FROM.includes(lastTo)) return report.show(`Không thể đảo chiều: ${LABEL[lastTo] || "kết quả"} không đọc ngược lại được.`, "muted");
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
    ed = LineEditor($("cv-src"), { draftKey: "convert", onChange: () => { if (ed.value.length < AUTO_LIMIT) run(); } });
    report = ReportPanel($("cv-status"), $("cv-msgs"), ed);
    $("cv-file").onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; };
    $("cv-run").onclick = run;
    $("cv-swap").onclick = swap;
    $("cv-clear").onclick = () => { lastOut = ""; $("cv-out").textContent = ""; $("cv-info").textContent = ""; load("", ""); };
    document.querySelectorAll('[data-wb-panel="convert"] .toolbar select:not(#cv-demo), [data-wb-panel="convert"] .toolbar input:not([type=file])')
      .forEach(el => el.addEventListener("change", () => { if (ed.value.length < AUTO_LIMIT) run(); else refreshOptions(); }));
    $("cv-copy").onclick = () => lastOut && Dom.copy(lastOut).then(ok => {
      $("cv-info").textContent = ok ? "Đã sao chép kết quả." : "Trình duyệt chặn sao chép — hãy bôi đen kết quả rồi nhấn Ctrl+C.";
    });
    $("cv-save").onclick = () => {
      if (!lastOut) return;
      const bom = lastTo === "csv" || lastTo === "tsv" ? "﻿" : "";
      Dom.download(bom + lastOut, `${Dom.baseName(fileName)}.${Convert.EXT[lastTo]}`);
    };
    $("cv-demo").onchange = e => { demo(e.target.value); e.target.value = ""; };
    Workbench.bindSendTo($("cv-send"), "convert", () => lastOut ? { text: lastOut, kind: lastTo } : null);
    run();
  }

  Workbench.register("convert", {
    label: "Chuyển đổi", init, onFile, demo, primary: run,
    receive: (text, meta) => load("", text, FROM.includes(meta.kind) ? meta.kind : "auto"),
  });
})();
