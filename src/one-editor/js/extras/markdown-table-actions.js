// Markdown editor actions: TSV paste → table, selection (TSV / CSV) or clipboard → table, align every table, insert / refresh the TOC.
const MdActions = (() => {
  const editable = () => {
    const d = Views.activeDoc(), v = d && Views.activeView();
    if (!v) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return null; }
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return null; }
    return v;
  };

  // After a paste into a Markdown tab: pasted rows with tabs, still unchanged → swapped for a table in a second transaction (Ctrl+Z gives the raw paste back).
  function fromUpdate(u) {
    if (u.state.readOnly) return;
    let r = null;
    u.transactions.forEach(tr => { if (tr.isUserEvent("input.paste")) tr.changes.iterChanges((a, b, from, to) => { r = { from, to }; }); });
    const t = r && u.state.sliceDoc(r.from, r.to);
    if (t && t.includes("\t") && t.trim().includes("\n")) pasted(u.view, r.from, r.to, t);
  }

  function pasted(view, from, to, text) {
    if (view.state.doc.length < to || view.state.sliceDoc(from, to) !== text) return;
    // Tab-indented code (empty first cell) or a paste inside a code block stays as pasted.
    const node = CM.language.syntaxTree(view.state).resolveInner(from, 1);
    for (let n = node; n; n = n.parent) if (/Code/.test(n.name)) return;
    if (text.split("\n").filter(l => l.trim()).some(l => !l.split("\t")[0].trim())) return;
    const table = MdTable.fromTsv(text);
    if (!table) return;
    view.dispatch({ changes: { from, to, insert: table + (text.endsWith("\n") ? "\n" : "") }, userEvent: "input.transform" });
    StatusBar.msg(T("✔ Đã đổi bảng dán từ Excel (TSV) thành bảng Markdown — Ctrl+Z để giữ nguyên TSV."), "good");
  }

  const fromText = t => MdTable.fromTsv(t) || (() => { const r = CsvTool.parse(t.replace(/\r?\n$/, "")).rows; return r.length >= 2 && r[0].length >= 2 ? MdTable.fromRows(r) : null; })();
  async function toTable() {
    const v = editable();
    if (!v) return;
    const sel = v.state.selection.main;
    let text = v.state.sliceDoc(sel.from, sel.to);
    if (!text) {
      try { text = await navigator.clipboard.readText(); } catch { text = ""; }
      if (!text) { StatusBar.msg(T("Chọn các dòng TSV / CSV trước (hoặc cho phép đọc clipboard), rồi chạy lại lệnh."), "warn"); return; }
    }
    const table = fromText(text);
    if (!table) { StatusBar.msg(T("Không thấy bảng: cần ≥ 2 dòng, ≥ 2 cột, cách nhau bằng Tab hoặc dấu phẩy."), "warn"); return; }
    const mid = sel.from > v.state.doc.lineAt(sel.from).from;
    v.dispatch({ changes: { from: sel.from, to: sel.to, insert: (mid ? "\n" : "") + table + "\n" }, userEvent: "input.transform" });
    StatusBar.msg(T("✔ Đã tạo bảng Markdown — Ctrl+Z để hoàn tác."), "good");
  }

  // Inside the selection when there is one, else every table of the tab.
  function align() {
    const v = editable();
    if (!v) return;
    const sel = v.state.selection.main, [from, to] = sel.empty ? [0, v.state.doc.length] : [v.state.doc.lineAt(sel.from).from, v.state.doc.lineAt(sel.to).to];
    const text = v.state.sliceDoc(from, to), r = MdTable.format(text);
    if (!r.count) { StatusBar.msg(T("Không thấy bảng Markdown (dòng tiêu đề + dòng | --- |)."), "warn"); return; }
    if (r.text !== text) { const d = BatchRules.diff(text, r.text); v.dispatch({ changes: { from: from + d.from, to: from + d.to, insert: d.insert }, userEvent: "input.transform" }); }
    StatusBar.msg(T("✔ Đã căn {n} bảng.", { n: r.count }), "good");
  }

  // An existing <!-- toc --> block is replaced; otherwise the TOC goes at the cursor line.
  function toc() {
    const v = editable();
    if (!v) return;
    const md = v.state.doc.toString(), t = MdTable.toc(md);
    if (!t) { StatusBar.msg(T("Không có tiêu đề (#, ##…) để làm mục lục."), "warn"); return; }
    const old = MdTable.tocRange(md), at = v.state.doc.lineAt(v.state.selection.main.head).from;
    v.dispatch({ changes: old ? { ...old, insert: t } : { from: at, insert: t + "\n\n" }, userEvent: "input.transform" });
    StatusBar.msg(old ? T("✔ Đã cập nhật mục lục.") : T("✔ Đã chèn mục lục — chạy lại lệnh để cập nhật."), "good");
  }

  return { fromUpdate, toTable, align, toc };
})();
