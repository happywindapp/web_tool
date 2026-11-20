// Opening local files as tabs: reuse a tab already showing the same handle, > 50 MB → chunked read-only viewer, ask before showing a binary file (read-only).
const FileOpen = (() => {
  const MAX_BYTES = 50 * 1024 * 1024;

  async function sameOpen(handle) {
    for (const d of Docs.list()) if (d.kind === "file" && d.handle && await d.handle.isSameEntry(handle).catch(() => false)) return d;
    return null;
  }

  // show = false: added to view gi without switching to it (replace in files).
  async function open(file, handle, gi, show = true) {
    const dup = handle && await sameOpen(handle);
    if (handle && show) RecentFiles.add(handle);
    if (dup) { if (show) Views.open(dup, Views.where(dup.id) >= 0 ? Views.where(dup.id) : gi); else Views.add(dup, gi); return dup; }
    // Binary (NUL in the first 8 KB): read-only hex of the first 1 MB, so the 50 MB text limit does not apply.
    const head = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
    if (head.includes(0) && !Encoding.detect(head).enc.startsWith("utf-16")) {
      if (!confirm(T("“{name}” là file nhị phân. Mở dạng hex (chỉ đọc)?", { name: file.name }))) return null;
      const doc = Docs.create({ kind: "file", name: file.name, text: await HexDump.ofFile(file), handle, readOnly: true, hex: true, lang: LangDetect.PLAIN });
      Views.open(doc, gi);
      return doc;
    }
    if (file.size > MAX_BYTES) return BigFile.open(file, gi, handle);
    const r = await LocalFs.readText(file);
    const doc = Docs.create({ kind: "file", name: file.name, text: r.text, handle, eol: r.eol, eolMixed: r.eolMixed, eolList: r.eolList, bom: r.bom, enc: r.enc, readOnly: r.readOnly });
    doc.file = file;
    if (r.guessed || r.readOnly) doc.encNote = r;
    if (show) Views.open(doc, gi); else Views.add(doc, gi);
    return doc;
  }

  // items: [{ file, handle|null }]
  async function openMany(items, gi = Views.focused) {
    let n = 0, noted = null;
    for (const { file, handle } of items) {
      try { const d = await open(file, handle, gi); if (d) { n++; if (d.encNote) noted = d; } }
      catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: file.name, msg: e.message }), "bad"); }
    }
    if (!n) return;
    PhoneLayout.show(gi + 1);
    const hint = items.some(i => i.handle) && LocalFs.canDir ? " " + T("Bấm “Mở folder…” để mở folder chứa file.") : "";
    StatusBar.msg(T("Đã mở {n} file ở View {v}.", { n, v: gi + 1 }) + hint, "good");
    if (noted) EncodingActions.announce(noted, noted.encNote);
  }

  // Clean file tabs come back from hot exit with only their handle: read the file again (asking on a click when the browser needs permission).
  async function reload(doc, ask = false) {
    if (!doc.stale || !doc.handle || doc.reloading) return;
    const retry = () => reload(doc, true), tip = T("Bấm để đọc lại file");
    doc.reloading = true;
    try {
      const opts = { mode: "read" };
      let perm = doc.handle.queryPermission ? await doc.handle.queryPermission(opts) : "granted";
      if (perm !== "granted" && ask && doc.handle.requestPermission) perm = await doc.handle.requestPermission(opts);
      if (perm !== "granted") { StatusBar.msg(T("Bấm vào đây để đọc lại “{name}” từ đĩa (trình duyệt cần bạn cho phép).", { name: doc.name }), "warn", retry, tip); return; }
      const file = await doc.handle.getFile();
      if (doc.bigStart != null) { await BigFile.attach(doc, file); return; }
      const r = doc.hex ? { text: await HexDump.ofFile(file), eol: "\n", bom: false, binary: true } : await LocalFs.readText(file, doc.enc && doc.enc !== "utf-8" ? doc.enc : undefined);
      if (!Docs.get(doc.id)) return;
      Object.assign(doc, { stale: false, text: r.text, state: null, eol: r.eol, eolMixed: r.eolMixed, eolList: r.eolList, bom: r.bom, enc: r.enc, readOnly: r.binary || r.readOnly, detected: LangDetect.detect(doc.name, r.text) });
      const gi = Views.where(doc.id);
      if (gi >= 0 && Views.groups[gi].active === doc.id) Views.activate(gi, doc.id, false);
      Docs.update(doc, {});
      StatusBar.msg(T("Đã đọc lại “{name}” từ đĩa.", { name: doc.name }), "good");
    } catch (e) {
      StatusBar.msg(T("Không đọc lại được “{name}”: {msg} — bấm để thử lại.", { name: doc.name, msg: e.message }), "bad", retry, tip);
    } finally { doc.reloading = false; }
  }

  return { open, openMany, reload };
})();
