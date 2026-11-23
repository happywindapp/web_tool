// Explorer git status icons like TortoiseGit overlays: a listed folder holding .git is scanned read-only (isomorphic-git, lazy vendor); rescans on 🔄 / disk change, focus and save.
const GitStatus = (() => {
  const repos = new Map(), subs = new Set();
  const LABEL = { c: "không đổi", m: "đã sửa", a: "đã thêm (add), chưa commit", d: "đã gỡ khỏi Git (git rm --cached), chưa commit", u: "chưa theo dõi (untracked)", i: "bị bỏ qua (.gitignore) hoặc folder rỗng" };
  const MARK = { c: "✓", m: "!", a: "+", d: "✕", u: "?" };
  const on = () => Prefs.get("gitIcons", true) !== false;
  const sigOf = result => result ? [...result.files].join("|") : "";

  // A node still in the Explorer tree (renamed / deleted folders drop out when their parent is listed again).
  function attached(n) {
    for (; n.parent; n = n.parent) if (!n.parent.children?.includes(n)) return false;
    return n === Explorer.root();
  }

  // No cache kept between scans: isomorphic-git would hold whole packfiles in memory for the session.
  async function scan(r) {
    if (r.busy) { r.again = true; return; }
    r.busy = true;
    let err = null;
    try {
      await VendorPaths.load("isoGit");
      r.result = await GitStatusModel.scan(git, r.node.handle, {});
      r.warned = false;
    } catch (e) { r.result = null; err = e; }
    if (err && !await r.node.handle.getDirectoryHandle(".git").catch(() => null)) repos.delete(r.node.path);
    else if (err && !r.warned) {
      r.warned = true;
      StatusBar.msg(err.code === "EBIGPACK" ? T("“{name}”: packfile git lớn hơn 300 MB — không hiện biểu tượng Git để khỏi treo trang.", { name: r.node.name }) : T("Không đọc được trạng thái Git của “{name}”: {msg}", { name: r.node.name, msg: err.message }), "warn");
    }
    r.busy = false;
    const sig = sigOf(r.result);
    if (sig !== r.sig || repos.get(r.node.path) !== r) { r.sig = sig; Explorer.render(); }
    if (r.again && repos.get(r.node.path) === r) { r.again = false; scan(r); }
  }

  // After a folder is listed: a .git folder makes it a repo; a .git file (submodule, worktree) marks content the outer repo does not describe.
  function found(node) {
    if (!node.handle || !node.children) return;
    const dotgit = node.children.find(c => c.name === ".git");
    const sub = !!dotgit && !dotgit.dir;
    if (sub !== subs.has(node.path)) { if (sub) subs.add(node.path); else subs.delete(node.path); Explorer.render(); }
    if (!dotgit?.dir) { if (repos.delete(node.path)) Explorer.render(); return; }
    if (repos.has(node.path)) return;
    const r = { node, result: null, sig: "", busy: false, again: false, warned: false };
    repos.set(node.path, r);
    if (on()) scan(r);
  }

  function rescan() {
    if (!on()) return;
    for (const [path, r] of repos) if (attached(r.node)) scan(r); else repos.delete(path);
  }
  const soon = Dom.debounce(rescan, 800);
  const reset = () => { repos.clear(); subs.clear(); };

  function repoOf(node) {
    for (let n = node; n; n = n.parent) { const r = repos.get(n.path); if (r) return r; }
    return null;
  }

  function stateOf(node) {
    if (!on()) return null;
    for (let n = node; n; n = n.parent) {
      if (subs.has(n.path)) return null;
      const r = repos.get(n.path);
      if (r) return r.result ? GitStatusModel.lookup(r.result, n === node ? "" : node.path.slice(n.path.length + 1), node.dir) : null;
    }
    return null;
  }
  const label = node => { const s = stateOf(node); return s ? T(LABEL[s]) : ""; };

  // el shows "icon name" (name: the shown name): the icon gets the overlay mark, an ignored row is dimmed; → the state text for the tooltip.
  function paint(el, icon, node, name = node.name) {
    const s = stateOf(node);
    if (!s) return "";
    el.classList.toggle("git-ignored", s === "i");
    if (MARK[s]) {
      const ico = document.createElement("span"), mark = document.createElement("i");
      ico.className = "git-ico";
      ico.textContent = icon;
      mark.className = "git-mark git-" + s;
      mark.textContent = MARK[s];
      mark.setAttribute("aria-hidden", "true");
      ico.append(mark);
      el.replaceChildren(ico, " " + name);
    }
    return "Git: " + T(LABEL[s]);
  }

  function toggle() {
    const next = !on();
    Prefs.set("gitIcons", next);
    if (next) rescan();
    Explorer.render();
    StatusBar.msg(T(next ? "Đã bật biểu tượng Git trong Explorer." : "Đã tắt biểu tượng Git trong Explorer."), "good");
  }

  addEventListener("focus", soon);
  return { found, rescan, soon, reset, repoOf, label, paint, toggle };
})();
