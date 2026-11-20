// Recipe runner, pure: steps [{ op, on, args }] run in order on the input; stops at the first failing step. Text out (bytes that are not UTF-8 → hex dump).
const RecipeRun = (() => {
  const MAX_IN = 10 * 1024 * 1024, MAX_STEPS = 50, HEX_SHOW = 64 * 1024;

  // Untrusted (link, IndexedDB) → known ops, string / boolean args only.
  function clean(list) {
    return (Array.isArray(list) ? list : []).slice(0, MAX_STEPS).filter(s => s && Object.hasOwn(RecipeOps.OPS, s.op)).map(s => {
      const args = {};
      for (const a of RecipeOps.OPS[s.op].args || []) {
        const v = s.args && s.args[a.k];
        args[a.k] = a.type === "check" ? v === true : a.type === "select" ? (a.options.includes(v) ? v : a.def) : typeof v === "string" ? v.slice(0, 2000) : a.def;
      }
      return { op: s.op, on: s.on !== false, args };
    });
  }
  const step = op => clean([{ op }])[0];

  const size = v => typeof v === "string" ? v.length : v.length;
  function display(v) {
    if (typeof v === "string") return { text: v, binary: false };
    try { return { text: RecipeOps.text(v), binary: false }; } catch { /* not UTF-8: shown as hex below */ }
    const head = [...v.subarray(0, HEX_SHOW)].map(b => b.toString(16).padStart(2, "0"));
    const rows = [];
    for (let i = 0; i < head.length; i += 16) rows.push(i.toString(16).padStart(8, "0") + "  " + head.slice(i, i + 16).join(" "));
    return { text: rows.join("\n") + "\n", binary: true };
  }

  // → { text, binary, states: [{ state: "ok" | "off" | "error" | "skip", kind, size, ms, error }], error: { i, message } | null }.
  async function run(input, steps, now = () => performance.now()) {
    if (input.length > MAX_IN) throw new Error(T("Đầu vào quá lớn ({mb} MB) — recipe nhận tối đa 10 MB.", { mb: (input.length / 1048576).toFixed(1) }));
    let v = input, error = null;
    const states = [];
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (error) { states.push({ state: "skip" }); continue; }
      if (!s.on) { states.push({ state: "off" }); continue; }
      const t0 = now();
      try {
        const next = await RecipeOps.OPS[s.op].run(v, s.args);
        if (size(next) > RecipeOps.MAX_OUT) throw new Error(T("Kết quả vượt {mb} MB — dừng (chống zip bomb).", { mb: RecipeOps.MAX_OUT / 1048576 }));
        v = next;
        states.push({ state: "ok", kind: typeof v === "string" ? "text" : "bytes", size: size(v), ms: Math.round(now() - t0) });
      } catch (e) {
        error = { i, message: e.message };
        states.push({ state: "error", error: e.message });
      }
    }
    return { ...display(v), states, error };
  }

  return { clean, step, run, display, MAX_IN };
})();
