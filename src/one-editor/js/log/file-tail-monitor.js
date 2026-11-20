// Follow a file on disk (tail -f, Chrome / Edge file handles): every second read only the new bytes (Blob.slice) and append them; scroll to the end unless the user scrolled up.
const Tail = (() => {
  const PERIOD = 1000, jobs = new Map();
  const on = id => jobs.has(id);
  const decoder = enc => { try { return new TextDecoder(enc || "utf-8"); } catch { return new TextDecoder("utf-8"); } };

  // Through a view showing the tab or one of its clones (onUpdate keeps clones in step), else on the stored state.
  function write(doc, text, replace) {
    const fam = Docs.family(doc).map(d => d.id), g = Views.groups.find(x => fam.includes(x.active)), view = g && g.view, wasDirty = doc.dirty;
    const st = view ? view.state : Docs.ensureState(doc);
    const tr = { changes: replace ? { from: 0, to: st.doc.length, insert: text } : { from: st.doc.length, insert: text }, annotations: CM.state.Transaction.addToHistory.of(false) };
    if (view) {
      const s = view.scrollDOM, atEnd = s.scrollTop + s.clientHeight >= s.scrollHeight - 40;
      view.dispatch(tr);
      if (atEnd) view.dispatch({ effects: CM.view.EditorView.scrollIntoView(view.state.doc.length, { y: "end" }) });
    } else { const t = st.update(tr); doc.state = t.state; CloneSync.forward(doc, t.changes, false); Docs.edited(doc, false); }
    // The new bytes are already on disk: a clean tab stays clean.
    if (!wasDirty && doc.dirty) Docs.update(doc, { dirty: false }, "dirty");
  }

  async function tick(id) {
    const job = jobs.get(id), doc = Docs.get(id);
    if (!job || job.busy) return;
    if (!doc) { stop(id, true); return; }
    job.busy = true;
    try {
      const f = await doc.handle.getFile();
      if (f.size === job.size && f.lastModified === job.mod) return;
      // Shorter than before: the file was truncated or rotated, read it again from the start.
      const replace = f.size < job.size;
      if (replace && doc.dirty) { stop(id, true); StatusBar.msg(T("“{name}” ngắn lại trên đĩa trong khi tab có thay đổi chưa lưu — đã dừng theo dõi để không mất bài.", { name: doc.name }), "warn"); return; }
      if (replace) Object.assign(job, { size: 0, dec: decoder(doc.enc), cr: "" });
      const bytes = new Uint8Array(await f.slice(job.size).arrayBuffer());
      Object.assign(job, { size: f.size, mod: f.lastModified });
      // A CR at the end may be half of a CRLF: keep it for the next read (no phantom empty line).
      let text = job.cr + job.dec.decode(bytes, { stream: true });
      job.cr = text.endsWith("\r") ? "\r" : "";
      if (job.cr) text = text.slice(0, -1);
      if (text || replace) write(doc, text, replace);
      if (replace) StatusBar.msg(T("“{name}” ngắn lại (bị xoá / xoay vòng) — đã đọc lại từ đầu.", { name: doc.name }), "warn");
    } catch (e) {
      stop(id, true);
      StatusBar.msg(T("Ngừng theo dõi “{name}”: {msg}", { name: doc.name, msg: e.message }), "bad");
    } finally { job.busy = false; }
  }

  async function start(doc) {
    doc = Docs.root(doc);
    if (doc.kind !== "file" || !doc.handle || doc.big || doc.hex) { StatusBar.msg(T("Chỉ theo dõi được tab file mở bằng Mở file / Explorer trên Chrome / Edge (không phải file kéo-thả, file lớn hay hex)."), "warn"); return; }
    if (doc.stale) { StatusBar.msg(T("Đọc lại file trước (Ctrl+S hoặc bấm thanh trạng thái), rồi bật theo dõi."), "warn"); return; }
    try {
      const f = await doc.handle.getFile(), job = { size: f.size, mod: f.lastModified, dec: decoder(doc.enc), cr: "", busy: false };
      // A clean tab is brought up to date first, so lines written since it was opened are not skipped.
      if (!doc.dirty) { const now = decoder(doc.enc).decode(await f.arrayBuffer()); if (now !== Docs.text(doc)) write(doc, now, true); }
      jobs.set(doc.id, { ...job, timer: setInterval(() => tick(doc.id), PERIOD) });
      StatusBar.msg(T("🔁 Đang theo dõi “{name}” — dòng mới tự thêm vào cuối; cuộn lên để tạm dừng tự cuộn.", { name: doc.name }), "good");
      StatusBar.refresh();
    } catch (e) { StatusBar.msg(T("Không đọc được file: {msg}", { msg: e.message }), "bad"); }
  }

  function stop(id, quiet = false) {
    const job = jobs.get(id);
    if (!job) return;
    clearInterval(job.timer);
    jobs.delete(id);
    if (!quiet) StatusBar.msg(T("Đã tắt theo dõi file."));
    StatusBar.refresh();
  }

  // After a save (or a reload) the file on disk matches the tab: follow from its new end.
  async function sync(doc) {
    const job = jobs.get(Docs.root(doc).id);
    if (!job) return;
    try { const f = await doc.handle.getFile(); Object.assign(job, { size: f.size, mod: f.lastModified, dec: decoder(doc.enc), cr: "" }); } catch { /* the next tick reports a broken handle */ }
  }

  const toggle = doc => { doc = Docs.root(doc); if (on(doc.id)) stop(doc.id); else start(doc); };
  return { toggle, on, stop, tick, sync };
})();
