// Duplicate files below a folder: same size ⇒ same quick key (size + first / last 64 KB, FNV-1a) ⇒ same bytes (4 MB blocks); each group in the 🔎 tab as "n file × size · wasted X", then "keep the newest / oldest / shortest path" selects the other copies for Delete (recycle bin, Ctrl+Z).
const DupFinder = (() => {
  const EDGE = 64 * 1024;
  const fileOf = async f => (f.file ??= (await f.node.read()).file);

  async function quickKey(f) {
    const file = await fileOf(f), head = new Uint8Array(await file.slice(0, EDGE).arrayBuffer());
    const tail = file.size > EDGE ? new Uint8Array(await file.slice(Math.max(EDGE, file.size - EDGE)).arrayBuffer()) : new Uint8Array(0);
    return FileFind.fnv1a(tail, FileFind.fnv1a(head));
  }

  // Same quick key ⇒ clusters of byte-identical files (null when stopped).
  async function clusters(list, stop) {
    const out = [];
    for (const f of list) {
      let home = null;
      for (const c of out) {
        // A file changed / locked since its quick key is just not a duplicate.
        const eq = await DirDiff.equalBlobs(await fileOf(c[0]), await fileOf(f), stop).catch(() => false);
        if (eq === null) return null;
        if (eq) { home = c; break; }
      }
      if (home) home.push(f); else out.push([f]);
    }
    return out.filter(c => c.length > 1);
  }

  async function run(c, sink) {
    const root = await ScanWalk.folder(c.path), st = ScanWalk.stats(), files = [];
    let groups = 0, dupFiles = 0, wasted = 0, checked = 0;
    const tick = ScanWalk.ticker(() => sink.progress(T("Đã duyệt {n} mục · {k} file — Esc để dừng", { n: ScanWalk.num(st.seen), k: ScanWalk.num(files.length) })));
    await ScanWalk.each(ScanWalk.walk(root, { skip: c.skip !== false, stop: sink.stopped, st }), 16, async node => {
      tick();
      if (!node.dir) { const s = await ScanWalk.stat(node); files.push({ node, path: node.path, size: s.size, mod: s.mod }); }
    });
    if (sink.stopped()) return;
    const bySize = FileFind.sizeGroups(files, c.skipEmpty !== false), todo = bySize.reduce((n, g) => n + g.length, 0);
    const step = ScanWalk.ticker(() => sink.progress(T("So nội dung {k} / {n} file cùng cỡ — Esc để dừng", { k: ScanWalk.num(checked), n: ScanWalk.num(todo) })));
    for (const g of bySize) {
      const byKey = new Map();
      for (const f of g) {
        if (sink.stopped()) return;
        try { const k = await quickKey(f); if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(f); }
        catch (e) { st.failed.push(f.path + ": " + e.message); }
        checked++;
        step();
      }
      for (const same of byKey.values()) {
        if (same.length < 2) continue;
        const found = await clusters(same, sink.stopped);
        if (!found) return;
        for (const cl of found) {
          groups++;
          dupFiles += cl.length;
          wasted += cl[0].size * (cl.length - 1);
          const label = T("#{k} · {n} file × {size} · lãng phí {waste}", { k: groups, n: cl.length, size: FolderFmt.size(cl[0].size), waste: FolderFmt.size(cl[0].size * (cl.length - 1)) });
          sink.add(cl.sort((a, b) => (a.path < b.path ? -1 : 1)).map(f => ({ node: f.node, group: label, stat: { size: f.size, mod: f.mod } })));
        }
      }
    }
    if (st.capped || st.cut) sink.incomplete();
    sink.done([groups ? T("Tìm xong: {g} nhóm trùng · {f} file · lãng phí {w}.", { g: groups, f: dupFiles, w: FolderFmt.size(wasted) }) : T("Không có file trùng trong {n} file.", { n: ScanWalk.num(files.length) }), ScanWalk.tail(st)].filter(Boolean).join(" "));
  }

  // "Keep one per group": every other copy becomes selected; the 🗑 / Delete key does the rest.
  function keep(ctl, rule) {
    const groups = new Map();
    for (const it of ctl.items) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push({ path: it.node.path, mod: it.stat?.mod, it }); }
    const picked = [...groups.values()].flatMap(g => FileFind.pick(g, rule)).map(f => f.it);
    ctl.select(picked.map(it => it.key ?? it.node.path));
    const size = picked.reduce((s, it) => s + (it.stat?.size || 0), 0);
    StatusBar.msg(T("Đã chọn {n} bản trùng ({size}) — bấm Delete (🗑) để chuyển vào thùng rác, Ctrl+Z hoàn tác.", { n: picked.length, size: FolderFmt.size(size) }), "good");
  }

  function menu(ctl) {
    const E = TabMenu.entry, c = ctl.criteria || {}, head = Object.assign(document.createElement("div"), { className: "menu-head", textContent: T("Chọn bản trùng") });
    const sep = () => Object.assign(document.createElement("hr"), { className: "menu-sep" });
    const keeps = ctl.items.length ? [E(T("Giữ bản mới nhất mỗi nhóm"), "", () => keep(ctl, "newest")), E(T("Giữ bản cũ nhất mỗi nhóm"), "", () => keep(ctl, "oldest")),
      E(T("Giữ bản có đường dẫn ngắn nhất"), "", () => keep(ctl, "shortest")), sep()] : [];
    return [head, ...keeps, FolderView.check(c.skipEmpty !== false, T("Bỏ file 0 byte"), "", () => ctl.rerun({ ...c, skipEmpty: c.skipEmpty === false })),
      FolderView.check(c.skip !== false, T("Bỏ .git / node_modules"), "", () => ctl.rerun({ ...c, skip: c.skip === false }))];
  }

  return { run, menu };
})();
