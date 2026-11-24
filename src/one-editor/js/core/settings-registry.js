// Settings registry (pure, node test): each entry borrows get / set from the module that holds the value, so the ⚙ Settings tab and the old switches are one value; groups, search (Vietnamese + English, accents ignored), defaults, change listeners.
const Settings = (() => {
  const GROUPS = [["explorer", "Explorer & tab folder"], ["editor", "Editor"], ["keys", "Phím tắt"], ["preview", "Preview & dịch"], ["data", "Dữ liệu đã lưu"]];
  const TYPES = new Set(["bool", "choice", "number", "text", "info"]), list = [], listeners = [];

  // e: { id, group, label, hint, type: "bool" | "choice" | "number" | "text" | "info", get(), set(v), def, choices() → [[value, label]], min, max, actions() → [[label, run]] }.
  function add(e) {
    if (!e?.id || list.some(x => x.id === e.id)) throw new Error("Settings: bad or duplicate id " + e?.id);
    if (!GROUPS.some(g => g[0] === e.group) || !TYPES.has(e.type || "bool")) throw new Error("Settings: bad group / type for " + e.id);
    list.push({ type: "bool", ...e });
  }

  const entry = id => list.find(e => e.id === id) || null;
  const inGroup = g => list.filter(e => e.group === g);
  const hasDefault = e => e.type !== "info" && "def" in e;
  const isDefault = e => !hasDefault(e) || e.get() === e.def;

  const changed = () => listeners.forEach(fn => fn());
  async function set(e, v) {
    if (e.type === "number") {
      if (String(v).trim() === "" || !Number.isFinite(+v)) return;
      v = Math.min(e.max ?? Infinity, Math.max(e.min ?? -Infinity, Math.round(+v)));
    }
    await e.set(v);
    changed();
  }
  const reset = e => (isDefault(e) ? Promise.resolve() : set(e, e.def));
  async function resetGroup(g) { for (const e of inGroup(g)) await reset(e); }

  // Every word of q in the label / hint / group name, in Vietnamese or translated by tr.
  function search(q, tr = s => s) {
    const words = NameMatch.fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const group = g => GROUPS.find(x => x[0] === g)[1];
    return list.filter(e => {
      const hay = NameMatch.fold([e.label, e.hint || "", group(e.group)].flatMap(s => [s, tr(s)]).join(" "));
      return words.every(w => hay.includes(w));
    });
  }

  return { GROUPS, add, all: () => [...list], entry, inGroup, hasDefault, isDefault, set, reset, resetGroup, search, changed, onChange: fn => listeners.push(fn) };
})();
