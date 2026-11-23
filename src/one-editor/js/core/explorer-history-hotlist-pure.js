// Pure (node test): folder tab ← → history jumps of several steps (the Windows history list) and the recently visited folders per opened root (Ctrl+D).
const FolderNav = (() => {
  // dir -1 = back, +1 = forward, `steps` steps at once from `here`. → { past, next, to } (to = the path to show), null when the history is shorter.
  function jump(past, next, here, dir, steps = 1) {
    const from = dir < 0 ? past : next, other = dir < 0 ? next : past;
    if (!Number.isInteger(steps) || steps < 1 || from.length < steps) return null;
    const keep = from.slice(0, from.length - steps), moved = from.slice(from.length - steps);
    // The steps passed over join the other list so the opposite button walks them back one by one.
    const passed = [...other, here, ...moved.slice(1).reverse()];
    return dir < 0 ? { past: keep, next: passed, to: moved[0] } : { past: passed, next: keep, to: moved[0] };
  }

  // entries: [[root, [path, …]]] newest root first; a path goes to the front of its root's list (≤ max), the least recent roots drop past `roots`.
  function remember(entries, path, max = 20, roots = 20) {
    const root = path.split("/")[0], src = Array.isArray(entries) ? entries.filter(e => Array.isArray(e) && typeof e[0] === "string" && Array.isArray(e[1])) : [];
    const old = src.find(e => e[0] === root)?.[1] || [];
    const list = [path, ...old.filter(p => typeof p === "string" && p !== path)].slice(0, max);
    return [[root, list], ...src.filter(e => e[0] !== root)].slice(0, roots);
  }
  const recent = (entries, root) => (Array.isArray(entries) ? entries.find(e => Array.isArray(e) && e[0] === root)?.[1] : null)?.filter(p => typeof p === "string") || [];

  return { jump, remember, recent };
})();
