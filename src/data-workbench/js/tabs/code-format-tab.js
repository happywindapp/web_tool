// Tab "Format CSS · JS": js-beautify (embedded) with common options, conservative CSS minify, browser syntax check for JS.
(() => {
  const LABEL = { css: "CSS", js: "JavaScript" };
  let ed, report, fileName = "", lastOut = "", lastLang = "";

  const lang = () => $("cf-lang").value === "auto" ? Detect.code(ed.value, fileName) : $("cf-lang").value;

  function options(l) {
    const ind = $("cf-indent").value, nl = +$("cf-newlines").value, brace = $("cf-brace").value;
    const common = { indent_size: ind === "tab" ? 1 : +ind, indent_char: ind === "tab" ? "\t" : " ", indent_with_tabs: ind === "tab",
      preserve_newlines: nl !== -1, max_preserve_newlines: Math.max(nl, 0), wrap_line_length: +$("cf-wrap").value, end_with_newline: false };
    if (l === "css") return { ...common, brace_style: brace === "expand" ? "expand" : "collapse", newline_between_rules: true, selector_separator_newline: true };
    return { ...common, brace_style: brace, break_chained_methods: $("cf-chain").checked, unescape_strings: $("cf-unescape").checked,
      e4x: $("cf-jsx").checked, space_before_conditional: true };
  }

  function syncLangUi(l) {
    $("cf-lang-now").textContent = ed.value.trim() ? `Ngôn ngữ: ${LABEL[l]}` : "";
    $("cf-min").disabled = l !== "css";
    document.querySelectorAll('[data-wb-panel="code"] [data-js]').forEach(el => { el.hidden = l !== "js"; });
  }

  // new Function only compiles the code (never calls it); modules, JSX and TypeScript are not plain scripts, so skip them.
  function jsSyntax(code) {
    if ($("cf-jsx").checked) return { skip: "JSX" };
    if (/\.tsx?$/i.test(fileName)) return { skip: "TypeScript" };
    if (/^\s*(import|export)\b/m.test(code)) return { skip: "ES module (import/export)" };
    try { new Function(code); return null; } catch (e) { return { error: e.message }; }
  }

  function show(out, l, status, cls, items = []) {
    lastOut = out; lastLang = l;
    $("cf-out").textContent = out;
    $("cf-info").textContent = `${LABEL[l]} · ${TextUtil.countLines(out).toLocaleString("vi")} dòng · ${TextUtil.sizeKb(out)} KB (gốc ${TextUtil.sizeKb(ed.value)} KB)`;
    report.show(status, cls, items);
  }

  function run() {
    const text = ed.value, l = lang();
    syncLangUi(l);
    if (!text.trim()) return report.show("Chưa có nội dung.", "muted");
    let out;
    try { out = l === "css" ? css_beautify(text, options(l)) : js_beautify(text, options(l)); }
    catch (e) { return report.show(`✖ Không format được: ${e.message}`, "bad"); }
    if (l === "css") return show(out, l, "✔ Đã format CSS.", "good");
    const s = jsSyntax(text);
    if (!s) return show(out, l, "✔ Đã format JavaScript. Trình duyệt không thấy lỗi cú pháp.", "good");
    if (s.skip) return show(out, l, `✔ Đã format JavaScript (bỏ qua kiểm tra cú pháp vì là ${s.skip}).`, "good");
    show(out, l, "⚠ Đã format, nhưng trình duyệt báo lỗi cú pháp — kết quả có thể chưa đúng.", "warn", [{ line: 0, msg: s.error }]);
  }

  function minify() {
    const text = ed.value;
    if (!text.trim()) return report.show("Chưa có nội dung.", "muted");
    const r = CssMin.minify(text);
    show(r.text, "css", `✔ Đã thu gọn CSS${r.comments ? `, bỏ ${r.comments} chú thích` : ""}.`, "good");
  }

  function load(name, text) {
    fileName = name;
    ed.set(text);
    $("cf-fname").textContent = name || "dán mã hoặc kéo thả file vào đây";
    syncLangUi(lang());
  }

  const onFile = f => Dom.readFile(f, (name, text) => text === null ? report.show(`✖ Không đọc được file ${name}`, "bad") : load(name, text));

  function demo(name) {
    const d = DEMOS.code[name];
    if (!d) return;
    load(d.name, d.text);
    run();
  }

  function init() {
    ed = LineEditor($("cf-src"), { draftKey: "code", onChange: () => syncLangUi(lang()) });
    report = ReportPanel($("cf-status"), $("cf-msgs"), ed);
    $("cf-file").onchange = e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ""; };
    $("cf-run").onclick = run;
    $("cf-min").onclick = minify;
    $("cf-clear").onclick = () => { lastOut = ""; $("cf-out").textContent = ""; $("cf-info").textContent = ""; load("", ""); report.show("Chưa có nội dung.", "muted"); };
    $("cf-lang").onchange = () => syncLangUi(lang());
    $("cf-copy").onclick = () => lastOut && Dom.copy(lastOut).then(ok => {
      $("cf-info").textContent = ok ? "Đã sao chép kết quả." : "Trình duyệt chặn sao chép — hãy bôi đen kết quả rồi nhấn Ctrl+C.";
    });
    $("cf-use").onclick = () => { if (lastOut) ed.set(lastOut); };
    $("cf-save").onclick = () => {
      if (!lastOut) return;
      const ext = fileName.includes(".") ? fileName.split(".").pop() : lastLang;
      Dom.download(lastOut, `${Dom.baseName(fileName)}.formatted.${ext}`);
    };
    $("cf-demo").onchange = e => { demo(e.target.value); e.target.value = ""; };
    Workbench.bindSendTo($("cf-send"), "code", () => lastOut ? { text: lastOut, kind: lastLang } : null);
    syncLangUi(lang());
  }

  Workbench.register("code", { label: "Format CSS · JS", init, onFile, demo, primary: run, receive: text => { load("", text); run(); } });
})();
