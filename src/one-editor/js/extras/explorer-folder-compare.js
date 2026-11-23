// Folder compare (So sánh với panel kia / So sánh với “A” / 2 folders selected): both trees walked pair by pair, names matched in any case — ⬅ left only · ➡ right only · ≠ different (size, else bytes in 4 MB blocks; dates are not trusted) · = same; a folder on one side is one row.
const DirCompare = (() => {
  const LABEL = { left: "Chỉ có ở trái", right: "Chỉ có ở phải", diff: "Khác nhau", same: "Giống nhau" };

  // Two files → "same" / "diff" plus their stats; null when stopped.
  async function judge(a, b, stop) {
    const [fa, fb] = (await Promise.all([a.read(), b.read()])).map(r => r.file), sa = { size: fa.size, mod: fa.lastModified }, sb = { size: fb.size, mod: fb.lastModified };
    if (DirDiff.bySize(fa.size, fb.size) === "diff") return { st: "diff", sa, sb };
    const eq = await DirDiff.equalBlobs(fa, fb, stop);
    return eq === null ? null : { st: eq ? "same" : "diff", sa, sb };
  }

  // A row for the 🔎 tab: node = the left entry when there is one; pa / pb = the folders the row lives in on each side (sync target).
  function item(r, rel, pa, pb, sa = null, sb = null) {
    const node = r.a || r.b, stat = r.a ? sa : sb, side = (s, n) => (n.dir ? T("folder") : s?.size != null ? FolderFmt.size(s.size) : "");
    const title = [T(LABEL[r.st]), r.a ? T("trái: {v}", { v: side(sa, r.a) }) : "", r.b ? T("phải: {v}", { v: side(sb, r.b) }) : ""].filter(Boolean).join(" · ");
    return { node, key: (rel ? rel + "/" : "") + node.name, dir: rel, st: r.st, status: DirDiff.SYM[r.st], statusTitle: title, a: r.a, b: r.b, pa, pb, ...(stat ? { stat } : {}) };
  }

  async function run(c, sink) {
    const [A, B] = [await ScanWalk.folder(c.a), await ScanWalk.folder(c.b)], skip = c.skip !== false, n = { left: 0, right: 0, diff: 0, same: 0 };
    const queue = [[A, B, ""]], light = kids => kids.filter(k => !(k.dir && ScanWalk.heavy(k.name, skip)));
    let seen = 0, capped = false, cut = 0;
    const tick = ScanWalk.ticker(() => sink.progress(T("Đã so {n} mục: ⬅ {l} · ➡ {r} · ≠ {d} · = {s} — Esc để dừng", { n: ScanWalk.num(seen), l: n.left, r: n.right, d: n.diff, s: n.same })));
    for (let i = 0; i < queue.length; i++) {
      if (sink.stopped()) return;
      const [a, b, rel] = queue[i];
      const [ka, kb] = await Promise.all([Explorer.loadKids(a), Explorer.loadKids(b)]);
      const [la, lb] = [light(ka), light(kb)], m = DirDiff.match(la, lb), out = [];
      seen += la.length + lb.length;
      if (ka.length >= LocalFs.MAX_ENTRIES || kb.length >= LocalFs.MAX_ENTRIES) { cut++; sink.incomplete(); }
      if (seen > ScanWalk.MAX) { capped = true; break; }
      for (const [x, y] of m.both) queue.push([x, y, rel ? rel + "/" + x.name : x.name]);
      await ScanWalk.each(m.rows, 4, async r => {
        let sa = null, sb = null;
        if (r.st === "check") {
          // Unreadable ⇒ shown as ≠ and the result is partial (no sync on it).
          const j = await judge(r.a, r.b, sink.stopped).catch(() => { sink.incomplete(); return { st: "diff" }; });
          if (!j) return;
          ({ st: r.st, sa = null, sb = null } = j);
        } else if (!(r.a || r.b).dir) [sa, sb] = await Promise.all([r.a && !r.a.dir ? ScanWalk.stat(r.a) : null, r.b && !r.b.dir ? ScanWalk.stat(r.b) : null]);
        n[r.st]++;
        out.push(item(r, rel, a, b, sa, sb));
        tick();
      });
      if (sink.stopped()) return;
      sink.add(out);
    }
    if (capped) sink.incomplete();
    sink.done([T("So sánh xong: ⬅ {l} chỉ trái · ➡ {r} chỉ phải · ≠ {d} khác · = {s} giống.", { l: n.left, r: n.right, d: n.diff, s: n.same }), capped ? T("Dừng ở {max} mục — đồng bộ cần so sánh đủ.", { max: ScanWalk.num(ScanWalk.MAX) }) : "",
      cut ? T("{n} folder có hơn {max} mục — chỉ xét {max} mục đầu.", { n: cut, max: ScanWalk.num(LocalFs.MAX_ENTRIES) }) : ""].filter(Boolean).join(" "));
  }

  return { run };
})();
