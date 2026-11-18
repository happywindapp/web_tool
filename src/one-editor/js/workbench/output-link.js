// OutputLink: running an operation on a tab writes a linked output tab ("name ⇢ op") in the OTHER view; re-running updates that same tab, live ops follow edits, user tabs are never overwritten.
const OutputLink = (() => {
  const LIVE_MAX = 2000000;
  const timers = new Map();
  const find = (srcId, op) => Docs.list().find(d => d.kind === "output" && d.link && d.link.src === srcId && d.link.op === op);

  function fail(src, e) {
    const line = e.line || 0;
    StatusBar.msg(e.message + (line ? " — " + T("bấm để tới dòng {n}", { n: line }) : ""), "bad", line ? () => Views.revealLine(src, line) : null);
  }

  // quiet: live re-run (no focus change, no success message).
  function run(src, opId, quiet = false) {
    const op = OutputOps.get(opId);
    if (!src || !op) return false;
    if (src.kind === "output" && src.link) {
      const origin = Docs.get(src.link.src);
      if (origin) return run(origin, opId, quiet);
      StatusBar.msg(T("Tab nguồn của “{name}” đã đóng — chạy trên tab nguồn khác.", { name: src.name }), "warn");
      return false;
    }
    let text;
    try { text = op.run(Docs.text(src)); } catch (e) { fail(src, e); return false; }
    const srcAt = Views.where(src.id), target = srcAt >= 0 ? 1 - srcAt : 1 - Views.focused;
    let out = find(src.id, opId);
    if (!out) {
      out = Docs.create({ kind: "output", name: src.name + " ⇢ " + T(op.label), lang: op.lang, text, link: { src: src.id, op: opId } });
      Views.open(out, target, false);
    } else {
      Views.replaceText(out, text);
      const at = Views.where(out.id);
      if (at < 0) Views.open(out, target, false); else if (!quiet) Views.activate(at, out.id, false);
    }
    if (!quiet) {
      StatusBar.msg(T("✔ {op} → View {n}.", { op: T(op.label), n: Views.where(out.id) + 1 }) + (op.live ? " " + T("Sửa nguồn là tab kết quả tự cập nhật.") : ""), "good");
      PhoneLayout.show(Views.where(out.id) + 1);
    }
    return true;
  }

  // Live outputs of an edited source re-run after a short pause.
  function sourceEdited(src) {
    const outs = Docs.list().filter(d => d.kind === "output" && d.link && d.link.src === src.id && OutputOps.get(d.link.op)?.live);
    if (!outs.length || (src.state ? src.state.doc.length : src.text.length) > LIVE_MAX) return;
    clearTimeout(timers.get(src.id));
    timers.set(src.id, setTimeout(() => { timers.delete(src.id); if (Docs.get(src.id)) outs.forEach(o => Docs.get(o.id) && run(src, o.link.op, true)); }, 400));
  }

  return { run, sourceEdited };
})();
