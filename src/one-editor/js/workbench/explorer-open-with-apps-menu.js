// Explorer "Open with app…" (Windows): VS Code via vscode://, Explorer via search-ms:, and Explorer / Terminal / Git Bash / PowerShell via the oneeditor-open: protocol that OpenWithSetup installs.
const OpenWith = (() => {
  const BS = String.fromCharCode(92);
  const isWindows = () => /Windows/i.test(navigator.userAgentData?.platform || navigator.userAgent || "");
  const dirOf = p => { const d = p.slice(0, p.lastIndexOf(BS)); return /^[A-Za-z]:$/.test(d) ? d + BS : d; };
  // vscode://file/C:/a%20b/x.js:12:3 — segments encoded, the drive kept as "C:".
  const vscodeUrl = (p, at) => "vscode://file/" + p.split(BS).map((s, i) => i === 0 && /^[A-Za-z]:$/.test(s) ? s : encodeURIComponent(s)).join("/") + (at ? ":" + at[0] + ":" + at[1] : "");
  const searchMsUrl = (dir, name) => "search-ms:displayname=" + encodeURIComponent(name) + "&crumb=location:" + encodeURIComponent(dir);
  const protocolUrl = (action, p) => "oneeditor-open:" + action + "?" + encodeURIComponent(p);

  // A link click (not location.href) so the page never starts unloading.
  const launch = url => Object.assign(document.createElement("a"), { href: url }).click();

  // Line:col of the cursor when the file is the active tab of a view.
  async function cursorOf(node) {
    if (node.dir || !node.handle) return null;
    const docs = await ExplorerDisk.openDocsOf(node.handle);
    const g = Views.groups.slice(0, Views.count).find(x => docs.some(d => d.id === x.active));
    if (!g?.view) return null;
    const st = g.view.state, head = st.selection.main.head, ln = st.doc.lineAt(head);
    return [ln.number, head - ln.from + 1];
  }

  async function vscode(node) {
    const p = LocalRoot.resolve(node);
    if (p) launch(vscodeUrl(p, await cursorOf(node)));
  }
  function explorerSearch(node) {
    const p = LocalRoot.resolve(node);
    if (p) launch(searchMsUrl(node.dir ? p : dirOf(p), node.dir ? node.name : node.parent.name));
  }
  function viaProtocol(node, action, app) {
    const p = LocalRoot.resolve(node);
    if (!p) return;
    if (p.startsWith(BS)) { StatusBar.msg(T("Trình mở One Editor chỉ nhận đường dẫn ổ đĩa (C:\\…), không nhận folder mạng \\\\máy\\share."), "bad"); return; }
    launch(protocolUrl(action, p));
    StatusBar.msg(T("Đã gửi lệnh mở {app}. Không thấy gì mở ra? Cài trình mở một lần: Mở bằng ứng dụng… → Cài trình mở cho Windows.", { app }));
  }

  function show(node, x, y) {
    const E = (label, run) => TabMenu.entry(label, "", run), head = text => Object.assign(document.createElement("div"), { className: "menu-head", textContent: text });
    const sep = () => Object.assign(document.createElement("hr"), { className: "menu-sep" }), root = Explorer.root(), rp = LocalRoot.of(root.name);
    TabMenu.show([
      head(T("Mở bằng ứng dụng")),
      E("VS Code", () => vscode(node)),
      E(T("Windows Explorer (search-ms — thử)"), () => explorerSearch(node)),
      sep(), head(T("Cần trình mở One Editor (cài 1 lần)")),
      Object.assign(head(T("⚠ Phần mềm bảo mật (vd Sophos Intercept X) có thể chặn và đóng luôn trình duyệt — khi đó dùng Sao chép đường dẫn.")), { className: "menu-note" }),
      E("Windows Explorer", () => viaProtocol(node, "explorer", "Windows Explorer")),
      E("Terminal", () => viaProtocol(node, "terminal", "Terminal")),
      E(T("Git Bash tại đây"), () => viaProtocol(node, "gitbash", "Git Bash")),
      E(T("PowerShell tại đây"), () => viaProtocol(node, "powershell", "PowerShell")),
      sep(),
      E(T("Cài trình mở cho Windows (tải .ps1)…"), () => OpenWithSetup.download()),
      E(rp ? T("Đổi đường dẫn gốc ({path})…", { path: rp }) : T("Đặt đường dẫn gốc của folder…"), () => { if (LocalRoot.ask(root, rp)) StatusBar.msg(T("Đã lưu đường dẫn gốc của “{name}”.", { name: root.name }), "good"); }),
    ], x, y);
  }

  // Menu entries for a tree node: a browser tab for any node, apps for local nodes on Windows.
  function entries(node, head) {
    const out = [TabMenu.entry(T("Mở ở tab trình duyệt mới"), "", () => BrowserTab.open(node))];
    if (node.handle) out.unshift(TabMenu.entry(T("Mở ở cửa sổ One Editor mới"), "", () => NewWindow.open(node)));
    if (!node.remote && isWindows()) out.push(TabMenu.entry(T("Mở bằng ứng dụng…"), "", () => { const r = head.getBoundingClientRect(); show(node, r.left + 16, r.bottom); }));
    return out;
  }

  return { entries, vscodeUrl, searchMsUrl, protocolUrl, dirOf };
})();
