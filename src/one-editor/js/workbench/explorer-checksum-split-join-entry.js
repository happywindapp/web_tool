// Explorer "Checksum ▸ SHA-256 / SHA-1 / SHA-512" (file, folder, selection) → the 🔎 tab; "Cắt file…" / "Gộp file…" in writable folders — the work lives in the lazy bundle (FileSum, SplitJoin).
const FileOps = (() => {
  const E = (label, key, run) => TabMenu.entry(label, key, run);
  const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, textContent: text });
  const ALGS = ["SHA-256", "SHA-1", "SHA-512"];
  const PART1 = /\.0*1$/;

  // A submenu opens where its entry was (the entry is gone once it runs).
  function sub(label, list) {
    let at = { left: 0, top: 0 };
    const b = E(label + " ▸", "", () => TabMenu.show(list(), at.left, at.top));
    b.addEventListener("click", () => { const r = b.getBoundingClientRect(); at = { left: r.left + 16, top: r.top }; }, true);
    return b;
  }

  function checksum(nodes, alg) {
    const files = nodes.filter(n => !n.dir), dirs = nodes.filter(n => n.dir);
    const c = { alg, files: files.map(n => n.path), dirs: dirs.map(n => n.path) };
    Object.defineProperty(c, "nodes", { value: nodes });
    ResultsTab.open("checksum", c);
  }
  const split = node => PowerTools.use(() => SplitJoin.split(node));
  const join = nodes => PowerTools.use(() => SplitJoin.join(nodes));

  // nodes: the item(s) the menu is for; [] when nothing fits (cloud links are not read in bulk).
  function entries(nodes) {
    if (!nodes.length || nodes.some(n => n.remote)) return [];
    const out = [sub(T("Checksum"), () => [el("div", "menu-head", T("Checksum")), ...ALGS.map(a => E(a, "", () => checksum(nodes, a)))])];
    const disk = nodes.every(n => ExplorerOps.writableNode(n) && n.parent && !n.dir);
    if (disk && nodes.length === 1) {
      out.push(E(T("Cắt file…"), "", () => split(nodes[0])));
      if (PART1.test(nodes[0].name)) out.push(E(T("Gộp các phần (.001, .002…)…"), "", () => join(nodes)));
    }
    if (disk && nodes.length > 1 && nodes.every(n => n.parent === nodes[0].parent)) out.push(E(T("Gộp {n} file…", { n: nodes.length }), "", () => join(nodes)));
    return out;
  }

  const nameOf = p => String(p || "").split("/").pop();
  ResultsTab.register("checksum", {
    title: c => T("{alg} · {name}", { alg: c?.alg || "SHA-256", name: (c?.files?.length || 0) + (c?.dirs?.length || 0) > 1 ? T("{n} mục", { n: c.files.length + c.dirs.length }) : nameOf(c?.files?.[0] || c?.dirs?.[0]) }),
    chips: [["ok", "✓", "Khớp hash đã dán"], ["bad", "✗", "Khác hash đã dán"]],
    run: (c, sink) => PowerTools.load().then(() => FileSum.run(c, sink)),
    action: { label: "✓ So hash / xuất ▾", title: "Dán hash để so ✓/✗, chép kết quả, xuất file .sha256", menu: ctl => PowerTools.load().then(() => FileSum.menu(ctl)) },
  });

  return { entries };
})();
