// What Find in files searches: open tabs + notes (live text), then the Explorer folder read from disk; binaries, files over the limit and .git / node_modules (unless asked) are skipped and counted.
const FindSources = (() => {
  const stats = () => ({ files: 0, binary: 0, size: 0, denied: [], errors: [], cut: 0, capped: false });
  // Clones mirror their original, preview tabs hold rendered output, hex tabs are binary, a > 50 MB tab only holds one chunk (its file is over the scan limit).
  const docs = () => Docs.list().filter(d => d.kind !== "clone" && !d.hex && !d.big && !PreviewPane.isPreview(d));
  const failed = (st, name, e) => st.errors.push(name + ": " + (e && e.message || e));

  async function textOf(file, st, enc) {
    if (FindCore.binaryName(file.name)) { st.binary++; return null; }
    if (file.size > FindCore.LIMITS.fileBytes) { st.size++; return null; }
    const r = await LocalFs.readText(file, enc);
    if (r.binary) { st.binary++; return null; }
    return r.text;
  }

  // A clean file tab restored by hot exit only has its handle: read from disk only if the browser still allows it (no prompt mid-scan).
  async function staleText(doc, st) {
    const perm = doc.handle.queryPermission ? await doc.handle.queryPermission({ mode: "read" }) : "granted";
    if (perm !== "granted") { st.denied.push(doc.name); return null; }
    return textOf(await doc.handle.getFile(), st, doc.enc && doc.enc !== "utf-8" ? doc.enc : undefined);
  }

  // Already open as a tab: same handle, or (folders read without handles) the same File / name + size + date.
  async function isOpen(node, file, open) {
    for (const d of open) {
      if (node.handle && d.handle && d.handle.name === node.name && await d.handle.isSameEntry(node.handle).catch(() => false)) return true;
      const f = d.file;
      if (!node.handle && f && (f === file || (f.name === file.name && f.size === file.size && f.lastModified === file.lastModified))) return true;
    }
    return false;
  }

  async function* walk(node, heavy, st) {
    let kids;
    try { kids = await node.list(); } catch (e) { failed(st, node.path, e); return; }
    if (kids.length >= LocalFs.MAX_ENTRIES) st.cut++;
    for (const k of kids) {
      if (!k.dir) yield k;
      else if (!FindCore.skipDir(k.name, heavy)) yield* walk(k, heavy, st);
    }
  }

  // → async iterable of { key, name, path, icon, doc | node, text }.
  async function* items({ folder, heavy }, st) {
    const list = docs(), open = list.filter(d => d.kind === "file" && (d.handle || d.file));
    for (const doc of list) {
      let text = Docs.text(doc);
      if (doc.stale && doc.handle) { try { text = await staleText(doc, st); } catch (e) { failed(st, doc.name, e); text = null; } }
      if (text == null) continue;
      st.files++;
      yield { key: doc.id, name: doc.name, path: "", icon: TabStrip.ICON[doc.kind], doc, text };
    }
    const root = folder && Explorer.root();
    if (!root) return;
    let walked = 0;
    for await (const node of walk(root, heavy, st)) {
      if (++walked > FindCore.LIMITS.files) { st.capped = true; return; }
      if (FindCore.binaryName(node.name)) { st.binary++; continue; }
      let text = null;
      try {
        const { file } = await node.read();
        if (await isOpen(node, file, open)) continue;
        text = await textOf(file, st);
      } catch (e) { failed(st, node.path, e); }
      if (text == null) continue;
      st.files++;
      yield { key: "fs:" + node.path, name: node.name, path: node.path, icon: "📄", node, text };
    }
  }

  return { items, stats };
})();
