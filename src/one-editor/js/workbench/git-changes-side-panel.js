// Git side panel (⎇, read-only): per repo in the Explorer folder its branch and changed files grouped Modified · Added · Removed · Untracked; click opens the file, ≠ compares it with HEAD.
const GitPanel = (() => {
  const L = SidePanelList, el = L.el, box = $("gtList"), filter = $("gtFilter"), folded = new Set();
  const HEAD = { m: "! Đã sửa", a: "+ Đã thêm", d: "✕ Đã gỡ / xoá", u: "? Chưa theo dõi" };

  // Repo-relative path → file node of the Explorer tree (folders read on the way); null when gone from disk.
  async function nodeOf(r, rel) {
    const i = rel.lastIndexOf("/"), dir = await FolderPaths.resolve(r.node.path + (i < 0 ? "" : "/" + rel.slice(0, i)));
    if (!dir || (i >= 0 && !dir.path.endsWith("/" + rel.slice(0, i)))) return null;
    return (await Explorer.loadKids(dir).catch(() => [])).find(c => !c.dir && c.name === rel.slice(i + 1)) || null;
  }

  async function openFile(r, it) {
    const n = await nodeOf(r, it.path);
    if (!n) { StatusBar.msg(T("“{name}” không còn trên đĩa — dùng ≠ để xem bản HEAD.", { name: it.name }), "warn"); return null; }
    try { const { file, handle } = await n.read(); const d = await FileOpen.open(file, handle, Views.focused); if (d) PhoneLayout.show(Views.where(d.id) + 1); return d; }
    catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: it.name, msg: e.message }), "bad"); return null; }
  }

  async function diff(r, it) {
    let r0;
    try { r0 = await LocalFs.readText(new Blob([await GitHead.read(r.node.handle, it.path)])); }
    catch (e) {
      StatusBar.msg(e.code === "EBIG" ? T("Bản HEAD của “{name}” lớn hơn 5 MB — không so sánh.", { name: it.name }) : e.code === "EBIGPACK" ? T("“{name}”: packfile git lớn hơn 300 MB — không đọc bản HEAD để khỏi treo trang.", { name: r.node.name })
        : e.code === "ENOTINHEAD" ? T("“{name}” chưa có trong HEAD (file mới).", { name: it.name }) : T("Không đọc được bản HEAD của “{name}”: {msg}", { name: it.name, msg: e.message }), "warn");
      return;
    }
    if (r0.binary) { StatusBar.msg(T("“{name}” là file nhị phân — không so sánh.", { name: it.name }), "warn"); return; }
    const name = it.name + " @ HEAD", src = it.code === "d" ? null : await openFile(r, it);
    if (src && !src.hex && !src.big) { ReadOnlyCompare.open(src, name, r0.text); PhoneLayout.show(Views.where(src.id) + 1); }
    else { const d = ReadOnlyCompare.alone(name, LangDetect.detect(it.name, r0.text).id, r0.text); PhoneLayout.show(Views.where(d.id) + 1); }
    StatusBar.msg(T("So sánh “{name}” với bản HEAD (chỉ đọc).", { name: it.name }), "good");
  }

  const row = (r, it) => L.row([it.name, el("small", "sx-path gt-dir", it.dir ? "  " + it.dir : "")], { title: it.path, onclick: () => openFile(r, it),
    acts: it.code === "m" || it.code === "d" ? [L.act("≠", T("So sánh với bản HEAD (chỉ đọc)"), () => diff(r, it))] : [] });

  function repoEl(r) {
    const res = r.result, more = L.act("⋯", T("Sao chép lệnh TortoiseGit (Commit, Show log, Pull, Push, Sync…)"), e => { const b = e.currentTarget.getBoundingClientRect(); TortoiseCmd.show(r.node, b.left, b.bottom); });
    const head = res ? GitChanges.head(res.branch, res.oid) : "…", n = res ? GitChanges.count(res.files) : 0;
    let items;
    if (!res) items = [L.empty(r.error ? (r.error.code === "EBIGPACK" ? T("“{name}”: packfile git lớn hơn 300 MB — không hiện biểu tượng Git để khỏi treo trang.", { name: r.node.name }) : T("Không đọc được trạng thái Git của “{name}”: {msg}", { name: r.node.name, msg: r.error.message })) : T("⏳ Đang quét…"))];
    else {
      const gs = GitChanges.group(res.files, filter.value);
      items = gs.length ? gs.map(g => L.group({ key: r.node.path + ":" + g.code, label: T(HEAD[g.code]), count: g.items.length, folded, cls: "gt-" + g.code, items: g.items.map(it => row(r, it)) }))
        : [L.empty(n ? T("Không có file khớp.") : T("Không có thay đổi."))];
    }
    return L.group({ key: r.node.path, label: "⎇ " + head + " · " + r.node.name, count: n, title: r.node.path, acts: [more], folded, cls: "gt-repo", items });
  }

  function render() {
    const repos = GitStatus.list(), n = repos.reduce((k, r) => k + (r.result ? GitChanges.count(r.result.files) : 0), 0);
    SidePanels.badge("git", n, T("{n} file thay đổi", { n: I18n.num(n) }));
    if (!L.visible("git")) return;
    if (!repos.length) { box.replaceChildren(L.empty(Explorer.root() ? T("Folder đang mở không có repo Git (.git) — hoặc là folder Drive / OneDrive / kéo-thả không có quyền đọc .git.") : T("Chưa mở folder. Mở folder có .git bằng 📂 Mở ▾ → Mở folder (Chrome / Edge).")), L.empty(T("Panel chỉ đọc: không stage / commit; dùng ⋯ để chép lệnh TortoiseGit."))); return; }
    box.replaceChildren(...repos.map(repoEl));
  }

  function show(arg, quiet) {
    GitStatus.watch(true);
    render();
    if (!quiet && !L.coarse()) filter.focus();
  }

  function init() {
    filter.addEventListener("input", L.later("git", render, 200));
    $("gtRefresh").onclick = () => { GitStatus.rescan(); render(); };
    GitStatus.onChange(render);
    I18n.onChange(render);
    SidePanels.register("git", { show, hide: () => GitStatus.watch(false) });
  }

  return { init, render };
})();
