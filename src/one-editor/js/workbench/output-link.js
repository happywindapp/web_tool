// OutputLink: running an operation on a tab writes a linked output tab ("name ⇢ op") in the OTHER view; re-running updates that same tab, live ops follow edits, user and hand-edited tabs are never silently overwritten.
const OutputLink = (() => {
  const LIVE_MAX = 2000000;
  const timers = new Map(), runs = new Map();
  const find = (srcId, op) => Docs.list().find(d => d.kind === "output" && d.link && d.link.src === srcId && d.link.op === op);

  function fail(src, e) {
    const line = e.line || 0;
    StatusBar.msg(e.message + (line ? " — " + T("bấm để tới dòng {n}", { n: line }) : ""), e.warn || e.stopped ? "warn" : "bad", line ? () => Views.revealLine(src, line) : null);
  }

  // quiet: live re-run (no focus change, no success message). Async ops (Prettier, sql-formatter) drop a result overtaken by a newer run.
  async function run(src, opId, quiet = false) {
    const op = OutputOps.get(opId);
    if (!src || !op) return false;
    if (Docs.isList(src)) { StatusBar.msg(T("Tab folder không có nội dung để chạy — mở 1 file trước."), "warn"); return false; }
    src = Docs.root(src);
    if (src.kind === "output" && src.link) {
      const origin = Docs.get(src.link.src);
      if (origin) return run(origin, opId, quiet);
      StatusBar.msg(T("Tab nguồn của “{name}” đã đóng — chạy trên tab nguồn khác.", { name: src.name }), "warn");
      return false;
    }
    let out = find(src.id, opId);
    // A hand-edited result is the user's text now: live runs skip it, a manual run asks first.
    if (out && out.edited && (quiet || !confirm(T("“{name}” đã được sửa tay. Ghi đè bằng kết quả mới?", { name: out.name })))) return false;
    const key = src.id + " " + opId, seq = (runs.get(key) || 0) + 1, ctx = { lang: Docs.effectiveLang(src), name: src.name, id: src.id, quiet, current: () => runs.get(key) === seq };
    runs.set(key, seq);
    let r;
    try { r = await OutputOps.exec(op, Docs.text(src), ctx); }
    catch (e) {
      if (runs.get(key) !== seq) return false;
      FixMarks.show(src, [], e);
      // A pane tab shows the error in place; a live run says nothing more (no status message on every keystroke).
      if (op.pane && Docs.get(out?.id)) PreviewPane.show(out, { error: e });
      if (!quiet || !op.pane || !Docs.get(out?.id)) fail(src, e);
      return false;
    }
    if (runs.get(key) !== seq || !Docs.get(src.id)) return false;
    FixMarks.show(src, r.fixes, r.error);
    const lang = OutputOps.langOf(op, ctx);
    out = find(src.id, opId);
    // Live runs only update: a result tab closed while rendering stays closed.
    if (quiet && (!out || out.edited)) return false;
    if (Views.count < 2) Views.setLayout("2c");
    const srcAt = Views.where(src.id), target = Views.other(srcAt >= 0 ? srcAt : Views.focused);
    if (!out) {
      out = Docs.create({ kind: "output", name: src.name + " ⇢ " + T(op.label), lang, text: r.text, link: { src: src.id, op: opId }, readOnly: !!op.pane });
      if (op.pane) PreviewPane.show(out, r.view);
      Views.open(out, target, false);
    } else {
      if (!op.preview) Views.replaceText(out, r.text);
      if (op.pane) PreviewPane.show(out, r.view);
      if (out.edited) Docs.update(out, { edited: false });
      if (out.lang !== lang) Docs.update(out, { lang }, "lang");
      const at = Views.where(out.id);
      if (at < 0) Views.open(out, target, false); else if (!quiet) Views.activate(at, out.id, false);
    }
    if (r.error) fail(src, r.error); else if (!quiet) report(src, op, out, r);
    return true;
  }

  function report(src, op, out, r) {
    const parts = [T("✔ {op} → View {n}.", { op: T(op.label), n: Views.where(out.id) + 1 })];
    if (op.live === true) parts.push(T("Sửa nguồn là tab kết quả tự cập nhật."));
    parts.push(...r.notes);
    if (r.fixes.length) parts.push(T("Đã tự sửa {n} lỗi ở tab nguồn — bấm để xem danh sách.", { n: r.fixes.length }));
    StatusBar.msg(parts.join(" "), r.tone || (r.fixes.length ? "warn" : "good"), r.fixes.length ? () => FixMarks.openList(src) : null, T("Mở danh sách chỗ đã tự sửa"));
    PhoneLayout.show(Views.where(out.id) + 1);
  }

  // Live outputs of an edited source re-run after a short pause.
  function sourceEdited(src) {
    const outs = Docs.list().filter(d => d.kind === "output" && d.link && d.link.src === src.id && !d.edited && OutputOps.get(d.link.op) && OutputOps.isLive(OutputOps.get(d.link.op), d));
    if (!outs.length || (src.state ? src.state.doc.length : src.text.length) > LIVE_MAX) return;
    clearTimeout(timers.get(src.id));
    timers.set(src.id, setTimeout(() => { timers.delete(src.id); if (Docs.get(src.id)) outs.forEach(o => Docs.get(o.id) && run(src, o.link.op, true)); }, 400));
  }

  return { run, sourceEdited };
})();
