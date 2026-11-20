// Editor side of LineOps: line operations on the lines touched by the selection (whole tab when nothing is selected), transforms on each selection, hash, column numbers.
const NppActions = (() => {
  const editable = () => {
    const v = Views.activeDoc() && Views.activeView();
    if (!v) { StatusBar.msg(T("Chưa có tab nào đang mở."), "warn"); return null; }
    if (v.state.readOnly) { StatusBar.msg(T("Tab chỉ đọc — không đổi được."), "warn"); return null; }
    return v;
  };
  const report = (e, fallback) => StatusBar.msg(e ? e.message : fallback, e ? "bad" : "good");

  function lines(id, arg) {
    const v = editable();
    if (!v) return;
    const st = v.state, sel = st.selection.main, all = sel.empty;
    const last = st.doc.lineAt(sel.to > sel.from && st.doc.lineAt(sel.to).from === sel.to ? sel.to - 1 : sel.to);
    const from = all ? 0 : st.doc.lineAt(sel.from).from, to = all ? st.doc.length : last.to;
    const before = st.sliceDoc(from, to).split("\n"), after = LineOps.lines(id, before, arg), text = after.join("\n");
    if (text === before.join("\n")) { StatusBar.msg(T("Không có gì thay đổi.")); return; }
    v.dispatch({ changes: { from, to, insert: text }, selection: all ? undefined : { anchor: from, head: from + text.length }, userEvent: "input.lines", scrollIntoView: true });
    StatusBar.msg(T("✔ {a} dòng → {b} dòng.", { a: before.length, b: after.length }) + (all ? " " + T("(cả tab)") : ""), "good");
  }

  // Each non-empty selection is transformed; no selection ⇒ the whole tab.
  function text(id) {
    const v = editable();
    if (!v) return;
    const st = v.state, ranges = st.selection.ranges.filter(r => !r.empty);
    const targets = ranges.length ? ranges : [{ from: 0, to: st.doc.length }];
    let changes;
    try { changes = targets.map(r => ({ from: r.from, to: r.to, insert: LineOps.text(id, st.sliceDoc(r.from, r.to)) })); }
    catch (e) { report(e); return; }
    v.dispatch({ changes, userEvent: "input.transform" });
    report(null, T("✔ Đã đổi {n} vùng.", { n: targets.length }));
  }

  async function hash(alg) {
    const v = Views.activeDoc() && Views.activeView();
    if (!v) return;
    const st = v.state, sel = st.selection.ranges.filter(r => !r.empty).map(r => st.sliceDoc(r.from, r.to)).join("\n");
    try {
      const hex = await LineOps.hash(sel || st.doc.toString(), alg);
      StatusBar.msg(T("{alg} ({what}): {hex} — bấm để chép", { alg, what: T(sel ? "vùng chọn" : "cả tab"), hex }), "good", () => Dom.copy(hex), T("Chép mã hash"));
    } catch (e) { report(e); }
  }

  // One number per selection range (column selection / multi-cursor), top to bottom.
  function numbers() {
    const v = editable();
    if (!v) return;
    const ranges = [...v.state.selection.ranges].sort((a, b) => a.from - b.from);
    if (ranges.length < 2) { StatusBar.msg(T("Chọn cột trước (Shift+Alt+kéo, hoặc Ctrl+Alt+↓ thêm con trỏ) rồi chèn số."), "warn"); return; }
    const spec = prompt(T("Số bắt đầu, bước (vd 1, 1 · 001, 5 để thêm số 0 phía trước):"), "1, 1");
    if (spec === null) return;
    let nums;
    try { nums = LineOps.numbers(ranges.length, spec); } catch (e) { report(e); return; }
    v.dispatch({ changes: ranges.map((r, i) => ({ from: r.from, to: r.to, insert: nums[i] })), userEvent: "input.numbers" });
    report(null, T("✔ Đã chèn {n} số.", { n: nums.length }));
  }

  function splitBy() {
    const sep = prompt(T("Tách mỗi dòng tại chuỗi này (vd , hoặc ;):"), ",");
    if (sep) lines("split", sep);
  }

  return { lines, text, hash, numbers, splitBy };
})();
