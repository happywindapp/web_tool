// Explorer recycle bin over NotesDb (ADR #27): a delete first copies the items into IndexedDB and waits for the transaction to complete — only then does the caller remove them from disk; restore writes them back.
const TrashStore = (() => {
  const listeners = [];
  let cache = null, loading = null, ver = 0;
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  // A listing started before a change must not put the old list back.
  const changed = () => { ver++; cache = null; loading = null; listeners.forEach(f => f()); };
  const tooBig = () => Object.assign(new Error(T("quá lớn cho thùng rác (> {mb} MB hoặc > {files} file)", { mb: TrashQuota.ONE.bytes / TrashQuota.MB, files: TrashQuota.ONE.files })), { big: true });

  // Handle-based nodes → [{ node, entries, size, files }]; the per-delete cap counts all nodes together and stops the walk early.
  async function collect(nodes) {
    const acc = { size: 0, files: 0 };
    const walk = async (h, rel, out) => {
      if (h.kind === "file") {
        const f = await h.getFile();
        acc.size += f.size;
        acc.files++;
        if (!TrashQuota.fits(acc.size, acc.files)) throw tooBig();
        out.push({ rel, dir: false, blob: new Blob([await f.arrayBuffer()], { type: f.type }), mod: f.lastModified });
        return;
      }
      out.push({ rel, dir: true });
      for await (const c of h.values()) await walk(c, rel ? rel + "/" + c.name : c.name, out);
    };
    const items = [];
    for (const node of nodes) {
      const size = acc.size, files = acc.files, entries = [];
      await walk(node.handle, "", entries);
      items.push({ node, entries, size: acc.size - size, files: acc.files - files });
    }
    return items;
  }

  // → { ids, dropped }; throws before anything is deleted when the items do not fit or IndexedDB fails. keep: ids a full bin must not drop.
  async function put(nodes, keep = []) {
    const items = await collect(nodes), at = Date.now();
    const recs = items.map(it => ({ id: newId(), name: it.node.name, dir: it.node.dir, from: it.node.parent.path || "", parent: it.node.parent.handle, at, size: it.size, files: it.files }));
    const drop = TrashQuota.drops((await NotesDb.trashList()).filter(r => !keep.includes(r.id)), items.reduce((s, it) => s + it.size, 0), at);
    await NotesDb.trashWrite(recs.map((r, k) => [r, items[k].entries]), drop);
    changed();
    return { ids: recs.map(r => r.id), dropped: drop.length };
  }

  // Newest first; items older than 30 days are dropped on the first listing.
  function list() {
    if (cache) return Promise.resolve(cache);
    const my = ver;
    loading ??= (async () => {
      let all = await NotesDb.trashList().catch(() => []);
      const old = TrashQuota.drops(all, 0);
      if (old.length) { await NotesDb.trashWrite([], old).catch(() => {}); all = all.filter(r => !old.includes(r.id)); }
      all.sort((a, b) => b.at - a.at);
      if (my === ver) { cache = all; loading = null; }
      return all;
    })();
    return loading;
  }
  // { n, size } for the Explorer, null until the first listing ends (which redraws the listeners).
  function summary() {
    if (!cache) { list().then(l => { if (l.length) listeners.forEach(f => f()); }); return null; }
    return { n: cache.length, size: cache.reduce((s, r) => s + (r.size || 0), 0) };
  }

  async function writeAll(dir, name, entries) {
    for (const e of entries) {
      const parts = [name, ...(e.rel ? e.rel.split("/") : [])];
      let d = dir;
      for (const p of e.dir ? parts : parts.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true });
      if (e.dir) continue;
      const w = await (await d.getFileHandle(parts.at(-1), { create: true })).createWritable();
      await w.write(e.blob);
      await w.close();
    }
  }

  // → { dir, name }. A missing source folder ⇒ pick another; a taken name ⇒ replace (the item there goes to the bin first) or keep both ("a (2).txt").
  async function restore(rec, data = null) {
    data ??= await NotesDb.trashData(rec.id);
    if (!data) throw new Error(T("Không còn dữ liệu của mục này trong thùng rác."));
    let dir = rec.parent;
    try { await LocalFs.writable(dir); await dir.keys().next(); }
    catch (e) {
      if (e.name !== "NotFoundError") throw e;
      if (!confirm(T("Folder gốc “{from}” không còn. Chọn folder khác để khôi phục “{name}”?", { from: rec.from || dir.name, name: rec.name }))) throw ExplorerUndo.shown();
      dir = await showDirectoryPicker({ mode: "readwrite" }).catch(x => { throw x.name === "AbortError" ? ExplorerUndo.shown() : x; });
    }
    let name = rec.name;
    const there = await LocalFs.exists(dir, name);
    if (there) {
      if (confirm(T("“{name}” đã có ở “{from}”. Thay thế? (Huỷ = giữ cả hai)", { name: there, from: rec.from || dir.name }))) {
        const h = await dir.getFileHandle(there).catch(() => dir.getDirectoryHandle(there));
        await put([ExplorerUndo.like(h, dir, rec.from)]);
        await dir.removeEntry(there, { recursive: true });
      } else name = await TrashQuota.freeName(name, rec.dir, n => LocalFs.exists(dir, n));
    }
    await writeAll(dir, name, data);
    await NotesDb.trashWrite([], [rec.id]);
    changed();
    ExplorerDisk.reloadHandle(dir);
    return { dir, name };
  }

  // Data read up front (a "replace" on the way may push old items out of a full bin); every item is tried, failures reported together.
  async function restoreIds(ids) {
    const all = await list(), recs = ids.map(id => all.find(r => r.id === id)).filter(Boolean);
    if (!recs.length) throw new Error(T("Mục này không còn trong thùng rác."));
    const datas = await Promise.all(recs.map(r => NotesDb.trashData(r.id))), bad = [];
    for (const [k, r] of recs.entries()) await restore(r, datas[k]).catch(e => { if (!e.shown) bad.push("“" + r.name + "”: " + e.message); });
    if (bad.length) throw new Error(bad.join(" · "));
  }

  async function purge(ids) {
    await NotesDb.trashWrite([], ids);
    changed();
  }

  // One file ⇒ the file itself; otherwise one ZIP with every item under its own name.
  async function download(recs) {
    const out = [];
    for (const r of recs) {
      const data = await NotesDb.trashData(r.id) || [];
      if (recs.length === 1 && !r.dir && data[0]) { Dom.download(data[0].blob, r.name, data[0].blob.type || "application/octet-stream"); return; }
      for (const e of data) {
        const path = [r.name, e.rel].filter(Boolean).join("/");
        out.push(e.dir ? { name: path + "/" } : { name: path, data: new Uint8Array(await e.blob.arrayBuffer()), date: new Date(e.mod || r.at) });
      }
    }
    Dom.download(await Zip.create(out), recs.length === 1 ? recs[0].name + ".zip" : "recycle-bin.zip", "application/zip");
  }

  return { put, list, summary, restore, restoreIds, purge, download, onChange: fn => listeners.push(fn) };
})();
