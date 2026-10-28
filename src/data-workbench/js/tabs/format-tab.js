// Tab "Format JSON · XML · HTML": check, tolerant repair, pretty / minify / escape-to-string, sort keys, decode nested JSON, tree.
(() => {
  const KIND_LABEL = { json: "JSON", xml: "XML", html: "HTML" };
  const HINT = "Bấm “Format & sửa lỗi” để tự sửa.";
  let ed, report, fileName = "", lastOut = "", lastKind = "";

  const kind = () => $("fmt-kind").value === "auto" ? Detect.markup(ed.value, fileName) : $("fmt-kind").value;

  function check() {
    const text = ed.value, k = kind();
    $("fmt-kind-now").textContent = text.trim() ? `Định dạng: ${KIND_LABEL[k]}` : "";
    if (!text.trim()) return report.show("Chưa có nội dung.", "muted");
    if (k === "json") {
      const e = JsonTool.check(text);
      return report.show(e ? `✖ JSON bị lỗi cú pháp (dòng ${e.line}, cột ${e.col}). ${HINT}` : "✔ JSON hợp lệ.", e ? "bad" : "good", e ? [e] : []);
    }
    if (k === "xml") {
      const e = MarkupTool.checkXml(text);
      return report.show(e ? `✖ XML bị lỗi cú pháp (dòng ${e.line}, cột ${e.col}). ${HINT}` : "✔ XML hợp lệ (well-formed).", e ? "bad" : "good", e ? [e] : []);
    }
    const { fixes } = MarkupTool.build(text, true);
    report.show(fixes.length ? `⚠ HTML có ${fixes.length} lỗi cấu trúc (trình duyệt vẫn hiển thị được nhưng nên sửa).` : "✔ HTML có cấu trúc thẻ hợp lệ.", fixes.length ? "warn" : "good", fixes);
  }

  // mode: "pretty" | "min" | "escape" (minified output wrapped as one JSON string literal)
  function run(mode) {
    const text = ed.value, k = kind(), indent = TextUtil.indentUnit($("fmt-indent").value);
    if (!text.trim()) return check();
    let out, model, stat, fixes = [];
    const notes = [];
    try {
      if (k === "json") {
        const r = JsonTool.parse(text);
        fixes = r.fixes; model = r.ast;
        if ($("fmt-nested").checked) {
          const d = JsonAst.decodeNested(model);
          model = d.ast;
          if (d.count) notes.push({ line: 0, msg: `Đã giải ${d.count} chuỗi JSON lồng thành object/mảng (theo tuỳ chọn)` });
        }
        if ($("fmt-sort").checked) model = JsonAst.sortKeys(model);
        out = JsonTool.stringify(model, mode === "pretty" ? indent : "");
        const s = JsonAst.stats(model);
        stat = `${s.nodes.toLocaleString("vi")} nút · sâu ${s.depth}`;
      } else {
        const html = k === "html", r = MarkupTool.build(text, html);
        fixes = r.fixes; model = r.root;
        out = mode === "pretty" ? MarkupTool.serialize(model, indent, html) : MarkupTool.minify(model, html);
        const s = MarkupTool.stats(model);
        stat = `${s.elements.toLocaleString("vi")} thẻ · sâu ${s.depth}`;
      }
    } catch (e) { return report.show("✖ Không xử lý được: " + e.message, "bad"); }
    if (mode === "escape") out = JSON.stringify(out);
    lastOut = out; lastKind = mode === "escape" ? "json" : k;
    $("fmt-out").innerHTML = ViewRender.highlight(out, lastKind);
    $("fmt-tree").innerHTML = ViewRender.tree(model, k);
    $("fmt-info").textContent = `${KIND_LABEL[k]} · ${stat} · kết quả ${TextUtil.countLines(out).toLocaleString("vi")} dòng, ${TextUtil.sizeKb(out)} KB (gốc ${TextUtil.sizeKb(text)} KB)`;
    report.show(fixes.length ? `✔ Đã xử lý. Tự sửa ${fixes.length} lỗi cú pháp, xem danh sách bên dưới và kiểm tra lại kết quả.`
                             : "✔ Đã xử lý. Nội dung gốc không có lỗi cú pháp.", fixes.length ? "warn" : "good", [...fixes, ...notes]);
  }

  function load(name, text) {
    fileName = name;
    ed.set(text);
    $("fmt-fname").textContent = name || "dán nội dung hoặc kéo thả file vào đây";
    check();
  }

  const onFile = f => Dom.readFile(f, (name, text) => text === null ? report.show(`✖ Không đọc được file ${name}`, "bad") : load(name, text));

  function demo(name) {
    const d = DEMOS.format[name];
    if (!d) return;
    if (name === "nested") $("fmt-nested").checked = true;
    load(d.name, d.text);
    run("pretty");
  }

  function clear() {
    lastOut = "";
    $("fmt-out").textContent = ""; $("fmt-tree").innerHTML = ""; $("fmt-info").textContent = "";
    load("", "");
  }

  function init() {
    ed = LineEditor($("fmt-src"), { draftKey: "format", onChange: () => { if (ed.value.length < 3e6) check(); } });
    report = ReportPanel($("fmt-status"), $("fmt-msgs"), ed);
    $("fmt-file").onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; };
    $("fmt-check").onclick = check;
    $("fmt-run").onclick = () => run("pretty");
    $("fmt-min").onclick = () => run("min");
    $("fmt-escape").onclick = () => run("escape");
    $("fmt-clear").onclick = clear;
    $("fmt-kind").onchange = check;
    $("fmt-copy").onclick = () => lastOut && Dom.copy(lastOut).then(ok => {
      $("fmt-info").textContent = ok ? "Đã sao chép kết quả." : "Trình duyệt chặn sao chép — hãy bôi đen kết quả rồi nhấn Ctrl+C.";
    });
    $("fmt-use").onclick = () => { if (lastOut) { ed.set(lastOut); check(); } };
    $("fmt-save").onclick = () => {
      if (!lastOut) return;
      const ext = fileName.includes(".") ? fileName.split(".").pop() : lastKind;
      Dom.download(lastOut, `${Dom.baseName(fileName)}.formatted.${ext}`);
    };
    document.querySelectorAll("#fmt-view [data-view]").forEach(b => {
      b.onclick = () => {
        document.querySelectorAll("#fmt-view [data-view]").forEach(x => x.classList.toggle("on", x === b));
        $("fmt-out").hidden = b.dataset.view !== "out"; $("fmt-tree").hidden = b.dataset.view !== "tree";
      };
    });
    $("fmt-demo").onchange = e => { demo(e.target.value); e.target.value = ""; };
    Workbench.bindSendTo($("fmt-send"), "format", () => lastOut ? { text: lastOut, kind: lastKind } : null);
    check();
  }

  Workbench.register("format", {
    label: "Format JSON · XML · HTML", init, onFile, demo,
    primary: () => run("pretty"),
    receive: (text, meta) => { load("", text); if (KIND_LABEL[meta.kind]) run("pretty"); },
  });
})();
