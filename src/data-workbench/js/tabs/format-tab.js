// Tab "Format JSON · XML · HTML": check, tolerant repair, pretty / minify / escape-to-string, sort keys, decode nested JSON, tree.
(() => {
  const KIND_LABEL = { json: "JSON", xml: "XML", html: "HTML" };
  const HINT = "Bấm “Format & sửa lỗi” để tự sửa.";
  let ed, report, fileName = "", lastOut = "", lastKind = "", redo = () => check();

  const kind = () => $("fmt-kind").value === "auto" ? Detect.markup(ed.value, fileName) : $("fmt-kind").value;

  function check() {
    const text = ed.value, k = kind();
    redo = check;
    $("fmt-kind-now").textContent = text.trim() ? T("Định dạng: {k}", { k: KIND_LABEL[k] }) : "";
    if (!text.trim()) return report.show(T("Chưa có nội dung."), "muted");
    if (k === "json") {
      const e = JsonTool.check(text);
      return report.show(e ? `${T("✖ JSON bị lỗi cú pháp (dòng {line}, cột {col}).", e)} ${T(HINT)}` : T("✔ JSON hợp lệ."), e ? "bad" : "good", e ? [e] : []);
    }
    if (k === "xml") {
      const e = MarkupTool.checkXml(text);
      return report.show(e ? `${T("✖ XML bị lỗi cú pháp (dòng {line}, cột {col}).", e)} ${T(HINT)}` : T("✔ XML hợp lệ (well-formed)."), e ? "bad" : "good", e ? [e] : []);
    }
    const { fixes } = MarkupTool.build(text, true);
    report.show(fixes.length ? T("⚠ HTML có {n} lỗi cấu trúc (trình duyệt vẫn hiển thị được nhưng nên sửa).", { n: fixes.length }) : T("✔ HTML có cấu trúc thẻ hợp lệ."), fixes.length ? "warn" : "good", fixes);
  }

  // mode: "pretty" | "min" | "escape" (minified output wrapped as one JSON string literal)
  function run(mode) {
    const text = ed.value, k = kind(), indent = TextUtil.indentUnit($("fmt-indent").value);
    if (!text.trim()) return check();
    redo = () => run(mode);
    let out, model, stat, fixes = [];
    const notes = [];
    try {
      if (k === "json") {
        const r = JsonTool.parse(text);
        fixes = r.fixes; model = r.ast;
        if ($("fmt-nested").checked) {
          const d = JsonAst.decodeNested(model);
          model = d.ast;
          if (d.count) notes.push({ line: 0, msg: T("Đã giải {n} chuỗi JSON lồng thành object/mảng (theo tuỳ chọn)", { n: d.count }) });
        }
        if ($("fmt-sort").checked) model = JsonAst.sortKeys(model);
        out = JsonTool.stringify(model, mode === "pretty" ? indent : "");
        const s = JsonAst.stats(model);
        stat = T("{nodes} nút · sâu {depth}", { nodes: I18n.num(s.nodes), depth: s.depth });
      } else {
        const html = k === "html", r = MarkupTool.build(text, html);
        fixes = r.fixes; model = r.root;
        out = mode === "pretty" ? MarkupTool.serialize(model, indent, html) : MarkupTool.minify(model, html);
        const s = MarkupTool.stats(model);
        stat = T("{n} thẻ · sâu {depth}", { n: I18n.num(s.elements), depth: s.depth });
      }
    } catch (e) { return report.show(T("✖ Không xử lý được: {msg}", { msg: e.message }), "bad"); }
    if (mode === "escape") out = JSON.stringify(out);
    lastOut = out; lastKind = mode === "escape" ? "json" : k;
    $("fmt-out").innerHTML = ViewRender.highlight(out, lastKind);
    $("fmt-tree").innerHTML = ViewRender.tree(model, k);
    $("fmt-info").textContent = `${KIND_LABEL[k]} · ${stat} · ` + T("kết quả {lines} dòng, {kb} KB (gốc {src} KB)", { lines: I18n.num(TextUtil.countLines(out)), kb: TextUtil.sizeKb(out), src: TextUtil.sizeKb(text) });
    report.show(fixes.length ? T("✔ Đã xử lý. Tự sửa {n} lỗi cú pháp, xem danh sách bên dưới và kiểm tra lại kết quả.", { n: fixes.length })
                             : T("✔ Đã xử lý. Nội dung gốc không có lỗi cú pháp."), fixes.length ? "warn" : "good", [...fixes, ...notes]);
  }

  const showName = () => { $("fmt-fname").textContent = fileName || T("dán nội dung hoặc kéo thả file vào đây"); };

  function load(name, text) {
    fileName = name;
    ed.set(text);
    showName();
    check();
  }

  const onFile = f => Dom.readFile(f, (name, text) => text === null ? report.show(T("✖ Không đọc được file {name}", { name }), "bad") : load(name, text));

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
      $("fmt-info").textContent = ok ? T("Đã sao chép kết quả.") : T("Trình duyệt chặn sao chép — hãy bôi đen kết quả rồi nhấn Ctrl+C.");
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
    relang: () => { showName(); redo(); },
  });
})();
