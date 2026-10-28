// Tab "So sánh": line diff (Myers), JSON structural diff (key order ignored + changed paths), or XML/HTML formatted-then-diff.
(() => {
  const LABEL = { text: "theo dòng", json: "JSON theo cấu trúc", markup: "XML/HTML đã format" };
  const EMPTY = "Chưa có nội dung để so sánh.";
  const AUTO_LIMIT = 200 * 1024, JSON_LIST_MAX = 500;
  let edA, edB, report, hidden = [], cursor = -1;

  function mode(a, b) {
    const m = $("df-mode").value;
    if (m !== "auto") return m;
    const both = re => re.test(a) && re.test(b);
    return both(/^\s*[\[{]/) ? "json" : both(/^\s*</) ? "markup" : "text";
  }

  function prepare(text, m, side, notes) {
    if (m === "json") {
      const r = JsonTool.parse(text);
      if (r.fixes.length) notes.push({ line: 0, msg: T("Bên {side}: tự sửa {n} lỗi cú pháp JSON trước khi so (xem ở tab Format)", { side: T(side), n: r.fixes.length }) });
      return { lines: JsonTool.stringify(JsonAst.sortKeys(r.ast), "  ").split("\n"), value: Val.fromAst(r.ast) };
    }
    if (m === "markup") {
      const html = Detect.markup(text) === "html", r = MarkupTool.build(text, html);
      if (r.fixes.length) notes.push({ line: 0, msg: T("Bên {side}: tự sửa {n} lỗi cấu trúc trước khi so", { side: T(side), n: r.fixes.length }) });
      return { lines: MarkupTool.serialize(r.root, "  ", html).split("\n") };
    }
    return { lines: text.split(/\r?\n/) };
  }

  function key(line) {
    let k = line;
    if ($("df-ws").checked) k = k.trim().replace(/\s+/g, " ");
    if ($("df-case").checked) k = k.toLowerCase();
    return k;
  }

  function run() {
    const a = edA.value, b = edB.value;
    if (!a.trim() && !b.trim()) return report.show(T(EMPTY), "muted");
    const m = mode(a, b), notes = [];
    let A, B;
    try { A = prepare(a, m, "trái", notes); B = prepare(b, m, "phải", notes); }
    catch (e) { return report.show(T("✖ Không đọc được nội dung ({msg}) — thử kiểu “Văn bản theo dòng”.", { msg: e.message }), "bad"); }
    const ops = SeqDiff.diff(A.lines.map(key), B.lines.map(key));
    if (!ops) return report.show(T("✖ Hai bên khác nhau quá nhiều (hơn 3.000 chỗ) — hãy so từng phần nhỏ hơn."), "bad");
    const r = DiffRender.render(A.lines, B.lines, ops, $("df-ctx").checked);
    hidden = r.hidden; cursor = -1;
    $("df-result").innerHTML = r.html;
    const items = [...notes];
    if (m === "json") {
      const diffs = JsonDiff.compare(A.value, B.value, JSON_LIST_MAX);
      items.push(...diffs.map(d => ({ line: 0, msg: JsonDiff.describe(d) })));
      if (diffs.length === JSON_LIST_MAX) items.push({ line: 0, msg: T("Chỉ liệt kê {n} đường dẫn khác đầu tiên", { n: JSON_LIST_MAX }) });
    }
    const { del, ins, mod } = r.stats;
    report.show(del + ins + mod
      ? T("≠ Có khác biệt (so {how}): {mod} dòng bị sửa, {del} dòng chỉ có bên trái, {ins} dòng chỉ có bên phải.", { how: T(LABEL[m]), mod, del, ins })
      : T("✔ Hai bên giống nhau (so {how}).", { how: T(LABEL[m]) }), del + ins + mod ? "warn" : "good", items);
  }

  function nextChange() {
    const starts = [...$("df-result").querySelectorAll("tr.del, tr.ins, tr.mod")]
      .filter(tr => !/\b(del|ins|mod)\b/.test(tr.previousElementSibling ? tr.previousElementSibling.className : ""));
    if (!starts.length) return;
    starts.forEach(tr => tr.classList.remove("cur"));
    cursor = (cursor + 1) % starts.length;
    starts[cursor].classList.add("cur");
    starts[cursor].scrollIntoView({ block: "center" });
  }

  const autoRun = () => { if (edA.value && edB.value && edA.value.length + edB.value.length < AUTO_LIMIT) run(); };
  const readInto = (ed, f) => Dom.readFile(f, (name, text) => { if (text === null) report.show(T("✖ Không đọc được file {name}", { name }), "bad"); else { ed.set(text); autoRun(); } });
  const intoFreeSide = (fill) => fill(edA.value.trim() ? edB : edA);

  function demo(name) {
    const d = DEMOS.diff[name];
    if (!d) return;
    edA.set(d.left); edB.set(d.right);
    run();
  }

  function init() {
    edA = LineEditor($("df-a"), { draftKey: "diff-a", onChange: autoRun });
    edB = LineEditor($("df-b"), { draftKey: "diff-b", onChange: autoRun });
    report = ReportPanel($("df-status"), $("df-msgs"));
    $("df-file-a").onchange = e => { if (e.target.files[0]) readInto(edA, e.target.files[0]); e.target.value = ""; };
    $("df-file-b").onchange = e => { if (e.target.files[0]) readInto(edB, e.target.files[0]); e.target.value = ""; };
    $("df-run").onclick = run;
    $("df-next").onclick = nextChange;
    $("df-swap").onclick = () => { const t = edA.value; edA.set(edB.value); edB.set(t); autoRun(); };
    $("df-clear").onclick = () => { edA.set(""); edB.set(""); $("df-result").innerHTML = ""; report.show(T(EMPTY), "muted"); };
    document.querySelectorAll("#df-mode, #df-ws, #df-case, #df-ctx").forEach(el => el.addEventListener("change", autoRun));
    $("df-result").onclick = e => { const tr = e.target.closest("tr.skip"); if (tr) tr.outerHTML = hidden[+tr.dataset.skip]; };
    $("df-demo").onchange = e => { demo(e.target.value); e.target.value = ""; };
    autoRun();
  }

  Workbench.register("diff", {
    label: "So sánh", init, demo, primary: run,
    onFile: f => intoFreeSide(ed => readInto(ed, f)),
    receive: text => intoFreeSide(ed => { ed.set(text); autoRun(); }),
    relang: run,
  });
})();
