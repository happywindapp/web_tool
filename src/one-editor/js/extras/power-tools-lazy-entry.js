// Phase 9 tools: tools/one-editor-power-tools.js, loaded on first use; per-source op settings live here (links / demos preset them).
const PowerTools = (() => {
  let ready = null;
  const states = new Map();
  const load = () => ready ??= VendorPaths.load("powerTools").then(() => PowerOps.init())
    .catch(e => { ready = null; throw new Error(T("Không nạp được bộ công cụ mở rộng ({file}) — cần file này nằm cạnh one-editor.html.", { file: e.message })); });
  const use = fn => load().then(fn).catch(e => StatusBar.msg(e.message, "bad"));
  const op = name => async (t, c) => { await load(); return PowerOps[name](t, c); };
  const state = (srcId, opId) => { const k = srcId + " " + opId; if (!states.has(k)) states.set(k, {}); return states.get(k); };
  // A Markdown paste may be an Excel table (TSV).
  const pasted = u => {
    const g = Views.groups.find(x => x.view === u.view);
    if (!g || Docs.effectiveLang(Docs.get(g.active)) !== "Markdown") return;
    let rows = false;
    u.transactions.forEach(tr => tr.isUserEvent("input.paste") && tr.changes.iterChanges((a, b, c, d, ins) => { const t = ins.toString(); rows ||= t.includes("\t") && t.trim().includes("\n"); }));
    if (rows) use(() => MdActions.fromUpdate(u));
  };
  return { load, use, op, state, pasted };
})();
