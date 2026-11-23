// Explorer menu "Copy TortoiseGit command": a page can neither run programs nor see a folder's real path, so the command is copied for Win+R / cmd using a root path typed once per folder name.
const TortoiseCmd = (() => {
  const CMDS = [
    ["commit", "Git Commit…"], ["log", "Show log"], ["diff", "Diff", true], ["blame", "Blame", true], ["repostatus", "Check for modifications"],
    ["repobrowser", "Repo-browser"], ["pull", "Pull…"], ["fetch", "Fetch…"], ["push", "Push…"], ["sync", "Git Sync…"],
    ["switch", "Switch/Checkout…"], ["revert", "Revert…"], ["add", "Add…"],
  ];
  const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
  const command = (node, cmd, rootPath) => "TortoiseGitProc.exe /command:" + cmd + ' /path:"' + LocalRoot.abs(node, rootPath) + '"';

  async function copy(node, cmd) {
    const root = Explorer.root(), p = LocalRoot.of(root.name) || LocalRoot.ask(root);
    if (!p) return;
    const text = command(node, cmd, p), ok = await Dom.copy(text);
    StatusBar.msg(ok ? T("✔ Đã chép {cmd} — dán vào Win+R (hoặc cmd) rồi Enter.", { cmd: text }) : T("Không chép được — trình duyệt chặn clipboard."), ok ? "good" : "bad");
  }

  function show(node, x, y) {
    const root = Explorer.root(), p = LocalRoot.of(root.name);
    const items = CMDS.filter(c => !c[2] || !node.dir).map(([cmd, name]) => TabMenu.entry(name, "", () => copy(node, cmd)));
    const where = TabMenu.entry(p ? T("Đổi đường dẫn gốc ({path})…", { path: p }) : T("Đặt đường dẫn gốc của folder…"), "", () => { if (LocalRoot.ask(root, p)) StatusBar.msg(T("Đã lưu đường dẫn gốc của “{name}”.", { name: root.name }), "good"); });
    TabMenu.show([el("div", "menu-head", T("Sao chép lệnh TortoiseGit")), ...items, el("hr", "menu-sep"), where], x, y);
  }

  // Explorer menu entry for a node inside a detected repo.
  function entries(node, head) {
    if (!node.handle || !GitStatus.repoOf(node)) return [];
    return [TabMenu.entry(T("Sao chép lệnh TortoiseGit…"), "", () => { const r = head.getBoundingClientRect(); show(node, r.left + 16, r.bottom); })];
  }

  return { entries, command };
})();
