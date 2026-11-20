// "recipe" op: the source tab runs through the steps of its recipe (kept on the result tab, F5-safe); saved recipes in IndexedDB meta "recipes"; share link carries input + steps.
const RecipeOp = (() => {
  const MAX_SAVED = 100;
  let saved = null;
  const steps = srcId => PowerUi.opts(srcId, "recipe", RecipeRun.clean, () => []);

  async function run(t, c) {
    const list = steps(c.id), r = await RecipeRun.run(t, list);
    const out = { text: r.text, view: { kind: "recipe", srcId: c.id, steps: list, text: r.text, binary: r.binary, states: r.states, failed: r.error } };
    if (r.error && !c.quiet) out.error = Object.assign(new Error(T("Recipe: bước {n} ({op}) lỗi — {msg}", { n: r.error.i + 1, op: T(RecipeOps.OPS[list[r.error.i].op].label), msg: r.error.message })), { warn: true });
    else if (!list.length) out.notes = [T("Recipe chưa có bước nào — chọn “+ Thêm bước” trên pane.")];
    return out;
  }

  // New steps are kept at once; the result re-runs now, or after a pause while an argument is typed.
  const timers = new Map();
  function set(srcId, list, later = false) {
    PowerUi.saveOpts(srcId, "recipe", list);
    clearTimeout(timers.get(srcId));
    const go = () => { timers.delete(srcId); const src = Docs.get(srcId); if (src) OutputLink.run(src, "recipe", true); };
    if (later) timers.set(srcId, setTimeout(go, 300)); else go();
  }

  const load = async () => {
    if (saved) return saved;
    let v = [];
    try { v = await NotesDb.getMeta("recipes"); } catch { /* blocked storage: no saved recipes */ }
    return (saved = (Array.isArray(v) ? v : []).filter(r => r && typeof r.name === "string").map(r => ({ name: r.name.slice(0, 80), steps: RecipeRun.clean(r.steps) })));
  };
  async function store(list) {
    if (!(await NotesDb.putMeta("recipes", list))) throw new Error(T("trình duyệt chặn IndexedDB"));
  }
  async function save(name, list) {
    await load();
    const at = saved.findIndex(r => r.name === name);
    if (at < 0 && saved.length >= MAX_SAVED) throw new Error(T("Đã đủ {n} recipe — xoá bớt trước.", { n: MAX_SAVED }));
    const next = saved.slice();
    if (at >= 0) next[at] = { name, steps: list }; else next.push({ name, steps: list });
    await store(next);
    saved = next;
  }
  async function drop(name) { await load(); const next = saved.filter(r => r.name !== name); await store(next); saved = next; }

  // #pako: link with the input tab + the steps; opening it runs the recipe.
  async function share(srcId) {
    const src = Docs.get(srcId);
    if (!src) { StatusBar.msg(T("Tab nguồn của kết quả này đã đóng."), "warn"); return; }
    const payload = { v: 1, views: [[{ n: src.name, l: src.lang || "", t: Docs.text(src) }], []], run: "recipe", opts: steps(srcId) };
    const url = location.href.split(/[?#]/)[0] + "#" + await ShareCodec.encode(payload), ok = await Dom.copy(url);
    if (!ok) prompt(T("Chép link này:"), url);
    StatusBar.msg(T("🔗 Đã chép link recipe ({n} ký tự) — mở link là chạy lại đúng các bước.", { n: I18n.num(url.length) }) + (url.length > 60000 ? " " + T("Link dài — vài ứng dụng chat có thể cắt mất.") : ""), ok ? "good" : "warn");
  }

  return { run, set, steps, load, save, drop, share };
})();
