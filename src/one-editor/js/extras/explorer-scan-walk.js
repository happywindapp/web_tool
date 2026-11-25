// Folder scans of the 🔎 tab (file search, duplicates): tree nodes read folder by folder (Explorer.loadKids, breadth first), .git / node_modules skipped on request, ≤ 20,000 items visited, a yield to the page every ~12 ms, stop().
const ScanWalk = (() => {
  const MAX = 20000;
  let last = 0;
  const breathe = async () => { if (Date.now() - last > 12) { await new Promise(r => setTimeout(r, 0)); last = Date.now(); } };
  const stats = () => ({ seen: 0, capped: false, cut: 0, failed: [] });
  const heavy = (name, skip) => skip && FindCore.skipDir(name, false);

  // root → async iterable of child nodes below it (folders too); a folder that cannot be read is counted in st.failed.
  async function* walk(root, { sub = true, skip = true, stop = () => false, st }) {
    const queue = [root];
    for (let i = 0; i < queue.length; i++) {
      let kids;
      try { kids = await Explorer.loadKids(queue[i]); } catch (e) { st.failed.push(queue[i].path + ": " + e.message); continue; }
      // A listing stops at LocalFs.MAX_ENTRIES: the result is partial.
      if (kids.length >= LocalFs.MAX_ENTRIES) st.cut++;
      for (const k of kids) {
        if (stop()) return;
        if (k.dir && heavy(k.name, skip)) continue;
        if (++st.seen > MAX) { st.capped = true; return; }
        yield k;
        if (k.dir && sub) queue.push(k);
        await breathe();
      }
    }
  }

  async function each(items, n, fn) {
    let batch = [];
    for await (const x of items) {
      batch.push(fn(x));
      if (batch.length >= n) { await Promise.all(batch); batch = []; }
    }
    await Promise.all(batch);
  }

  const stat = n => FolderFmt.stat(n).catch(() => ({ size: null, mod: null }));
  function ticker(fn) {
    let at = 0;
    return (force = false) => { if (force || Date.now() - at > 300) { at = Date.now(); fn(); } };
  }
  // Path of the 🔎 criteria → the folder node, exactly (never a parent standing in for a missing folder).
  async function folder(path) {
    const n = await FolderPaths.resolve(path);
    if (!n || n.path !== path) throw new Error(T("Không thấy folder “{path}” trong Explorer — mở lại folder rồi bấm ↻.", { path }));
    return n;
  }
  const num = I18n.num;
  function tail(st) {
    return [st.capped ? T("Dừng ở {max} mục.", { max: num(MAX) }) : "", st.cut ? T("{n} folder có hơn {max} mục — chỉ xét {max} mục đầu.", { n: st.cut, max: num(LocalFs.MAX_ENTRIES) }) : "",
      st.failed.length ? T("{n} mục không đọc được.", { n: st.failed.length }) : ""].filter(Boolean).join(" ");
  }

  return { MAX, walk, each, stat, stats, ticker, folder, num, tail, heavy };
})();
