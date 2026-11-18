// Opening local files as tabs: reuse a tab already showing the same handle, refuse > 50 MB, ask before showing a binary file (read-only).
const FileOpen = (() => {
  const MAX_BYTES = 50 * 1024 * 1024;

  async function sameOpen(handle) {
    for (const d of Docs.list()) if (d.kind === "file" && d.handle && await d.handle.isSameEntry(handle).catch(() => false)) return d;
    return null;
  }

  async function open(file, handle, gi) {
    const dup = handle && await sameOpen(handle);
    if (dup) { Views.open(dup, Views.where(dup.id) >= 0 ? Views.where(dup.id) : gi); return dup; }
    if (file.size > MAX_BYTES) { StatusBar.msg(T("“{name}” lớn hơn 50 MB — bản này chưa mở được.", { name: file.name }), "bad"); return null; }
    const r = await LocalFs.readText(file);
    if (r.binary && !confirm(T("“{name}” có vẻ là file nhị phân. Vẫn mở dạng văn bản chỉ đọc?", { name: file.name }))) return null;
    if (!r.binary && r.notUtf8 && !confirm(T("“{name}” không phải UTF-8 (bản này chưa hỗ trợ bảng mã khác). Mở chỉ đọc để không làm hỏng ký tự khi lưu?", { name: file.name }))) return null;
    const doc = Docs.create({ kind: "file", name: file.name, text: r.text, handle, eol: r.eol, bom: r.bom, readOnly: r.binary || r.notUtf8 });
    Views.open(doc, gi);
    return doc;
  }

  // items: [{ file, handle|null }]
  async function openMany(items, gi = Views.focused) {
    let n = 0;
    for (const { file, handle } of items) {
      try { if (await open(file, handle, gi)) n++; }
      catch (e) { StatusBar.msg(T("Không mở được “{name}”: {msg}", { name: file.name, msg: e.message }), "bad"); }
    }
    if (!n) return;
    PhoneLayout.show(gi + 1);
    const hint = items.some(i => i.handle) && LocalFs.canDir ? " " + T("Bấm “Mở folder…” để mở folder chứa file.") : "";
    StatusBar.msg(T("Đã mở {n} file ở View {v}.", { n, v: gi + 1 }) + hint, "good");
  }

  return { open, openMany };
})();
