// Real disk path of an Explorer node: a page cannot see it, so the opened folder's full path is typed once per folder name and kept in Prefs.
const LocalRoot = (() => {
  const KEY = "tgitRoots", BS = String.fromCharCode(92);
  const roots = () => { const v = Prefs.get(KEY, {}); return v && typeof v === "object" ? v : {}; };
  const of = name => { const v = roots(); return Object.hasOwn(v, name) && typeof v[name] === "string" ? v[name] : ""; };
  // Drive path (C:\...) or UNC share (two slashes, server, share); a quote would break a "…" argument.
  const valid = p => /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/][^\\/]+)/.test(p) && !/["\r\n]/.test(p);

  function ask(root, current = "") {
    const ex = "C:" + BS + "Projects" + BS + root.name;
    const v = prompt(T("Trình duyệt không cho trang web biết đường dẫn thật của folder. Nhập đường dẫn đầy đủ của folder “{name}” trên máy (vd {ex}):", { name: root.name, ex }), current);
    if (v == null) return null;
    let p = v.trim().replace(/^"|"$/g, "").split("/").join(BS);
    if (!valid(p)) { StatusBar.msg(T("“{path}” chưa phải đường dẫn đầy đủ — cần dạng {ex}.", { path: p, ex }), "bad"); return null; }
    p = p.replace(/[\\]+$/, "");
    if (/^[A-Za-z]:$/.test(p)) p += BS;
    Prefs.set(KEY, { ...roots(), [root.name]: p });
    return p;
  }

  // node.path is "<root name>/<rel>"; joined onto the typed root path with backslashes.
  function abs(node, rootPath, root = Explorer.root()) {
    const rel = node.path === root.path ? "" : node.path.slice(root.path.length + 1);
    return rootPath + (rel ? (rootPath.endsWith(BS) ? "" : BS) + rel.split("/").join(BS) : "");
  }

  // Full path of a node in the opened folder, asking for the root path the first time; "" when cancelled.
  function resolve(node) {
    const root = Explorer.root(), p = root && (of(root.name) || ask(root));
    return p ? abs(node, p, root) : "";
  }

  // Full path without asking: "" when the root path is not set or the node is not on disk.
  function known(node) {
    const root = Explorer.root(), p = root && !root.remote && of(root.name);
    return p && (node.path === root.path || node.path.startsWith(root.path + "/")) ? abs(node, p, root) : "";
  }

  return { of, ask, abs, resolve, known, BS };
})();
